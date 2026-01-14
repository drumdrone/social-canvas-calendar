/*
  # Restore Authentication Requirements

  1. Changes
    - Restore RLS policies to require authentication
    - Remove public access policies
    - Restore user_id requirement for all tables

  2. Security
    - Enable RLS on all tables
    - Require authenticated users for all operations
    - Ensure data isolation by user_id
*/

-- Recurring Actions: Restore auth requirements
DROP POLICY IF EXISTS "Allow public read access" ON recurring_actions;
DROP POLICY IF EXISTS "Allow public insert access" ON recurring_actions;
DROP POLICY IF EXISTS "Allow public update access" ON recurring_actions;
DROP POLICY IF EXISTS "Allow public delete access" ON recurring_actions;

CREATE POLICY "Users can view own recurring actions"
  ON recurring_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recurring actions"
  ON recurring_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring actions"
  ON recurring_actions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring actions"
  ON recurring_actions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Social Media Posts: Restore auth requirements
DROP POLICY IF EXISTS "Allow public read access" ON social_media_posts;
DROP POLICY IF EXISTS "Allow public insert access" ON social_media_posts;
DROP POLICY IF EXISTS "Allow public update access" ON social_media_posts;
DROP POLICY IF EXISTS "Allow public delete access" ON social_media_posts;

CREATE POLICY "Users can view own posts"
  ON social_media_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own posts"
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

-- Action Templates: Restore auth requirements
DROP POLICY IF EXISTS "Allow public read access" ON action_templates;
DROP POLICY IF EXISTS "Allow public insert access" ON action_templates;
DROP POLICY IF EXISTS "Allow public update access" ON action_templates;
DROP POLICY IF EXISTS "Allow public delete access" ON action_templates;

CREATE POLICY "Users can view own templates"
  ON action_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON action_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON action_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON action_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
