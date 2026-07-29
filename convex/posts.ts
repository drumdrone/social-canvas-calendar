import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// NOTE: `./_generated/*` is produced by `npx convex dev` / `npx convex codegen`.
// Until you run it once, your editor will flag these imports as missing — that
// is expected for a fresh scaffold.

// Fields accepted on create/update. Everything is optional so partial patches
// from the UI just work; the UI enforces which fields are actually required.
const postFields = {
  title: v.optional(v.union(v.string(), v.null())),
  content: v.optional(v.union(v.string(), v.null())),
  platform: v.optional(v.union(v.string(), v.null())),
  category: v.optional(v.union(v.string(), v.null())),
  status: v.optional(v.union(v.string(), v.null())),
  scheduledDate: v.optional(v.union(v.string(), v.null())),
  author: v.optional(v.union(v.string(), v.null())),
  pillar: v.optional(v.union(v.string(), v.null())),
  productLine: v.optional(v.union(v.string(), v.null())),
  comments: v.optional(v.union(v.string(), v.null())),
  imageUrl: v.optional(v.union(v.string(), v.null())),
  imageUrl2: v.optional(v.union(v.string(), v.null())),
  imageUrl3: v.optional(v.union(v.string(), v.null())),
  imageStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  imageStorageId2: v.optional(v.union(v.id("_storage"), v.null())),
  imageStorageId3: v.optional(v.union(v.id("_storage"), v.null())),
  recurringActionId: v.optional(v.union(v.id("recurringActions"), v.null())),
};

// If a storage id is set, resolve it to a served URL; otherwise keep the
// existing (legacy Supabase) URL string.
async function resolveImageUrls(ctx: any, post: any) {
  const [url1, url2, url3] = await Promise.all([
    post.imageStorageId ? ctx.storage.getUrl(post.imageStorageId) : null,
    post.imageStorageId2 ? ctx.storage.getUrl(post.imageStorageId2) : null,
    post.imageStorageId3 ? ctx.storage.getUrl(post.imageStorageId3) : null,
  ]);
  return {
    ...post,
    imageUrl: url1 ?? post.imageUrl ?? null,
    imageUrl2: url2 ?? post.imageUrl2 ?? null,
    imageUrl3: url3 ?? post.imageUrl3 ?? null,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("social_media_posts").collect();
    return Promise.all(posts.map((p) => resolveImageUrls(ctx, p)));
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
    return Promise.all(posts.map((p) => resolveImageUrls(ctx, p)));
  },
});

export const get = query({
  args: { id: v.id("social_media_posts") },
  handler: async (ctx, { id }) => {
    const post = await ctx.db.get(id);
    return post ? resolveImageUrls(ctx, post) : null;
  },
});

// Look up a post by its original Supabase UUID (kept in `legacyId` during the
// migration). UI code holds these UUIDs from before the switch.
export const getByLegacyId = query({
  args: { legacyId: v.string() },
  handler: async (ctx, { legacyId }) => {
    const post = await ctx.db
      .query("social_media_posts")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", legacyId))
      .first();
    return post ? resolveImageUrls(ctx, post) : null;
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

// Update by the original Supabase UUID (see getByLegacyId).
export const updateByLegacyId = mutation({
  args: { legacyId: v.string(), patch: v.object(postFields) },
  handler: async (ctx, { legacyId, patch }) => {
    const existing = await ctx.db
      .query("social_media_posts")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", legacyId))
      .first();
    if (!existing) throw new Error(`Post with legacyId ${legacyId} not found`);
    await ctx.db.patch(existing._id, { ...patch, updatedAt: Date.now() });
    return existing._id;
  },
});

export const remove = mutation({
  args: { id: v.id("social_media_posts") },
  handler: async (ctx, { id }) => {
    const post = await ctx.db.get(id);
    // Clean up any images we own in Convex storage.
    for (const key of ["imageStorageId", "imageStorageId2", "imageStorageId3"] as const) {
      const sid = (post as any)?.[key];
      if (sid) await ctx.storage.delete(sid as Id<"_storage">);
    }
    await ctx.db.delete(id);
  },
});

export const removeByLegacyId = mutation({
  args: { legacyId: v.string() },
  handler: async (ctx, { legacyId }) => {
    const existing = await ctx.db
      .query("social_media_posts")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", legacyId))
      .first();
    if (!existing) return;
    for (const key of ["imageStorageId", "imageStorageId2", "imageStorageId3"] as const) {
      const sid = (existing as any)[key];
      if (sid) await ctx.storage.delete(sid as Id<"_storage">);
    }
    await ctx.db.delete(existing._id);
  },
});
