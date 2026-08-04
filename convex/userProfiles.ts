import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// user_profiles CRUD, backing UserManagement (Settings) and the @mention
// lookup in CommentEditor. Kept separate from the taxonomy module because the
// notification-enabled toggle and email field give it a different shape.

const fields = {
  email: v.string(),
  fullName: v.string(),
  avatarUrl: v.optional(v.union(v.string(), v.null())),
  notificationEnabled: v.optional(v.boolean()),
  password: v.optional(v.string()),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("user_profiles").collect();
    // Strip password before it reaches the client — this query backs the
    // @mention list, which every comment editor loads.
    return rows
      .map(({ password: _password, ...rest }) => rest)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("user_profiles", {
      notificationEnabled: true,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { id: v.id("user_profiles"), patch: v.object(fields) },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("user_profiles") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Backs the login gate (convex/auth.ts). Internal-only so the password field
// never has to travel through a client-facing query.
export const findByPassword = internalQuery({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    if (!password) return null;
    const rows = await ctx.db.query("user_profiles").collect();
    return rows.find((row) => row.password && row.password === password) ?? null;
  },
});
