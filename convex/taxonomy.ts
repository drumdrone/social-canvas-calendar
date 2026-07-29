import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// The lookup/taxonomy tables share the same CRUD shape. We build a set of
// query/mutation handlers per table with a small factory and re-export them
// under explicit names (Convex registers functions by their export name).

type LookupTable =
  | "post_statuses"
  | "platforms"
  | "pillars"
  | "categories"
  | "formats"
  | "product_lines";

function lookupApi(table: LookupTable, extra: Record<string, any> = {}) {
  const fields = {
    name: v.string(),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    ...extra,
  };

  return {
    list: query({
      args: {},
      handler: async (ctx) => {
        const rows = await ctx.db.query(table).collect();
        // Active first, then by name — matches the old `.order('name')` usage.
        return rows.sort((a: any, b: any) =>
          (a.name ?? "").localeCompare(b.name ?? ""),
        );
      },
    }),
    create: mutation({
      args: fields,
      handler: async (ctx, args) => {
        const now = Date.now();
        return ctx.db.insert(table, {
          isActive: true,
          ...args,
          createdAt: now,
          updatedAt: now,
        } as any);
      },
    }),
    update: mutation({
      args: { id: v.id(table), patch: v.object(fields) },
      handler: async (ctx, { id, patch }) => {
        await ctx.db.patch(id as any, { ...patch, updatedAt: Date.now() });
      },
    }),
    remove: mutation({
      args: { id: v.id(table) },
      handler: async (ctx, { id }) => {
        await ctx.db.delete(id as any);
      },
    }),
  };
}

const statuses = lookupApi("post_statuses");
export const listStatuses = statuses.list;
export const createStatus = statuses.create;
export const updateStatus = statuses.update;
export const removeStatus = statuses.remove;

const platforms = lookupApi("platforms", { iconName: v.optional(v.string()) });
export const listPlatforms = platforms.list;
export const createPlatform = platforms.create;
export const updatePlatform = platforms.update;
export const removePlatform = platforms.remove;

const pillars = lookupApi("pillars");
export const listPillars = pillars.list;
export const createPillar = pillars.create;
export const updatePillar = pillars.update;
export const removePillar = pillars.remove;

const categories = lookupApi("categories", {
  format: v.optional(v.union(v.string(), v.null())),
});
export const listCategories = categories.list;
export const createCategory = categories.create;
export const updateCategory = categories.update;
export const removeCategory = categories.remove;

const formats = lookupApi("formats");
export const listFormats = formats.list;
export const createFormat = formats.create;
export const updateFormat = formats.update;
export const removeFormat = formats.remove;

const productLines = lookupApi("product_lines");
export const listProductLines = productLines.list;
export const createProductLine = productLines.create;
export const updateProductLine = productLines.update;
export const removeProductLine = productLines.remove;
