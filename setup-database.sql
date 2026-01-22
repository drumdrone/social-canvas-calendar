-- Complete Database Schema Setup for Social Canvas Calendar
-- This script creates all tables needed for the application

-- ========================================
-- 1. SETTINGS TABLES
-- ========================================

-- Platforms table
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

-- Post statuses table
CREATE TABLE IF NOT EXISTS post_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Categories table
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

-- Formats table
CREATE TABLE IF NOT EXISTS formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Pillars table
CREATE TABLE IF NOT EXISTS pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Product lines table
CREATE TABLE IF NOT EXISTS product_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Authors table
CREATE TABLE IF NOT EXISTS authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  initials text NOT NULL CHECK (length(initials) = 3),
  email text,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ========================================
-- 2. RECURRING ACTIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS recurring_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('post', 'task', 'event')),
  title text NOT NULL,
  description text,
  data jsonb DEFAULT '{}'::jsonb,
  color text NOT NULL DEFAULT '#3B82F6',
  frequency text DEFAULT '1x monthly',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ========================================
-- 3. SOCIAL MEDIA POSTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS social_media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  content text,
  platform text NOT NULL,
  image_url text,
  image_url_1 text,
  image_url_2 text,
  image_url_3 text,
  scheduled_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'nezahajeno',
  category text,
  pillar text,
  product_line text,
  author text,
  comments text,
  recurring_action_id uuid REFERENCES recurring_actions(id) ON DELETE SET NULL,
  was_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ========================================
-- 4. STORAGE BUCKET
-- ========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-images', 'social-media-images', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. RLS POLICIES
-- ========================================

-- Platforms policies
CREATE POLICY "Users can view own platforms" ON platforms FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own platforms" ON platforms FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own platforms" ON platforms FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own platforms" ON platforms FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post statuses policies
CREATE POLICY "Users can view own post_statuses" ON post_statuses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own post_statuses" ON post_statuses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own post_statuses" ON post_statuses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own post_statuses" ON post_statuses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Formats policies
CREATE POLICY "Users can view own formats" ON formats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own formats" ON formats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own formats" ON formats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own formats" ON formats FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Pillars policies
CREATE POLICY "Users can view own pillars" ON pillars FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pillars" ON pillars FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pillars" ON pillars FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own pillars" ON pillars FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Product lines policies
CREATE POLICY "Users can view own product_lines" ON product_lines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own product_lines" ON product_lines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own product_lines" ON product_lines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own product_lines" ON product_lines FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Authors policies
CREATE POLICY "Users can view own authors" ON authors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own authors" ON authors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own authors" ON authors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own authors" ON authors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recurring actions policies
CREATE POLICY "Users can view own recurring_actions" ON recurring_actions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring_actions" ON recurring_actions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring_actions" ON recurring_actions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring_actions" ON recurring_actions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Social media posts policies
CREATE POLICY "Users can view their own posts" ON social_media_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own posts" ON social_media_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON social_media_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON social_media_posts FOR DELETE USING (auth.uid() = user_id);

-- Storage policies
CREATE POLICY "Social media images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'social-media-images');
CREATE POLICY "Users can upload their own social media images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own social media images" ON storage.objects FOR UPDATE USING (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own social media images" ON storage.objects FOR DELETE USING (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- 7. INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_platforms_user_id ON platforms(user_id);
CREATE INDEX IF NOT EXISTS idx_post_statuses_user_id ON post_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_formats_user_id ON formats(user_id);
CREATE INDEX IF NOT EXISTS idx_pillars_user_id ON pillars(user_id);
CREATE INDEX IF NOT EXISTS idx_product_lines_user_id ON product_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON authors(user_id);
CREATE INDEX IF NOT EXISTS idx_authors_is_active ON authors(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_actions_user_id ON recurring_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_user_id ON social_media_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_scheduled_date ON social_media_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_status ON social_media_posts(status);

-- ========================================
-- 8. FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9. TRIGGERS
-- ========================================

CREATE TRIGGER update_social_media_posts_updated_at
BEFORE UPDATE ON public.social_media_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platforms_updated_at
BEFORE UPDATE ON platforms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_statuses_updated_at
BEFORE UPDATE ON post_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_formats_updated_at
BEFORE UPDATE ON formats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pillars_updated_at
BEFORE UPDATE ON pillars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_lines_updated_at
BEFORE UPDATE ON product_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_authors_updated_at
BEFORE UPDATE ON authors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_actions_updated_at
BEFORE UPDATE ON recurring_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
