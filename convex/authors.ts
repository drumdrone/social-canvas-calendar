import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const authorFields = {
  name: v.string(),
  initials: v.string(),
  color: v.optional(v.string()),
  email: v.optional(v.union(v.string(), v.null())),
  isActive: v.optional(v.boolean()),
};

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    let rows = await ctx.db.query("authors").collect();
    if (activeOnly) rows = rows.filter((a) => a.isActive !== false);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: authorFields,
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("authors", {
      isActive: true,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { id: v.id("authors"), patch: v.object(authorFields) },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("authors") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
