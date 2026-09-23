import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

// Product campaigns: each campaign holds a list of e-shop products with a
// target number of posts. Posts reference a product via
// social_media_posts.campaignProductId, which drives the campaign's
// traffic-light overview.

const campaignFields = {
  name: v.string(),
  startDate: v.optional(v.union(v.string(), v.null())),
  endDate: v.optional(v.union(v.string(), v.null())),
  isActive: v.optional(v.boolean()),
};

const productFields = {
  code: v.string(),
  name: v.string(),
  url: v.optional(v.union(v.string(), v.null())),
  imageUrl: v.optional(v.union(v.string(), v.null())),
  targetPosts: v.number(),
  orderIndex: v.optional(v.number()),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("campaigns").collect();
    // Newest first.
    return rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },
});

export const create = mutation({
  args: campaignFields,
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("campaigns", {
      isActive: true,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    patch: v.object({
      name: v.optional(v.string()),
      startDate: v.optional(v.union(v.string(), v.null())),
      endDate: v.optional(v.union(v.string(), v.null())),
      isActive: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

// Unlink posts from a product so they don't point at a deleted document.
async function unlinkPosts(ctx: any, productId: any) {
  const posts = await ctx.db
    .query("social_media_posts")
    .withIndex("by_campaignProduct", (q: any) => q.eq("campaignProductId", productId))
    .collect();
  for (const p of posts) await ctx.db.patch(p._id, { campaignProductId: null });
}

export const remove = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, { id }) => {
    const products = await ctx.db
      .query("campaignProducts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", id))
      .collect();
    for (const p of products) {
      await unlinkPosts(ctx, p._id);
      await ctx.db.delete(p._id);
    }
    await ctx.db.delete(id);
  },
});

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("campaignProducts").collect();
    return rows.sort(
      (a, b) => (a.orderIndex ?? a.createdAt ?? 0) - (b.orderIndex ?? b.createdAt ?? 0),
    );
  },
});

export const addProduct = mutation({
  args: { campaignId: v.id("campaigns"), ...productFields },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("campaignProducts", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("campaignProducts"),
    patch: v.object({
      code: v.optional(v.string()),
      name: v.optional(v.string()),
      url: v.optional(v.union(v.string(), v.null())),
      imageUrl: v.optional(v.union(v.string(), v.null())),
      targetPosts: v.optional(v.number()),
      orderIndex: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const removeProduct = mutation({
  args: { id: v.id("campaignProducts") },
  handler: async (ctx, { id }) => {
    await unlinkPosts(ctx, id);
    await ctx.db.delete(id);
  },
});

// ---------------------------------------------------------------------------
// Load product code / name / image from an e-shop product page. Runs server
// side so the browser isn't blocked by CORS. Best effort: reads JSON-LD
// Product data, microdata / meta tags, then falls back to <h1>/<title> and a
// "Kód: …" text pattern.

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, " "));

function metaContent(html: string, attr: string, value: string): string | null {
  // Attribute order varies: <meta property="x" content="y"> or reversed.
  const a = new RegExp(
    `<meta[^>]*${attr}=["']${value}["'][^>]*content=["']([^"']*)["']`,
    "i",
  ).exec(html);
  if (a) return decodeEntities(a[1]);
  const b = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${value}["']`,
    "i",
  ).exec(html);
  return b ? decodeEntities(b[1]) : null;
}

function findJsonLdProduct(html: string): any | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      const queue: any[] = Array.isArray(data) ? [...data] : [data];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== "object") continue;
        const type = node["@type"];
        if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return node;
        if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return null;
}

export const fetchProductFromUrl = action({
  args: { url: v.string() },
  handler: async (_ctx, { url }) => {
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      throw new Error("Neplatná URL adresa");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Podporované jsou jen http(s) odkazy");
    }

    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SocialCanvasCalendar/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`E-shop vrátil chybu ${res.status}`);
    const html = (await res.text()).slice(0, 2_000_000);

    const ld = findJsonLdProduct(html);
    const ldImage = ld?.image
      ? Array.isArray(ld.image)
        ? typeof ld.image[0] === "string" ? ld.image[0] : ld.image[0]?.url
        : typeof ld.image === "string" ? ld.image : ld.image?.url
      : null;

    const name =
      (ld?.name && decodeEntities(String(ld.name))) ||
      metaContent(html, "property", "og:title") ||
      (() => {
        const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
        return h1 ? stripTags(h1[1]) : null;
      })() ||
      (() => {
        const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
        return t ? stripTags(t[1]) : null;
      })() ||
      "";

    const microSku = (() => {
      const m =
        /itemprop=["'](?:sku|productID|mpn)["'][^>]*content=["']([^"']+)["']/i.exec(html) ||
        /itemprop=["'](?:sku|productID|mpn)["'][^>]*>([^<]+)</i.exec(html);
      return m ? decodeEntities(m[1]) : null;
    })();

    const textCode = (() => {
      const text = stripTags(html);
      const m = /(?:Kód(?:\s+(?:produktu|zboží|výrobku))?|Katalogové číslo|SKU)\s*:?\s*([A-Za-z0-9][A-Za-z0-9._\-/]{1,40})/i.exec(
        text,
      );
      return m ? m[1] : null;
    })();

    const code =
      (ld?.sku && String(ld.sku)) ||
      (ld?.mpn && String(ld.mpn)) ||
      (ld?.productID && String(ld.productID)) ||
      microSku ||
      metaContent(html, "property", "product:retailer_item_id") ||
      textCode ||
      "";

    const imageUrl = ldImage || metaContent(html, "property", "og:image") || null;

    return {
      code: code.trim(),
      name: name.trim(),
      imageUrl: imageUrl ? new URL(imageUrl, parsed).toString() : null,
      url: parsed.toString(),
    };
  },
});
