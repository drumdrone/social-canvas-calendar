/*
  # Create Settings Tables

  1. New Tables
    - `platforms` - Social media platforms
    - `post_statuses` - Status options for posts
    - `categories` - Content categories
    - `formats` - Content formats
    - `pillars` - Content pillars
    - `product_lines` - Product line categories

  2. Common Columns
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `name` (text)
    - `color` (text)
    - `is_active` (boolean)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Share2',
  color text NOT NULL DEFAULT '#1877F2',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS post_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  format text NOT NULL DEFAULT 'text',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS product_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platforms" ON platforms FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own platforms" ON platforms FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own platforms" ON platforms FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own platforms" ON platforms FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own post_statuses" ON post_statuses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own post_statuses" ON post_statuses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own post_statuses" ON post_statuses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own post_statuses" ON post_statuses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own categories" ON categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own formats" ON formats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own formats" ON formats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own formats" ON formats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own formats" ON formats FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own pillars" ON pillars FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pillars" ON pillars FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pillars" ON pillars FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own pillars" ON pillars FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own product_lines" ON product_lines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own product_lines" ON product_lines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own product_lines" ON product_lines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own product_lines" ON product_lines FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_platforms_user_id ON platforms(user_id);
CREATE INDEX IF NOT EXISTS idx_post_statuses_user_id ON post_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_formats_user_id ON formats(user_id);
CREATE INDEX IF NOT EXISTS idx_pillars_user_id ON pillars(user_id);
CREATE INDEX IF NOT EXISTS idx_product_lines_user_id ON product_lines(user_id);