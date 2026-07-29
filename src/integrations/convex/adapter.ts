import type { SocialPost } from '@/components/SocialCalendar';

// ---------------------------------------------------------------------------
// Taxonomy adapters (statuses, platforms, pillars, categories, formats,
// product_lines, authors).
// ---------------------------------------------------------------------------

// Convex taxonomy document -> snake_case shape the Supabase-era UI expects.
// Uses the Convex _id as the row id, so managers can pass it back into the
// update/remove mutations without a legacyId lookup.
export function convexToTaxonomy<T = any>(doc: any): T {
  return {
    id: doc._id,
    name: doc.name,
    color: doc.color,
    is_active: doc.isActive !== false, // treat missing as active
    // Optional per-taxonomy extras — undefined for taxonomies that don't use them.
    icon_name: doc.iconName,
    format: doc.format,
    initials: doc.initials,
    email: doc.email,
  } as T;
}

export function sortTaxonomyByName<T extends { name?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}



// Maps a Convex `social_media_posts` document to the snake_case `SocialPost`
// shape the existing Supabase-era UI expects. Used during the incremental
// migration — components can start reading from Convex without touching every
// downstream consumer.
export function convexToSocialPost(doc: any): SocialPost {
  return {
    // Prefer the original UUID (kept as legacyId during migration) so links
    // like /post/<UUID> continue to work; fall back to the new Convex _id.
    id: doc.legacyId ?? doc._id,
    title: doc.title ?? '',
    content: doc.content ?? undefined,
    platform: doc.platform ?? '',
    image_url: doc.imageUrl ?? undefined,
    image_url_1: doc.imageUrl ?? undefined,
    image_url_2: doc.imageUrl2 ?? undefined,
    image_url_3: doc.imageUrl3 ?? undefined,
    scheduled_date: doc.scheduledDate ?? '',
    status: doc.status ?? '',
    category: doc.category ?? '',
    // Convex stores these as epoch millis; convert back to ISO strings so the
    // legacy UI keeps working with `new Date(...)` / date-fns.
    created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
    updated_at: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    user_id: doc.userId ?? '',
    pillar: doc.pillar ?? undefined,
    product_line: doc.productLine ?? undefined,
    author: doc.author ?? undefined,
  };
}

// Payload the UI builds when saving a post. Kept in snake_case so the existing
// PostSlidingSidebar code doesn't have to be restructured; the helper below
// converts it to the camelCase shape Convex expects.
export interface SocialPostWrite {
  title?: string | null;
  content?: string | null;
  platform?: string | null;
  category?: string | null;
  status?: string | null;
  scheduled_date?: string | null;
  author?: string | null;
  pillar?: string | null;
  product_line?: string | null;
  comments?: string | null;
  image_url?: string | null;
  image_url_1?: string | null;
  image_url_2?: string | null;
  image_url_3?: string | null;
  recurring_action_id?: string | null;
}

// snake_case UI payload -> Convex patch. Drops keys that weren't supplied so
// partial updates only touch the fields the caller actually set.
export function socialPostToConvexPatch(input: SocialPostWrite): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) patch[k] = v;
  };
  set('title', input.title);
  set('content', input.content);
  set('platform', input.platform);
  set('category', input.category);
  set('status', input.status);
  set('scheduledDate', input.scheduled_date);
  set('author', input.author);
  set('pillar', input.pillar);
  set('productLine', input.product_line);
  set('comments', input.comments);
  // The UI uses image_url_1 as the canonical first image and mirrors it into
  // image_url; accept either.
  const first = input.image_url_1 ?? input.image_url;
  if (first !== undefined) patch.imageUrl = first;
  set('imageUrl2', input.image_url_2);
  set('imageUrl3', input.image_url_3);
  // recurringActionId in Convex is an Id<"recurringActions"> — the UI still
  // sends the legacy Supabase UUID string here during the migration. Leave it
  // unmapped for now; wire up a lookup once recurring actions get their own
  // legacyId query.
  return patch;
}
