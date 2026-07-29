import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Comments + mentions + notifications, together with the outbound email path
// via the existing send-mention-email Supabase Edge Function.
//
// The client calls `addComment` (a Convex action) with the post the comment
// belongs to, the author, the text and the list of mentioned users. The
// action opens a mutation to persist everything atomically, then fires the
// email for every fresh mention. Keeping it as one entry point means the
// client doesn't have to orchestrate three round-trips.

// -------- Reads --------------------------------------------------------------

// Comments for a post, newest at the bottom. Each comment is returned with
// its author (user_profiles doc) inlined so the UI doesn't need a second read.
export const listForPost = query({
  args: { postId: v.id("social_media_posts") },
  handler: async (ctx, { postId }) => {
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    rows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    return Promise.all(
      rows.map(async (c) => ({
        ...c,
        author: await ctx.db.get(c.authorId),
      })),
    );
  },
});

// Same lookup as listForPost, but by the original Supabase UUID kept in
// social_media_posts.legacyId so URL-carried ids still work.
export const listForPostByLegacyId = query({
  args: { legacyPostId: v.string() },
  handler: async (ctx, { legacyPostId }) => {
    const post = await ctx.db
      .query("social_media_posts")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", legacyPostId))
      .first();
    if (!post) return [];
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .collect();
    rows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    return Promise.all(
      rows.map(async (c) => ({ ...c, author: await ctx.db.get(c.authorId) })),
    );
  },
});

// -------- Internal write path (called by the action below) -------------------

export const insertCommentWithMentions = internalMutation({
  args: {
    postId: v.id("social_media_posts"),
    authorId: v.id("user_profiles"),
    content: v.string(),
    mentionedUserIds: v.array(v.id("user_profiles")),
  },
  handler: async (ctx, { postId, authorId, content, mentionedUserIds }) => {
    const now = Date.now();
    const commentId = await ctx.db.insert("comments", {
      postId,
      authorId,
      content,
      createdAt: now,
      updatedAt: now,
    });
    // Create a mention row + a notification per mentioned user. Skip mentions
    // of the author themselves (nobody wants a self-notification).
    const notificationIds: any[] = [];
    for (const uid of mentionedUserIds) {
      if (uid === authorId) continue;
      await ctx.db.insert("comment_mentions", {
        commentId,
        mentionedUserId: uid,
        createdAt: now,
      });
      const notifId = await ctx.db.insert("notifications", {
        userId: uid,
        commentId,
        postId,
        isRead: false,
        emailSent: false,
        createdAt: now,
      });
      notificationIds.push(notifId);
    }
    return { commentId, notificationIds };
  },
});

// -------- Public action: add a comment + notify by email ---------------------

export const addComment = action({
  args: {
    postId: v.id("social_media_posts"),
    authorId: v.id("user_profiles"),
    content: v.string(),
    mentionedUserIds: v.array(v.id("user_profiles")),
  },
  // Explicit return type breaks the circular type dependency that Convex's
  // codegen creates when an action calls its own module's internal mutation.
  handler: async (ctx, args): Promise<{ commentId: string }> => {
    // 1. Persist the comment + mentions + notifications.
    const result = (await ctx.runMutation(
      internal.comments.insertCommentWithMentions,
      args,
    )) as { commentId: string; notificationIds: string[] };
    const { commentId, notificationIds } = result;

    // 2. Best-effort email each mentioned user via the existing Resend edge
    //    function. The edge function is stateless (accepts recipient + text),
    //    so we look up post + author + recipients here and send the payload.
    //    Sends run in parallel; a single failure doesn't tank the whole call.
    if (notificationIds.length > 0) {
      const post: any = await ctx.runQuery(internal.comments.getPostForEmail, {
        postId: args.postId,
      });
      const author: any = await ctx.runQuery(internal.comments.getUser, {
        userId: args.authorId,
      });
      const mentionedUsers: any[] = await Promise.all(
        args.mentionedUserIds
          .filter((u) => u !== args.authorId)
          .map((u) => ctx.runQuery(internal.comments.getUser, { userId: u })),
      );
      await Promise.all(
        mentionedUsers.map(async (u) => {
          if (!u?.email || u.notificationEnabled === false) return;
          try {
            await sendMentionEmail({
              mentionedAuthorEmail: u.email,
              mentionedAuthorName: u.fullName,
              postTitle: post?.title ?? "a post",
              commentText: args.content,
              commenterName: author?.fullName ?? "Someone",
              postId: post?.legacyId ?? args.postId,
            });
            await ctx.runMutation(internal.comments.markEmailSent, {
              notificationId: notificationIds[mentionedUsers.indexOf(u)] as any,
            });
          } catch (err) {
            console.error("send-mention-email failed:", err);
          }
        }),
      );
    }

    return { commentId };
  },
});

// Small internal helpers used only by the action above.

export const getPostForEmail = internalQuery({
  args: { postId: v.id("social_media_posts") },
  handler: (ctx, { postId }) => ctx.db.get(postId),
});

export const getUser = internalQuery({
  args: { userId: v.id("user_profiles") },
  handler: (ctx, { userId }) => ctx.db.get(userId),
});

export const markEmailSent = internalMutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.patch(notificationId, { emailSent: true });
  },
});

// -------- Email dispatch (Resend, direct HTTP — no Supabase dependency) ----

// Convex deployment env vars (set with `npx convex env set NAME value`):
//   RESEND_API_KEY = re_...                  (required to send)
//   RESEND_FROM    = "Name <hello@domain>"   (optional; falls back to onboarding@resend.dev)
//   APP_URL        = https://your.app        (optional; for "View comment" link)
// If RESEND_API_KEY is missing the comment still saves — the email is just skipped.

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendMentionEmail(payload: {
  mentionedAuthorEmail: string;
  mentionedAuthorName?: string;
  postTitle?: string;
  commentText: string;
  commenterName?: string;
  postId?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }
  const from =
    process.env.RESEND_FROM || "Social Canvas Calendar <onboarding@resend.dev>";
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");

  const recipient = payload.mentionedAuthorName?.trim() || "Team Member";
  const author = payload.commenterName?.trim() || "Someone";
  const title = payload.postTitle?.trim() || "a post";
  const postUrl = appUrl ? `${appUrl}/post/${encodeURIComponent(payload.postId || "")}` : "";
  const settingsUrl = appUrl ? `${appUrl}/settings` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>You were mentioned in a comment</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">📢 You were mentioned!</h1>
  </div>
  <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:16px;margin-bottom:20px;">Hi <strong>${escapeHtml(recipient)}</strong>,</p>
    <p style="font-size:16px;margin-bottom:25px;">
      <strong>${escapeHtml(author)}</strong> mentioned you in a comment on
      <strong>"${escapeHtml(title)}"</strong>:
    </p>
    <div style="background:#f9fafb;border-left:4px solid #667eea;padding:20px;margin:25px 0;border-radius:4px;">
      <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(payload.commentText)}</p>
    </div>
    ${postUrl ? `<div style="text-align:center;margin:30px 0;"><a href="${postUrl}" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:14px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:16px;">View comment</a></div>` : ""}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
    <p style="font-size:13px;color:#6b7280;margin:0;">
      You're receiving this because you were mentioned in a comment.
      ${settingsUrl ? `To stop, go to <a href="${settingsUrl}" style="color:#667eea;">Settings</a> and disable notifications.` : ""}
    </p>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [payload.mentionedAuthorEmail],
      subject: `${author} mentioned you in "${title}"`,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}
