import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { nowIso, toAppMany } from './lib';

/* Mood board items (table view) */

export const listItems = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query('mood_board_items').collect();
    return toAppMany(docs.sort((a, b) => a.created_at.localeCompare(b.created_at)));
  },
});

export const saveItem = mutation({
  args: {
    id: v.optional(v.id('mood_board_items')),
    napad: v.string(),
    text: v.string(),
    popis: v.string(),
    image_prompt: v.string(),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...values } = args;
    const timestamp = nowIso();

    if (id) {
      await ctx.db.patch(id, { ...values, updated_at: timestamp });
      return { id };
    }

    const newId = await ctx.db.insert('mood_board_items', {
      ...values,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return { id: newId };
  },
});

export const removeItem = mutation({
  args: { id: v.id('mood_board_items') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/* Mood board canvas: images and sticky notes */

export const listImages = query({
  args: {},
  handler: async (ctx) => toAppMany(await ctx.db.query('mood_board_images').collect()),
});

export const addImage = mutation({
  args: {
    url: v.string(),
    storageId: v.optional(v.id('_storage')),
    position_x: v.number(),
    position_y: v.number(),
    width: v.number(),
    height: v.number(),
  },
  handler: async (ctx, args) => {
    const timestamp = nowIso();
    const id = await ctx.db.insert('mood_board_images', {
      url: args.url,
      storage_id: args.storageId,
      position_x: args.position_x,
      position_y: args.position_y,
      width: args.width,
      height: args.height,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return { id };
  },
});

export const updateImage = mutation({
  args: {
    id: v.id('mood_board_images'),
    position_x: v.optional(v.number()),
    position_y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...values } = args;
    await ctx.db.patch(id, { ...values, updated_at: nowIso() });
    return { success: true };
  },
});

export const removeImage = mutation({
  args: { id: v.id('mood_board_images') },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (doc?.storage_id) await ctx.storage.delete(doc.storage_id);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const listNotes = query({
  args: {},
  handler: async (ctx) => toAppMany(await ctx.db.query('mood_board_notes').collect()),
});

export const saveNote = mutation({
  args: {
    id: v.optional(v.id('mood_board_notes')),
    content: v.string(),
    color: v.string(),
    position_x: v.number(),
    position_y: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...values } = args;
    const timestamp = nowIso();

    if (id) {
      await ctx.db.patch(id, { ...values, updated_at: timestamp });
      return { id };
    }

    const newId = await ctx.db.insert('mood_board_notes', {
      ...values,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return { id: newId };
  },
});

export const removeNote = mutation({
  args: { id: v.id('mood_board_notes') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
