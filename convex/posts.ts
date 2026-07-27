import { v } from 'convex/values';
import { Doc } from './_generated/dataModel';
import { MutationCtx, mutation, query } from './_generated/server';
import { nowIso, sanitizePatch, toApp, toAppMany } from './lib';

const postFields = {
  title: v.string(),
  content: v.optional(v.union(v.string(), v.null())),
  platform: v.string(),
  status: v.string(),
  category: v.string(),
  scheduled_date: v.string(),
  author: v.optional(v.union(v.string(), v.null())),
  pillar: v.optional(v.union(v.string(), v.null())),
  product_line: v.optional(v.union(v.string(), v.null())),
  comments: v.optional(v.union(v.string(), v.null())),
  image_url: v.optional(v.union(v.string(), v.null())),
  image_url_1: v.optional(v.union(v.string(), v.null())),
  image_url_2: v.optional(v.union(v.string(), v.null())),
  image_url_3: v.optional(v.union(v.string(), v.null())),
  recurring_action_id: v.optional(v.union(v.string(), v.null())),
};

const postPatchFields = {
  title: v.optional(v.string()),
  content: v.optional(v.union(v.string(), v.null())),
  platform: v.optional(v.string()),
  status: v.optional(v.string()),
  category: v.optional(v.string()),
  scheduled_date: v.optional(v.string()),
  author: v.optional(v.union(v.string(), v.null())),
  pillar: v.optional(v.union(v.string(), v.null())),
  product_line: v.optional(v.union(v.string(), v.null())),
  comments: v.optional(v.union(v.string(), v.null())),
  image_url: v.optional(v.union(v.string(), v.null())),
  image_url_1: v.optional(v.union(v.string(), v.null())),
  image_url_2: v.optional(v.union(v.string(), v.null())),
  image_url_3: v.optional(v.union(v.string(), v.null())),
  recurring_action_id: v.optional(v.union(v.string(), v.null())),
};

/**
 * Posts in an inclusive ISO date range, sorted by scheduled_date.
 * Without a range it returns every post.
 */
export const list = query({
  args: {
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    recurringActionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.recurringActionId !== undefined) {
      const byAction = await ctx.db
        .query('social_media_posts')
        .withIndex('by_recurring_action', (q) =>
          q.eq('recurring_action_id', args.recurringActionId)
        )
        .collect();

      return toAppMany(
        byAction.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      );
    }

    const { from, to } = args;

    const docs =
      from !== undefined && to !== undefined
        ? await ctx.db
            .query('social_media_posts')
            .withIndex('by_scheduled_date', (q) =>
              q.gte('scheduled_date', from).lte('scheduled_date', to)
            )
            .collect()
        : from !== undefined
          ? await ctx.db
              .query('social_media_posts')
              .withIndex('by_scheduled_date', (q) => q.gte('scheduled_date', from))
              .collect()
          : to !== undefined
            ? await ctx.db
                .query('social_media_posts')
                .withIndex('by_scheduled_date', (q) => q.lte('scheduled_date', to))
                .collect()
            : await ctx.db
                .query('social_media_posts')
                .withIndex('by_scheduled_date')
                .collect();

    return toAppMany(docs);
  },
});

export const get = query({
  args: { id: v.id('social_media_posts') },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    return doc ? toApp(doc) : null;
  },
});

export const create = mutation({
  args: { values: v.object(postFields) },
  handler: async (ctx, args) => {
    const timestamp = nowIso();
    const id = await ctx.db.insert('social_media_posts', {
      ...args.values,
      created_at: timestamp,
      updated_at: timestamp,
    });

    const doc = await ctx.db.get(id);
    return doc ? toApp(doc) : null;
  },
});

export const update = mutation({
  args: {
    id: v.id('social_media_posts'),
    values: v.object(postPatchFields),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error('Post not found');

    // Snapshot the previous state so version history keeps working.
    // Comment-only edits are skipped, otherwise every comment would add a version.
    const touchedFields = Object.keys(args.values).filter(
      (key) => args.values[key as keyof typeof args.values] !== undefined
    );
    const contentChanged = touchedFields.some((field) => field !== 'comments');

    if (contentChanged) {
      await saveVersion(ctx, existing, 'auto_backup_on_update');
    }

    await ctx.db.patch(args.id, {
      ...sanitizePatch(args.values as Record<string, unknown>),
      updated_at: nowIso(),
    });

    const doc = await ctx.db.get(args.id);
    return doc ? toApp(doc) : null;
  },
});

export const remove = mutation({
  args: { id: v.id('social_media_posts') },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query('post_versions')
      .withIndex('by_post', (q) => q.eq('post_id', args.id))
      .collect();

    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/** Bulk insert used by the CSV/JSON import in PostDataManager. */
export const createMany = mutation({
  args: { values: v.array(v.object(postFields)) },
  handler: async (ctx, args) => {
    const timestamp = nowIso();
    let inserted = 0;

    for (const values of args.values) {
      await ctx.db.insert('social_media_posts', {
        ...values,
        created_at: timestamp,
        updated_at: timestamp,
      });
      inserted += 1;
    }

    return { inserted };
  },
});

/** Writes a snapshot of a post into post_versions. Shared with versions.ts. */
export async function saveVersion(
  ctx: MutationCtx,
  post: Doc<'social_media_posts'>,
  reason: string
) {
  const previous = await ctx.db
    .query('post_versions')
    .withIndex('by_post', (q) => q.eq('post_id', post._id))
    .collect();

  const versionNumber =
    previous.reduce((max, row) => Math.max(max, row.version_number), 0) + 1;

  await ctx.db.insert('post_versions', {
    post_id: post._id,
    version_number: versionNumber,
    backup_reason: reason,
    title: post.title,
    content: post.content ?? null,
    platform: post.platform,
    status: post.status,
    category: post.category,
    scheduled_date: post.scheduled_date,
    pillar: post.pillar ?? null,
    product_line: post.product_line ?? null,
    image_url: post.image_url_1 ?? post.image_url ?? null,
    created_at: nowIso(),
  });

  return versionNumber;
}
