/*
  # Create social_media_posts table with recurring actions support

  1. New Tables
    - `social_media_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `recurring_action_id` (uuid, foreign key to recurring_actions) - links post to recurring action
      - `title` (text) - post title/nadpis
      - `content` (text) - post content
      - `platform` (text) - social platform
      - `image_url` (text) - optional image
      - `scheduled_date` (timestamptz) - when to post
      - `status` (text) - draft/published/scheduled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `social_media_posts` table
    - Add policies for authenticated users to manage their own posts
*/

CREATE TABLE IF NOT EXISTS social_media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_action_id uuid REFERENCES recurring_actions(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  content text DEFAULT '',
  platform text DEFAULT 'facebook',
  image_url text,
  scheduled_date timestamptz NOT NULL DEFAULT now(),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own posts"
  ON social_media_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON social_media_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON social_media_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON social_media_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_social_media_posts_user ON social_media_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_recurring_action ON social_media_posts(recurring_action_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_scheduled_date ON social_media_posts(scheduled_date);