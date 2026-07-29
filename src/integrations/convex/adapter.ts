import type { SocialPost } from '@/components/SocialCalendar';

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
