import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { nowIso } from './lib';

/**
 * Endpoints used only by scripts/migrate-supabase-to-convex.mjs.
 * Safe to delete once the migration is done.
 */

const MIGRATABLE_TABLES = [
  'social_media_posts',
  'post_versions',
  'platforms',
  'post_statuses',
  'categories',
  'pillars',
  'product_lines',
  'formats',
  'authors',
  'recurring_actions',
  'plan_sections',
  'mood_board_items',
  'mood_board_images',
  'mood_board_notes',
] as const;

type MigratableTable = (typeof MIGRATABLE_TABLES)[number];

function assertTable(table: string): MigratableTable {
  if (!MIGRATABLE_TABLES.includes(table as MigratableTable)) {
    throw new Error(`Table ${table} cannot be imported`);
  }
  return table as MigratableTable;
}

/** Inserts rows coming from Supabase. Timestamps are preserved when present. */
export const importRows = mutation({
  args: { table: v.string(), rows: v.array(v.any()) },
  handler: async (ctx, args) => {
    const table = assertTable(args.table);
    const timestamp = nowIso();

    /** New Convex ids in the same order as the incoming rows, so the script can
     *  remap foreign keys (recurring_action_id, post_id). */
    const ids: string[] = [];

    for (const row of args.rows) {
      const { id, _id, _creationTime, user_id, ...values } = row as Record<
        string,
        unknown
      >;

      const newId = await ctx.db.insert(table, {
        created_at: timestamp,
        updated_at: timestamp,
        ...values,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      ids.push(newId);
    }

    return { inserted: ids.length, ids };
  },
});

/** Empties a table so the migration can be re-run from scratch. */
export const clearTable = mutation({
  args: { table: v.string() },
  handler: async (ctx, args) => {
    const table = assertTable(args.table);
    const docs = await ctx.db.query(table).collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: docs.length };
  },
});
