import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { nowIso, toAppMany } from './lib';

/**
 * File storage, replacing the Supabase `social-media-images` and
 * `media-gallery` buckets. Uploads go straight to Convex storage; the app keeps
 * storing plain URLs on posts, so nothing else in the data model changes.
 */

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

/** Public URL of an uploaded file. */
export const getUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => ctx.storage.getUrl(args.storageId),
});

export const deleteFile = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/* Media gallery                                                       */
/* ------------------------------------------------------------------ */

export const listMedia = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query('media_files').withIndex('by_created_at').collect();
    return toAppMany(docs.reverse());
  },
});

export const addMedia = mutation({
  args: {
    storageId: v.id('_storage'),
    name: v.string(),
    size: v.optional(v.number()),
    contentType: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error('Uploaded file not found in storage');

    const id = await ctx.db.insert('media_files', {
      name: args.name,
      storage_id: args.storageId,
      url,
      size: args.size,
      content_type: args.contentType,
      created_at: nowIso(),
    });

    return { id, url };
  },
});

export const removeMedia = mutation({
  args: { id: v.id('media_files') },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return { success: true };

    await ctx.storage.delete(doc.storage_id);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
