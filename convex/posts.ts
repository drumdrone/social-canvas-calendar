import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// NOTE: `./_generated/*` is produced by `npx convex dev` / `npx convex codegen`.
// Until you run it once, your editor will flag these imports as missing — that
// is expected for a fresh scaffold.

const postFields = {
  title: v.string(),
  content: v.optional(v.union(v.string(), v.null())),
  platform: v.string(),
  category: v.string(),
  status: v.string(),
  scheduledDate: v.string(),
  author: v.optional(v.union(v.string(), v.null())),
  pillar: v.optional(v.union(v.string(), v.null())),
  productLine: v.optional(v.union(v.string(), v.null())),
  comments: v.optional(v.union(v.string(), v.null())),
  imageUrl: v.optional(v.union(v.string(), v.null())),
  imageStorageId: v.optional(v.id("_storage")),
  recurringActionId: v.optional(v.union(v.id("recurringActions"), v.null())),
};

// Resolve a Convex storage id to a served URL, falling back to a stored URL.
async function withImageUrl(ctx: any, post: any) {
  if (post.imageStorageId) {
    const url = await ctx.storage.getUrl(post.imageStorageId);
    return { ...post, imageUrl: url ?? post.imageUrl ?? null };
  }
  return post;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("social_media_posts").collect();
    return Promise.all(posts.map((p) => withImageUrl(ctx, p)));
  },
});

export const listByDateRange = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    const posts = await ctx.db
      .query("social_media_posts")
      .withIndex("by_scheduledDate", (q) =>
        q.gte("scheduledDate", from).lte("scheduledDate", to),
      )
      .collect();
    return Promise.all(posts.map((p) => withImageUrl(ctx, p)));
  },
});

export const get = query({
  args: { id: v.id("social_media_posts") },
  handler: async (ctx, { id }) => {
    const post = await ctx.db.get(id);
    return post ? withImageUrl(ctx, post) : null;
  },
});

export const create = mutation({
  args: postFields,
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("social_media_posts", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { id: v.id("social_media_posts"), patch: v.object(postFields) },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("social_media_posts") },
  handler: async (ctx, { id }) => {
    const post = await ctx.db.get(id);
    if (post?.imageStorageId) {
      await ctx.storage.delete(post.imageStorageId as Id<"_storage">);
    }
    await ctx.db.delete(id);
  },
});
