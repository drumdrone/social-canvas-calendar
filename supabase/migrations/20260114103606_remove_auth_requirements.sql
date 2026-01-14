/*
  # Remove authentication requirements

  This migration removes authentication requirements from all tables
  to allow public access without login.

  ## Changes
  
  1. Drop existing RLS policies that require authentication
  2. Create new policies allowing public access to all operations
  3. Make user_id columns nullable and set default values
  
  ## Security Note
  
  This allows anyone to access and modify all data in the application.
  This is intended for single-user or demo applications.
*/

-- Drop existing policies for recurring_actions
DROP POLICY IF EXISTS "Users can view own recurring actions" ON public.recurring_actions;
DROP POLICY IF EXISTS "Users can insert own recurring actions" ON public.recurring_actions;
DROP POLICY IF EXISTS "Users can update own recurring actions" ON public.recurring_actions;
DROP POLICY IF EXISTS "Users can delete own recurring actions" ON public.recurring_actions;

-- Drop existing policies for social_media_posts
DROP POLICY IF EXISTS "Users can view own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.social_media_posts;

-- Drop existing policies for action_templates
DROP POLICY IF EXISTS "Users can read own action templates" ON public.action_templates;
DROP POLICY IF EXISTS "Users can insert own action templates" ON public.action_templates;
DROP POLICY IF EXISTS "Users can update own action templates" ON public.action_templates;
DROP POLICY IF EXISTS "Users can delete own action templates" ON public.action_templates;

-- Make user_id nullable in all tables
ALTER TABLE public.recurring_actions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.social_media_posts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.action_templates ALTER COLUMN user_id DROP NOT NULL;

-- Create public access policies for recurring_actions
CREATE POLICY "Allow public read access"
  ON public.recurring_actions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON public.recurring_actions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access"
  ON public.recurring_actions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access"
  ON public.recurring_actions
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Create public access policies for social_media_posts
CREATE POLICY "Allow public read access"
  ON public.social_media_posts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON public.social_media_posts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access"
  ON public.social_media_posts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access"
  ON public.social_media_posts
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Create public access policies for action_templates
CREATE POLICY "Allow public read access"
  ON public.action_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON public.action_templates
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access"
  ON public.action_templates
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access"
  ON public.action_templates
  FOR DELETE
  TO anon, authenticated
  USING (true);