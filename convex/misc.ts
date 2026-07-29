import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// mood_board_items ----------------------------------------------------------
const moodFields = {
  format: v.string(),
  imagePrompt: v.optional(v.string()),
  napad: v.optional(v.string()),
  popis: v.optional(v.string()),
  text: v.optional(v.string()),
};

export const listMoodBoard = query({
  args: {},
  handler: async (ctx) => ctx.db.query("mood_board_items").collect(),
});

export const createMoodItem = mutation({
  args: moodFields,
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("mood_board_items", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateMoodItem = mutation({
  args: { id: v.id("mood_board_items"), patch: v.object(moodFields) },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const removeMoodItem = mutation({
  args: { id: v.id("mood_board_items") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// plan_sections -------------------------------------------------------------
export const listPlanSections = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("plan_sections").collect();
    return rows.sort((a, b) => (a.sectionOrder ?? 0) - (b.sectionOrder ?? 0));
  },
});

export const upsertPlanSection = mutation({
  args: {
    id: v.optional(v.id("plan_sections")),
    sectionData: v.any(),
    sectionOrder: v.number(),
  },
  handler: async (ctx, { id, sectionData, sectionOrder }) => {
    const now = Date.now();
    if (id) {
      await ctx.db.patch(id, { sectionData, sectionOrder, updatedAt: now });
      return id;
    }
    return ctx.db.insert("plan_sections", {
      sectionData,
      sectionOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const removePlanSection = mutation({
  args: { id: v.id("plan_sections") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
