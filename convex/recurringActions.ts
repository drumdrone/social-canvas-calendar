import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const fields = {
  actionType: v.string(),
  title: v.optional(v.string()),
  subtitle: v.optional(v.string()),
  description: v.optional(v.string()),
  data: v.optional(v.any()),
  color: v.optional(v.string()),
  orderIndex: v.optional(v.number()),
  month: v.optional(v.string()),
  week: v.optional(v.union(v.number(), v.null())),
  groupId: v.optional(v.union(v.string(), v.null())),
  isCustom: v.optional(v.boolean()),
  status: v.optional(v.string()),
  frequency: v.optional(v.string()),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("recurringActions").collect();
    return rows.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  },
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("recurringActions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { id: v.id("recurringActions"), patch: v.object(fields) },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("recurringActions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
