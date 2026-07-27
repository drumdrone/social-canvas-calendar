import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { nowIso, sanitizePatch, toAppMany } from './lib';

/* ------------------------------------------------------------------ */
/* Recurring actions (Plan page)                                       */
/* ------------------------------------------------------------------ */

const actionValues = {
  action_type: v.optional(v.string()),
  title: v.optional(v.string()),
  description: v.optional(v.union(v.string(), v.null())),
  frequency: v.optional(v.union(v.string(), v.null())),
  color: v.optional(v.union(v.string(), v.null())),
  order_index: v.optional(v.number()),
  data: v.optional(v.any()),
};

export const listActions = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query('recurring_actions').withIndex('by_order').collect();
    return toAppMany(docs);
  },
});

export const createAction = mutation({
  args: {
    action_type: v.string(),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    frequency: v.optional(v.union(v.string(), v.null())),
    color: v.optional(v.union(v.string(), v.null())),
    order_index: v.optional(v.number()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const timestamp = nowIso();
    const id = await ctx.db.insert('recurring_actions', {
      ...args,
      created_at: timestamp,
      updated_at: timestamp,
    });

    const doc = await ctx.db.get(id);
    return doc ? { id: doc._id, ...doc } : null;
  },
});

export const updateAction = mutation({
  args: { id: v.id('recurring_actions'), values: v.object(actionValues) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...sanitizePatch(args.values as Record<string, unknown>),
      updated_at: nowIso(),
    });
    return { success: true };
  },
});

export const removeAction = mutation({
  args: { id: v.id('recurring_actions') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const removeActions = mutation({
  args: { ids: v.array(v.id('recurring_actions')) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
    return { removed: args.ids.length };
  },
});

/* ------------------------------------------------------------------ */
/* Plan sections                                                       */
/* ------------------------------------------------------------------ */

export const listSections = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query('plan_sections').withIndex('by_order').collect();
    return toAppMany(docs);
  },
});

export const saveSection = mutation({
  args: {
    id: v.optional(v.id('plan_sections')),
    section_order: v.number(),
    section_data: v.any(),
  },
  handler: async (ctx, args) => {
    const timestamp = nowIso();

    if (args.id) {
      await ctx.db.patch(args.id, {
        section_order: args.section_order,
        section_data: args.section_data,
        updated_at: timestamp,
      });
      return { id: args.id };
    }

    const id = await ctx.db.insert('plan_sections', {
      section_order: args.section_order,
      section_data: args.section_data,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return { id };
  },
});

export const removeSection = mutation({
  args: { id: v.id('plan_sections') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
