import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { saveVersion } from './posts';
import { nowIso, toAppMany } from './lib';

/** Replaces the Postgres function `get_post_versions`. */
export const listForPost = query({
  args: { postId: v.string() },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('post_versions')
      .withIndex('by_post', (q) => q.eq('post_id', args.postId))
      .collect();

    return toAppMany(docs.sort((a, b) => b.version_number - a.version_number));
  },
});

/** Replaces the Postgres function `create_post_backup`. */
export const createBackup = mutation({
  args: {
    postId: v.id('social_media_posts'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error('Post not found');

    const versionNumber = await saveVersion(ctx, post, args.reason ?? 'manual_backup');
    return { version_number: versionNumber };
  },
});

/** Replaces the Postgres function `restore_post_from_backup`. */
export const restore = mutation({
  args: {
    postId: v.id('social_media_posts'),
    versionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error('Post not found');

    const version = (
      await ctx.db
        .query('post_versions')
        .withIndex('by_post', (q) => q.eq('post_id', args.postId))
        .collect()
    ).find((row) => row.version_number === args.versionNumber);

    if (!version) throw new Error(`Version ${args.versionNumber} not found`);

    // Keep the current state recoverable before overwriting it.
    await saveVersion(ctx, post, 'auto_backup_before_restore');

    await ctx.db.patch(args.postId, {
      title: version.title,
      content: version.content ?? null,
      platform: version.platform,
      status: version.status,
      category: version.category,
      scheduled_date: version.scheduled_date,
      pillar: version.pillar ?? null,
      product_line: version.product_line ?? null,
      image_url_1: version.image_url ?? null,
      updated_at: nowIso(),
    });

    return { success: true };
  },
});
