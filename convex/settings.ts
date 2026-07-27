import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { nowIso, sanitizePatch, toAppMany } from './lib';

/**
 * Generic CRUD for the simple lookup tables managed in Settings
 * (platforms, statuses, categories, pillars, product lines, formats, authors).
 */

const settingsTable = v.union(
  v.literal('platforms'),
  v.literal('post_statuses'),
  v.literal('categories'),
  v.literal('pillars'),
  v.literal('product_lines'),
  v.literal('formats'),
  v.literal('authors')
);

const settingsValues = v.object({
  name: v.optional(v.string()),
  color: v.optional(v.string()),
  is_active: v.optional(v.boolean()),
  icon_name: v.optional(v.string()),
  format: v.optional(v.union(v.string(), v.null())),
  initials: v.optional(v.string()),
  email: v.optional(v.union(v.string(), v.null())),
});

/** Shape returned to the client for every settings table. */
export interface SettingsRow {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  icon_name?: string;
  format?: string | null;
  initials?: string;
  email?: string | null;
}

export const list = query({
  args: { table: settingsTable, activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<SettingsRow[]> => {
    const docs = await ctx.db.query(args.table).withIndex('by_name').collect();
    const filtered = args.activeOnly ? docs.filter((doc) => doc.is_active) : docs;

    return toAppMany(filtered.sort((a, b) => a.name.localeCompare(b.name))).map(
      (row) => {
        const extras = row as Partial<SettingsRow>;

        return {
          id: row.id,
          name: row.name,
          color: row.color,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          icon_name: extras.icon_name,
          format: extras.format ?? null,
          initials: extras.initials,
          email: extras.email ?? null,
        };
      }
    );
  },
});

export const create = mutation({
  args: { table: settingsTable, values: settingsValues },
  handler: async (ctx, args) => {
    const timestamp = nowIso();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = await ctx.db.insert(args.table, {
      color: '#3B82F6',
      is_active: true,
      ...args.values,
      created_at: timestamp,
      updated_at: timestamp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return { id };
  },
});

export const update = mutation({
  args: { table: settingsTable, id: v.string(), values: settingsValues },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId(args.table, args.id);
    if (!id) throw new Error(`Unknown ${args.table} id: ${args.id}`);

    await ctx.db.patch(id, {
      ...sanitizePatch(args.values as Record<string, unknown>),
      updated_at: nowIso(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return { success: true };
  },
});

export const remove = mutation({
  args: { table: settingsTable, id: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId(args.table, args.id);
    if (!id) throw new Error(`Unknown ${args.table} id: ${args.id}`);

    await ctx.db.delete(id);
    return { success: true };
  },
});
