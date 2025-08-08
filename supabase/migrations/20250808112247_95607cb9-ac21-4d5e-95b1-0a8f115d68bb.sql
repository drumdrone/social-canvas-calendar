-- Add pillar and product_line columns to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN pillar TEXT,
ADD COLUMN product_line TEXT;