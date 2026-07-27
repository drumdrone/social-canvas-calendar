/**
 * Convex documents carry `_id` / `_creationTime`; the app (and the data coming
 * from Supabase) uses `id`. Convert on the way out so components keep working
 * with `record.id`.
 */

type ConvexDoc = { _id: unknown; _creationTime: number };

export function toApp<T extends ConvexDoc>(
  doc: T
): { id: string } & Omit<T, '_id' | '_creationTime'> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id as string, ...rest };
}

export function toAppMany<T extends ConvexDoc>(docs: T[]) {
  return docs.map((doc) => toApp(doc));
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Drops keys the client should not be able to set directly. */
export function sanitizePatch<T extends Record<string, unknown>>(patch: T) {
  const { id, _id, _creationTime, user_id, created_at, ...rest } = patch as Record<
    string,
    unknown
  >;
  return rest;
}
