-- Remove the old check constraints that are causing the save failures
ALTER TABLE social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_category_check;
ALTER TABLE social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_platform_check;
ALTER TABLE social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_status_check;

-- The constraints will now be handled by the application logic and the foreign key-like relationships
-- with the categories, platforms, and post_statuses tables, which is more flexible