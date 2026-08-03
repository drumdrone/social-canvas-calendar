import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Convex schema mirroring the former Supabase Postgres tables.
//
// Notes on the port from Supabase:
// - Convex gives every document a system `_id` and `_creationTime`. We keep the
//   original `createdAt`/`updatedAt` (epoch ms) so migrated data preserves its
//   timeline, and we retain each row's original Postgres UUID in `legacyId` so
//   the migration script can rewrite cross-table references.
// - `social_media_posts` referenced taxonomy (platform/category/pillar/…) by
//   NAME strings, not FKs — we keep that as-is. `recurring_action_id` was a real
//   FK and becomes a Convex `Id<"recurringActions">` (remapped during migration).
// - Uploaded images move from Supabase Storage to Convex file storage:
//   `imageStorageId` holds the Convex storage id; `imageUrl` keeps a resolved
//   URL (or legacy Supabase URL until re-uploaded).

const timestamps = {
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  legacyId: v.optional(v.string()),
};

// Shared shape for the simple lookup/taxonomy tables.
const lookup = {
  name: v.string(),
  color: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
  ...timestamps,
};

export default defineSchema({
  social_media_posts: defineTable({
    // Real data has nulls in several "required" columns, so accept null/absent
    // and let the UI enforce presence at write time.
    title: v.optional(v.union(v.string(), v.null())),
    content: v.optional(v.union(v.string(), v.null())),
    platform: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.union(v.string(), v.null())),
    scheduledDate: v.optional(v.union(v.string(), v.null())), // ISO date string
    author: v.optional(v.union(v.string(), v.null())),
    pillar: v.optional(v.union(v.string(), v.null())),
    productLine: v.optional(v.union(v.string(), v.null())),
    comments: v.optional(v.union(v.string(), v.null())), // inline text comment log
    imageUrl: v.optional(v.union(v.string(), v.null())),
    // Storage ids allow null so the UI can clear an image via a patch that
    // sets it back to null (parity with imageUrl).
    imageStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    // Multi-image support (up to 3 images per post).
    imageUrl2: v.optional(v.union(v.string(), v.null())),
    imageUrl3: v.optional(v.union(v.string(), v.null())),
    imageStorageId2: v.optional(v.union(v.id("_storage"), v.null())),
    imageStorageId3: v.optional(v.union(v.id("_storage"), v.null())),
    recurringActionId: v.optional(v.union(v.id("recurringActions"), v.null())),
    userId: v.optional(v.union(v.string(), v.null())),
    ...timestamps,
  })
    .index("by_scheduledDate", ["scheduledDate"])
    .index("by_status", ["status"])
    .index("by_platform", ["platform"])
    .index("by_recurringAction", ["recurringActionId"])
    .index("by_legacyId", ["legacyId"]),

  authors: defineTable({
    name: v.string(),
    initials: v.string(),
    color: v.optional(v.string()),
    email: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
    ...timestamps,
  })
    .index("by_initials", ["initials"])
    .index("by_legacyId", ["legacyId"]),

  post_statuses: defineTable(lookup).index("by_legacyId", ["legacyId"]),
  platforms: defineTable({ ...lookup, iconName: v.optional(v.string()) }).index(
    "by_legacyId",
    ["legacyId"],
  ),
  pillars: defineTable(lookup).index("by_legacyId", ["legacyId"]),
  categories: defineTable({ ...lookup, format: v.optional(v.union(v.string(), v.null())) }).index(
    "by_legacyId",
    ["legacyId"],
  ),
  formats: defineTable(lookup).index("by_legacyId", ["legacyId"]),
  product_lines: defineTable(lookup).index("by_legacyId", ["legacyId"]),

  recurringActions: defineTable({
    actionType: v.string(), // 'monthly' | 'weekly' | 'quarterly'
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    data: v.optional(v.any()), // flexible jsonb payload
    color: v.optional(v.string()),
    orderIndex: v.optional(v.number()),
    month: v.optional(v.string()),
    week: v.optional(v.union(v.number(), v.null())),
    groupId: v.optional(v.union(v.string(), v.null())),
    isCustom: v.optional(v.boolean()),
    status: v.optional(v.string()),
    frequency: v.optional(v.string()),
    userId: v.optional(v.union(v.string(), v.null())),
    ...timestamps,
  }).index("by_legacyId", ["legacyId"]),

  mood_board_items: defineTable({
    format: v.optional(v.union(v.string(), v.null())),
    imagePrompt: v.optional(v.string()),
    napad: v.optional(v.string()),
    popis: v.optional(v.string()),
    text: v.optional(v.string()),
    userId: v.optional(v.string()),
    ...timestamps,
  }).index("by_legacyId", ["legacyId"]),

  plan_sections: defineTable({
    sectionData: v.optional(v.any()),
    sectionOrder: v.optional(v.union(v.number(), v.null())),
    userId: v.optional(v.string()),
    ...timestamps,
  }).index("by_legacyId", ["legacyId"]),

  // Standalone image library (Media Gallery), replacing the Supabase
  // `media-gallery` storage bucket. Distinct from posts' own attached images.
  // No custom index needed — listed newest-first via the built-in _creationTime.
  mediaGalleryItems: defineTable({
    storageId: v.id("_storage"),
    name: v.string(),
    ...timestamps,
  }),

  // --- Comment / mention / notification system (table-based, "System A") ---
  user_profiles: defineTable({
    email: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.union(v.string(), v.null())),
    notificationEnabled: v.optional(v.boolean()),
    ...timestamps,
  })
    .index("by_email", ["email"])
    .index("by_legacyId", ["legacyId"]),

  comments: defineTable({
    postId: v.id("social_media_posts"),
    authorId: v.id("user_profiles"),
    content: v.string(),
    ...timestamps,
  })
    .index("by_post", ["postId"])
    .index("by_legacyId", ["legacyId"]),

  comment_mentions: defineTable({
    commentId: v.id("comments"),
    mentionedUserId: v.id("user_profiles"),
    ...timestamps,
  })
    .index("by_comment", ["commentId"])
    .index("by_legacyId", ["legacyId"]),

  notifications: defineTable({
    userId: v.id("user_profiles"),
    commentId: v.id("comments"),
    postId: v.id("social_media_posts"),
    isRead: v.optional(v.boolean()),
    emailSent: v.optional(v.boolean()),
    ...timestamps,
  })
    .index("by_user", ["userId"])
    .index("by_legacyId", ["legacyId"]),
});
