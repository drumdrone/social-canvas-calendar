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
  handler: async (ctx, args) => {
    // 1. Persist the comment + mentions + notifications.
    const { commentId, notificationIds }: {
      commentId: string;
      notificationIds: string[];
    } = await ctx.runMutation(internal.comments.insertCommentWithMentions, args);

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

// -------- Email dispatch (Resend, via the existing edge function) ----------

// The edge function URL + anon key are configured on the Convex deployment
// (env vars). We call it as a plain HTTP POST — the function is stateless and
// takes the mention payload directly.
async function sendMentionEmail(payload: {
  mentionedAuthorEmail: string;
  mentionedAuthorName?: string;
  postTitle?: string;
  commentText: string;
  commenterName?: string;
  postId?: string;
}) {
  const url = process.env.SEND_MENTION_EMAIL_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url) {
    console.warn("SEND_MENTION_EMAIL_URL not set — skipping email");
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(anonKey ? { Authorization: `Bearer ${anonKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Edge function ${res.status}: ${await res.text()}`);
  }
}
