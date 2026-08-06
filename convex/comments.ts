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

// Resolves a post either by its real Convex _id or by the legacy Supabase
// UUID kept in `legacyId`. The UI used to guess which kind of string it had
// with a client-side regex (`/^k[a-z0-9]{10,}$/`) — that's not a reliable
// way to detect a Convex id (ids don't follow a fixed prefix), so posts
// created after the Supabase migration (whose "id" is a raw Convex _id that
// happens not to match the regex) were silently treated as legacy UUIDs,
// found no matching `legacyId`, and came back empty — comments looked like
// they'd vanished or never attached to the right post. Resolving
// authoritatively here (normalizeId first, legacyId index as fallback)
// removes the guesswork entirely.
async function resolvePost(ctx: any, postIdOrLegacyId: string) {
  const normalizedId = ctx.db.normalizeId("social_media_posts", postIdOrLegacyId);
  if (normalizedId) {
    const doc = await ctx.db.get(normalizedId);
    if (doc) return doc;
  }
  return ctx.db
    .query("social_media_posts")
    .withIndex("by_legacyId", (q: any) => q.eq("legacyId", postIdOrLegacyId))
    .first();
}

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

// Same lookup as listForPost, but accepts either a real Convex _id or the
// legacy Supabase UUID — see resolvePost above.
export const listForPostByLegacyId = query({
  args: { legacyPostId: v.string() },
  handler: async (ctx, { legacyPostId }) => {
    const post = await resolvePost(ctx, legacyPostId);
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

// Delete a comment along with its mentions and notifications. No
// author/permission check — anyone using the app can delete any comment,
// matching the rest of the app (no per-user permissions anywhere else either).
export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, { id }) => {
    const mentions = await ctx.db
      .query("comment_mentions")
      .withIndex("by_comment", (q) => q.eq("commentId", id))
      .collect();
    await Promise.all(mentions.map((m) => ctx.db.delete(m._id)));

    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("commentId"), id))
      .collect();
    await Promise.all(notifications.map((n) => ctx.db.delete(n._id)));

    await ctx.db.delete(id);
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
    // Either the real Convex _id or the legacy Supabase UUID — resolved
    // server-side below (see resolvePost).
    postId: v.string(),
    authorId: v.id("user_profiles"),
    content: v.string(),
    mentionedUserIds: v.array(v.id("user_profiles")),
  },
  // Explicit return type breaks the circular type dependency that Convex's
  // codegen creates when an action calls its own module's internal mutation.
  // emailResults is surfaced to the client so a mailing failure (bad
  // BREVO_API_KEY, unverified sender domain, Brevo rejecting the request,
  // etc.) shows up as a toast instead of only a line in the Convex function
  // logs nobody's looking at.
  handler: async (
    ctx,
    args,
  ): Promise<{
    commentId: string;
    emailResults: { attempted: number; sent: number; errors: string[] };
  }> => {
    const post: any = await ctx.runQuery(internal.comments.resolvePostQuery, {
      postIdOrLegacyId: args.postId,
    });
    if (!post) throw new Error(`Post ${args.postId} not found`);

    // 1. Persist the comment + mentions + notifications.
    const result = (await ctx.runMutation(internal.comments.insertCommentWithMentions, {
      postId: post._id,
      authorId: args.authorId,
      content: args.content,
      mentionedUserIds: args.mentionedUserIds,
    })) as { commentId: string; notificationIds: string[] };
    const { commentId, notificationIds } = result;

    const emailResults = { attempted: 0, sent: 0, errors: [] as string[] };

    // 2. Best-effort email each mentioned user via Brevo. None of these
    //    lookups are allowed to throw past this point — the comment is
    //    already saved, so a failure here should degrade to "no email" for
    //    the affected recipient(s), never take down the whole action (that
    //    previously happened with an unguarded lookup — see git history —
    //    and silently ate every notification for the comment).
    if (notificationIds.length > 0) {
      let author: any = null;
      try {
        author = await ctx.runQuery(internal.comments.getUser, { userId: args.authorId });
      } catch (err) {
        console.error("Failed to load comment author for email:", err);
      }
      // Prior comments give the mentioned person context for the thread —
      // exclude the one we just inserted since it's rendered separately,
      // highlighted, above the history. Best-effort: if this lookup fails,
      // still send the mention email without history rather than losing the
      // notification entirely (the comment itself is already saved by now).
      let priorComments: any[] = [];
      try {
        const rows: any[] = await ctx.runQuery(internal.comments.getCommentsForEmail, {
          postId: post._id,
        });
        priorComments = rows.filter((c: any) => c._id !== commentId);
      } catch (err) {
        console.error("Failed to load comment history for email:", err);
      }
      // Mirror insertCommentWithMentions' self-mention skip so this list
      // lines up 1:1 with notificationIds by index (a user mentioned twice
      // would otherwise collide under a lookup-by-value like indexOf).
      const mentionedIds = args.mentionedUserIds.filter((u) => u !== args.authorId);
      let mentionedUsers: any[] = [];
      try {
        mentionedUsers = await Promise.all(
          mentionedIds.map((u) => ctx.runQuery(internal.comments.getUser, { userId: u })),
        );
      } catch (err) {
        console.error("Failed to load mentioned users for email:", err);
        emailResults.errors.push(
          `Nepodařilo se načíst zmíněné uživatele: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      await Promise.all(
        mentionedUsers.map(async (u, i) => {
          if (!u?.email || u.notificationEnabled === false) return;
          emailResults.attempted++;
          try {
            await sendMentionEmail({
              mentionedAuthorEmail: u.email,
              mentionedAuthorName: u.fullName,
              postTitle: post?.title ?? "a post",
              commentText: args.content,
              commenterName: author?.fullName ?? "Someone",
              postId: post?.legacyId ?? post._id,
              conversation: priorComments.map((c) => ({
                authorName: c.author?.fullName ?? "Someone",
                content: c.content,
                createdAt: c.createdAt ?? 0,
              })),
            });
            await ctx.runMutation(internal.comments.markEmailSent, {
              notificationId: notificationIds[i] as any,
            });
            emailResults.sent++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("send-mention-email failed:", err);
            emailResults.errors.push(`${u.fullName ?? u.email}: ${msg}`);
          }
        }),
      );
    }

    return { commentId, emailResults };
  },
});

// Small internal helpers used only by the action above.

export const resolvePostQuery = internalQuery({
  args: { postIdOrLegacyId: v.string() },
  handler: (ctx, { postIdOrLegacyId }) => resolvePost(ctx, postIdOrLegacyId),
});

export const getUser = internalQuery({
  args: { userId: v.id("user_profiles") },
  handler: (ctx, { userId }) => ctx.db.get(userId),
});

// Full comment thread for a post, oldest first, author inlined — used to
// render the "whole conversation" section of the mention email.
export const getCommentsForEmail = internalQuery({
  args: { postId: v.id("social_media_posts") },
  handler: async (ctx, { postId }) => {
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    rows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    return Promise.all(
      rows.map(async (c) => ({ ...c, author: await ctx.db.get(c.authorId) })),
    );
  },
});

export const markEmailSent = internalMutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.patch(notificationId, { emailSent: true });
  },
});

// -------- Email dispatch (Brevo, direct HTTP — no Supabase dependency) -----

// Convex deployment env vars (set with `npx convex env set NAME value`):
//   BREVO_API_KEY  = xkeysib-...             (required to send)
//   MAIL_FROM      = "Name <hello@domain>"   (required; must be on a
//                                             Brevo-authenticated domain)
//   APP_URL        = https://your.app        (optional; for "View comment" link)
// The comment itself always saves even if mailing fails entirely (missing
// env vars, Brevo rejecting the request, etc.) — addComment's caller sees
// that failure via the returned emailResults, not a broken comment save.

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Parses "Name <email@domain>" into { name, email }. Also accepts a bare
// email; falls back to a default name.
function parseFromAddress(input: string): { name: string; email: string } {
  const match = input.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || "Notifications", email: match[2] };
  return { name: "Notifications", email: input.trim() };
}

function formatCommentDate(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function sendMentionEmail(payload: {
  mentionedAuthorEmail: string;
  mentionedAuthorName?: string;
  postTitle?: string;
  commentText: string;
  commenterName?: string;
  postId?: string;
  conversation?: Array<{ authorName: string; content: string; createdAt: number }>;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // Throw (rather than silently returning) so the caller's per-recipient
    // try/catch records this as a failed send instead of quietly marking
    // the notification emailSent — a comment could otherwise look "done"
    // while the person mentioned never got anything.
    throw new Error("BREVO_API_KEY not set on the Convex deployment");
  }
  const fromStr = process.env.MAIL_FROM;
  if (!fromStr) {
    throw new Error("MAIL_FROM not set on the Convex deployment");
  }
  const from = parseFromAddress(fromStr);
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");

  const recipient = payload.mentionedAuthorName?.trim() || "Team Member";
  const author = payload.commenterName?.trim() || "Someone";
  const title = payload.postTitle?.trim() || "a post";
  // /calendar?edit=<id> opens the post straight in the editing sidebar (same
  // deep link Quick Calendar uses) instead of the standalone read-only
  // /post/:id page — accepts either the legacy UUID or a Convex id.
  const postUrl = appUrl
    ? `${appUrl}/calendar?edit=${encodeURIComponent(payload.postId || "")}`
    : "";
  const settingsUrl = appUrl ? `${appUrl}/settings` : "";

  const conversationHtml =
    payload.conversation && payload.conversation.length > 0
      ? `
    <p style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.03em;margin:30px 0 12px;">Celá konverzace</p>
    <div style="border-top:1px solid #f3f4f6;">
      ${payload.conversation
        .map(
          (c) => `
      <div style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;"><strong style="color:#374151;">${escapeHtml(c.authorName)}</strong> · ${formatCommentDate(c.createdAt)}</p>
        <p style="margin:0;font-size:14px;color:#4b5563;white-space:pre-wrap;">${escapeHtml(c.content)}</p>
      </div>`,
        )
        .join("")}
    </div>`
      : "";

  const html = `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><title>Byli jste zmíněni v komentáři</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">📢 Byli jste zmíněni!</h1>
  </div>
  <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:16px;margin-bottom:20px;">Ahoj <strong>${escapeHtml(recipient)}</strong>,</p>
    <p style="font-size:16px;margin-bottom:15px;">
      <strong>${escapeHtml(author)}</strong> vás zmínil/a v komentáři u příspěvku
      <strong>„${escapeHtml(title)}"</strong>:
    </p>
    <div>
      <span style="background:#667eea;color:#fff;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 10px;border-radius:999px;">Nový komentář</span>
    </div>
    <div style="background:#f9fafb;border-left:4px solid #667eea;padding:20px;margin:10px 0 25px;border-radius:4px;">
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;"><strong>${escapeHtml(author)}</strong></p>
      <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(payload.commentText)}</p>
    </div>
    ${postUrl ? `<div style="text-align:center;margin:30px 0;"><a href="${postUrl}" style="background-color:#667eea;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:16px;">Otevřít příspěvek</a></div>` : ""}
    ${conversationHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
    <p style="font-size:13px;color:#6b7280;margin:0;">
      Tento e-mail vám přišel, protože vás někdo zmínil v komentáři.
      ${settingsUrl ? `Notifikace můžete vypnout v <a href="${settingsUrl}" style="color:#667eea;">nastavení</a>.` : ""}
    </p>
  </div>
</body>
</html>`;

  // Brevo Transactional Email API
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: from,
      to: [{ email: payload.mentionedAuthorEmail, name: recipient }],
      subject: `${author} vás zmínil/a v „${title}"`,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  }
}
