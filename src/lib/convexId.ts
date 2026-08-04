// Distinguishes a real Convex document id from a legacy Supabase UUID kept
// around post-migration (e.g. social_media_posts.legacyId). Convex ids are a
// base32-ish alphanumeric string starting with a table-prefix letter; legacy
// UUIDs are dash-separated hex and never match this shape.
export function isConvexId(id: string): boolean {
  return /^k[a-z0-9]{10,}$/.test(id);
}
