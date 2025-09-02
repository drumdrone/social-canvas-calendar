-- Add comments column to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN IF NOT EXISTS comments text;