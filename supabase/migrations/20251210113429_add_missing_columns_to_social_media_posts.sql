/*
  # Add Missing Columns to social_media_posts Table

  1. New Columns
    - `category` (text) - Post category/format
    - `image_url_1` (text) - First image URL
    - `image_url_2` (text) - Second image URL  
    - `image_url_3` (text) - Third image URL
    - `pillar` (text) - Content pillar
    - `product_line` (text) - Product line
    - `author` (text) - Post author initials
    - `comments` (text) - Internal team comments
  
  2. Notes
    - All columns are nullable to support existing data
    - `image_url` column kept for backward compatibility
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'category'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'image_url_1'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN image_url_1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'image_url_2'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN image_url_2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'image_url_3'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN image_url_3 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'pillar'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN pillar text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'product_line'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN product_line text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'author'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN author text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'comments'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN comments text;
  END IF;
END $$;
