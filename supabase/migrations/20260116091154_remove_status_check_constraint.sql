/*
  # Remove status CHECK constraint

  1. Changes
    - Remove the CHECK constraint on `social_media_posts.status` column
    - This allows using custom status values from the `post_statuses` table
    
  2. Notes
    - The CHECK constraint was limiting status to only: 'draft', 'published', 'scheduled'
    - User has custom Czech status values in `post_statuses` table
    - Removing constraint enables full flexibility with status management
*/

ALTER TABLE social_media_posts 
DROP CONSTRAINT IF EXISTS social_media_posts_status_check;
