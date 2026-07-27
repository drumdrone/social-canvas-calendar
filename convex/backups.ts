import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { nowIso, toAppMany } from './lib';

/**
 * Full-database backups. The JSON snapshot lives in Convex file storage, the
 * `backups` table only holds metadata (replaces the old `backups` bucket).
 */

const BACKUP_TABLES = [
  'social_media_posts',
  'plan_sections',
  'platforms',
  'post_statuses',
  'categories',
  'product_lines',
  'pillars',
  'formats',
  'authors',
  'recurring_actions',
] as const;

export const listBackups = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query('backups').withIndex('by_created_at').collect();
    return toAppMany(docs.reverse());
  },
});

/** Everything worth backing up, as plain rows. */
export const snapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const data: Record<string, unknown[]> = {};

    for (const table of BACKUP_TABLES) {
      data[table] = await ctx.db.query(table).collect();
    }

    return data;
  },
});

export const record = internalMutation({
  args: { name: v.string(), storageId: v.id('_storage'), size: v.number() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('backups', {
      name: args.name,
      storage_id: args.storageId,
      size: args.size,
      created_at: nowIso(),
    });

    return { id };
  },
});

export const create = action({
  args: {},
  handler: async (ctx): Promise<{ name: string; size: number }> => {
    const data = await ctx.runQuery(internal.backups.snapshot, {});

    const payload = {
      meta: {
        created_at: new Date().toISOString(),
        app: 'Social Canvas Calendar Backup',
        version: 2,
        counts: Object.fromEntries(
          Object.entries(data).map(([table, rows]) => [table, rows.length])
        ),
      },
      data,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const storageId = await ctx.storage.store(blob);
    const name = `backup-${new Date().toISOString().replace(/:/g, '-')}.json`;

    await ctx.runMutation(internal.backups.record, {
      name,
      storageId,
      size: json.length,
    });

    return { name, size: json.length };
  },
});

/** Wipes a table and re-inserts the rows from a backup. */
export const applyTable = internalMutation({
  args: { table: v.string(), rows: v.array(v.any()) },
  handler: async (ctx, args) => {
    if (!BACKUP_TABLES.includes(args.table as (typeof BACKUP_TABLES)[number])) {
      throw new Error(`Table ${args.table} is not part of backups`);
    }

    const table = args.table as (typeof BACKUP_TABLES)[number];
    const existing = await ctx.db.query(table).collect();

    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    for (const row of args.rows) {
      const { _id, _creationTime, id, user_id, ...values } = row as Record<
        string,
        unknown
      >;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ctx.db.insert(table, values as any);
    }

    return { inserted: args.rows.length };
  },
});

export const restore = action({
  args: { id: v.id('backups') },
  handler: async (ctx, args): Promise<{ restored: string[] }> => {
    const backup = await ctx.runQuery(api.backups.getBackup, { id: args.id });
    if (!backup) throw new Error('Backup not found');

    const blob = await ctx.storage.get(backup.storage_id);
    if (!blob) throw new Error('Backup file missing from storage');

    const parsed = JSON.parse(await blob.text());
    const data = parsed?.data;
    if (!data) throw new Error('Invalid backup format');

    const restored: string[] = [];

    for (const table of BACKUP_TABLES) {
      const rows = data[table];
      if (!Array.isArray(rows)) continue;

      await ctx.runMutation(internal.backups.applyTable, { table, rows });
      restored.push(table);
    }

    return { restored };
  },
});

export const getBackup = query({
  args: { id: v.id('backups') },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const remove = mutation({
  args: { id: v.id('backups') },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return { success: true };

    await ctx.storage.delete(doc.storage_id);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/** Download URL for a stored backup file. */
export const downloadUrl = query({
  args: { id: v.id('backups') },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    return doc ? ctx.storage.getUrl(doc.storage_id) : null;
  },
});
