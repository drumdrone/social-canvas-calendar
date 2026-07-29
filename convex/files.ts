import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// File storage helpers, replacing Supabase Storage buckets
// (`social-media-images`, `media-gallery`).
//
// Client upload flow:
//   1. const url = await convex.mutation(api.files.generateUploadUrl)
//   2. const res = await fetch(url, { method: "POST", body: file })
//   3. const { storageId } = await res.json()
//   4. store storageId on the owning document (e.g. posts.update)

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return ctx.storage.generateUploadUrl();
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return ctx.storage.getUrl(storageId);
  },
});

export const remove = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId);
  },
});
