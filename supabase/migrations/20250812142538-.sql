-- Relax RLS to restore visibility and edits without Supabase auth (temporary)
-- Plan: Replace user-scoped policies on plan_sections and social_media_posts with permissive public policies.

-- plan_sections
ALTER TABLE public.plan_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own plan_sections" ON public.plan_sections;
DROP POLICY IF EXISTS "Users can insert own plan_sections" ON public.plan_sections;
DROP POLICY IF EXISTS "Users can update own plan_sections" ON public.plan_sections;
DROP POLICY IF EXISTS "Users can delete own plan_sections" ON public.plan_sections;

-- Public policies (TEMPORARY) - allow all operations
CREATE POLICY "Public read plan_sections"
  ON public.plan_sections
  FOR SELECT
  USING (true);

CREATE POLICY "Public insert plan_sections"
  ON public.plan_sections
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update plan_sections"
  ON public.plan_sections
  FOR UPDATE
  USING (true);

CREATE POLICY "Public delete plan_sections"
  ON public.plan_sections
  FOR DELETE
  USING (true);

-- social_media_posts
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.social_media_posts;

-- Public policies (TEMPORARY) - allow all operations
CREATE POLICY "Public read posts"
  ON public.social_media_posts
  FOR SELECT
  USING (true);

CREATE POLICY "Public insert posts"
  ON public.social_media_posts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update posts"
  ON public.social_media_posts
  FOR UPDATE
  USING (true);

CREATE POLICY "Public delete posts"
  ON public.social_media_posts
  FOR DELETE
  USING (true);
