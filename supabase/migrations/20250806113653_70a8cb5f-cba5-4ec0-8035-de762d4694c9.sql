-- Add category column to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN category TEXT NOT NULL DEFAULT 'Image' 
CHECK (category IN ('Video', 'Image', 'Carousel'));