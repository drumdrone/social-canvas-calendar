/*
  # Fix RLS policies for legacy posts
  
  1. Changes
    - Update RLS policies to allow operations on posts with NULL user_id (legacy posts)
    - These are posts created before authentication was implemented
    - Authenticated users can now edit/delete legacy posts as well as their own posts
  
  2. Security
    - Still requires authentication
    - Users can only work with posts that are either:
      - Owned by them (user_id matches auth.uid())
      - Legacy posts (user_id is NULL)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own posts" ON social_media_posts;
DROP POLICY IF EXISTS "Users can create own posts" ON social_media_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON social_media_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON social_media_posts;

-- Create new policies that handle legacy posts
CREATE POLICY "Users can view own and legacy posts"
  ON social_media_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create own posts"
  ON social_media_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own and legacy posts"
  ON social_media_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own and legacy posts"
  ON social_media_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);
