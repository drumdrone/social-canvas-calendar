import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Standalone image library, replacing the Supabase `media-gallery` storage
// bucket. Upload flow is the same generateUploadUrl -> fetch -> storageId
// pattern as convex/files.ts; `add` records the resulting item so it shows
// up in the gallery list.

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("mediaGalleryItems").order("desc").collect();
    return Promise.all(
      items.map(async (item) => ({
        ...item,
        url: await ctx.storage.getUrl(item.storageId),
      })),
    );
  },
});

export const add = mutation({
  args: { storageId: v.id("_storage"), name: v.string() },
  handler: async (ctx, { storageId, name }) => {
    const now = Date.now();
    return ctx.db.insert("mediaGalleryItems", {
      storageId,
      name,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("mediaGalleryItems") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (!item) return;
    await ctx.storage.delete(item.storageId);
    await ctx.db.delete(id);
  },
});
