-- Temporarily disable RLS for simple hardcoded auth
-- We'll use a fixed user_id for all posts since we only have one user

ALTER TABLE public.social_media_posts DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.social_media_posts;