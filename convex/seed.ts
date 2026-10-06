import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// One-time setup for a newly created company (tenant). A new Convex project
// starts empty, so before anyone can use it, it needs:
//   1. a first login user (user_profiles row with a password), and
//   2. the lookup tables (statuses, platforms, …) filled in.
//
// To give a new company the SAME lookups as Apotheke, this runs in two steps,
// because each company is a separate Convex deployment:
//   A) In APOTHEKE: run `seed:exportTaxonomy`, copy the JSON result.
//   B) In the NEW company: run `seed:seedTenant` with that JSON plus the
//      first user's details.

// --- A) Run this in the SOURCE company (Apotheke) ---------------------------
// Returns every lookup row, stripped of ids/timestamps, ready to paste into
// seedTenant's `taxonomy` argument.
export const exportTaxonomy = query({
  args: {},
  handler: async (ctx) => {
    const clean = (rows: any[], keep: string[]) =>
      rows.map((r) => {
        const out: Record<string, unknown> = {};
        for (const k of keep) if (r[k] !== undefined) out[k] = r[k];
        return out;
      });

    const base = ["name", "color", "isActive"];
    return {
      post_statuses: clean(await ctx.db.query("post_statuses").collect(), base),
      platforms: clean(await ctx.db.query("platforms").collect(), [...base, "iconName"]),
      pillars: clean(await ctx.db.query("pillars").collect(), base),
      categories: clean(await ctx.db.query("categories").collect(), [...base, "format"]),
      formats: clean(await ctx.db.query("formats").collect(), base),
      product_lines: clean(await ctx.db.query("product_lines").collect(), base),
    };
  },
});

// --- B) Run this in the NEW, empty company ----------------------------------
// Creates the first user and inserts the lookups. Refuses to run if the
// company already has any users, so it can't double-seed or be run against a
// company that's already in use (e.g. Apotheke).
const lookupRow = v.object({
  name: v.string(),
  color: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
});
const platformRow = v.object({
  name: v.string(),
  color: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
  iconName: v.optional(v.string()),
});
const categoryRow = v.object({
  name: v.string(),
  color: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
  format: v.optional(v.union(v.string(), v.null())),
});

export const seedTenant = mutation({
  args: {
    user: v.object({
      email: v.string(),
      fullName: v.string(),
      password: v.string(),
    }),
    taxonomy: v.object({
      post_statuses: v.array(lookupRow),
      platforms: v.array(platformRow),
      pillars: v.array(lookupRow),
      categories: v.array(categoryRow),
      formats: v.array(lookupRow),
      product_lines: v.array(lookupRow),
    }),
  },
  handler: async (ctx, { user, taxonomy }) => {
    const existingUsers = await ctx.db.query("user_profiles").take(1);
    if (existingUsers.length > 0) {
      throw new Error(
        "Tato firma už má uživatele — seed se nespustí (ochrana proti přepsání).",
      );
    }

    const now = Date.now();

    const userId = await ctx.db.insert("user_profiles", {
      email: user.email,
      fullName: user.fullName,
      password: user.password,
      notificationEnabled: true,
      createdAt: now,
      updatedAt: now,
    });

    const counts: Record<string, number> = {};
    const insertAll = async (table: any, rows: any[]) => {
      for (const row of rows) {
        await ctx.db.insert(table, {
          isActive: true,
          ...row,
          createdAt: now,
          updatedAt: now,
        });
      }
      counts[table] = rows.length;
    };

    await insertAll("post_statuses", taxonomy.post_statuses);
    await insertAll("platforms", taxonomy.platforms);
    await insertAll("pillars", taxonomy.pillars);
    await insertAll("categories", taxonomy.categories);
    await insertAll("formats", taxonomy.formats);
    await insertAll("product_lines", taxonomy.product_lines);

    return { userId, counts };
  },
});
