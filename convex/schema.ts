import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Schema mirrors the former Supabase (Postgres) tables so the app data maps 1:1.
 * Timestamps stay ISO strings (`created_at` / `updated_at`) exactly like before,
 * document ids replace the former uuid `id` column.
 */

// Shared shape of the simple lookup tables edited in Settings.
const lookupFields = {
  name: v.string(),
  color: v.string(),
  is_active: v.boolean(),
  created_at: v.string(),
  updated_at: v.string(),
};

export default defineSchema({
  social_media_posts: defineTable({
    title: v.string(),
    content: v.optional(v.union(v.string(), v.null())),
    platform: v.string(),
    status: v.string(),
    category: v.string(),
    scheduled_date: v.string(),
    author: v.optional(v.union(v.string(), v.null())),
    pillar: v.optional(v.union(v.string(), v.null())),
    product_line: v.optional(v.union(v.string(), v.null())),
    comments: v.optional(v.union(v.string(), v.null())),
    image_url: v.optional(v.union(v.string(), v.null())),
    image_url_1: v.optional(v.union(v.string(), v.null())),
    image_url_2: v.optional(v.union(v.string(), v.null())),
    image_url_3: v.optional(v.union(v.string(), v.null())),
    recurring_action_id: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_scheduled_date', ['scheduled_date'])
    .index('by_recurring_action', ['recurring_action_id']),

  post_versions: defineTable({
    post_id: v.string(),
    version_number: v.number(),
    backup_reason: v.optional(v.union(v.string(), v.null())),
    title: v.string(),
    content: v.optional(v.union(v.string(), v.null())),
    platform: v.string(),
    status: v.string(),
    category: v.string(),
    scheduled_date: v.string(),
    pillar: v.optional(v.union(v.string(), v.null())),
    product_line: v.optional(v.union(v.string(), v.null())),
    image_url: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
  }).index('by_post', ['post_id']),

  platforms: defineTable({ ...lookupFields, icon_name: v.optional(v.string()) }).index(
    'by_name',
    ['name']
  ),
  post_statuses: defineTable(lookupFields).index('by_name', ['name']),
  categories: defineTable({
    ...lookupFields,
    format: v.optional(v.union(v.string(), v.null())),
  }).index('by_name', ['name']),
  pillars: defineTable(lookupFields).index('by_name', ['name']),
  product_lines: defineTable(lookupFields).index('by_name', ['name']),
  formats: defineTable(lookupFields).index('by_name', ['name']),
  authors: defineTable({
    ...lookupFields,
    initials: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
  }).index('by_name', ['name']),

  recurring_actions: defineTable({
    action_type: v.string(),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    frequency: v.optional(v.union(v.string(), v.null())),
    color: v.optional(v.union(v.string(), v.null())),
    order_index: v.optional(v.number()),
    data: v.optional(v.any()),
    created_at: v.string(),
    updated_at: v.string(),
  }).index('by_order', ['order_index']),

  plan_sections: defineTable({
    section_order: v.number(),
    section_data: v.any(),
    created_at: v.string(),
    updated_at: v.string(),
  }).index('by_order', ['section_order']),

  mood_board_items: defineTable({
    napad: v.string(),
    popis: v.string(),
    text: v.string(),
    format: v.string(),
    image_prompt: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  }),

  mood_board_images: defineTable({
    url: v.string(),
    storage_id: v.optional(v.id('_storage')),
    position_x: v.number(),
    position_y: v.number(),
    width: v.number(),
    height: v.number(),
    created_at: v.string(),
    updated_at: v.string(),
  }),

  mood_board_notes: defineTable({
    content: v.string(),
    color: v.string(),
    position_x: v.number(),
    position_y: v.number(),
    created_at: v.string(),
    updated_at: v.string(),
  }),

  /** Replaces the `media-gallery` storage bucket listing. */
  media_files: defineTable({
    name: v.string(),
    storage_id: v.id('_storage'),
    url: v.string(),
    size: v.optional(v.number()),
    content_type: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
  }).index('by_created_at', ['created_at']),

  /** Replaces the `backups` storage bucket (JSON snapshots live in file storage). */
  backups: defineTable({
    name: v.string(),
    storage_id: v.id('_storage'),
    size: v.optional(v.number()),
    created_at: v.string(),
  }).index('by_created_at', ['created_at']),
});
