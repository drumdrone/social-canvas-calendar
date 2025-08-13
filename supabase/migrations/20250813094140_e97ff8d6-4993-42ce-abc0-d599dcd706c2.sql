-- Ensure default data exists on every app load
-- This will only insert if the data doesn't already exist

-- Default platforms
INSERT INTO public.platforms (name, icon_name, color, is_active) 
SELECT 'facebook', 'Facebook', '#1877F2', true
WHERE NOT EXISTS (SELECT 1 FROM public.platforms WHERE name = 'facebook');

INSERT INTO public.platforms (name, icon_name, color, is_active) 
SELECT 'instagram', 'Instagram', '#E4405F', true
WHERE NOT EXISTS (SELECT 1 FROM public.platforms WHERE name = 'instagram');

INSERT INTO public.platforms (name, icon_name, color, is_active) 
SELECT 'twitter', 'Twitter', '#1DA1F2', true
WHERE NOT EXISTS (SELECT 1 FROM public.platforms WHERE name = 'twitter');

INSERT INTO public.platforms (name, icon_name, color, is_active) 
SELECT 'linkedin', 'Linkedin', '#0077B5', true
WHERE NOT EXISTS (SELECT 1 FROM public.platforms WHERE name = 'linkedin');

INSERT INTO public.platforms (name, icon_name, color, is_active) 
SELECT 'youtube', 'Youtube', '#FF0000', true
WHERE NOT EXISTS (SELECT 1 FROM public.platforms WHERE name = 'youtube');

-- Default post statuses
INSERT INTO public.post_statuses (name, color, is_active) 
SELECT 'draft', '#94A3B8', true
WHERE NOT EXISTS (SELECT 1 FROM public.post_statuses WHERE name = 'draft');

INSERT INTO public.post_statuses (name, color, is_active) 
SELECT 'scheduled', '#3B82F6', true
WHERE NOT EXISTS (SELECT 1 FROM public.post_statuses WHERE name = 'scheduled');

INSERT INTO public.post_statuses (name, color, is_active) 
SELECT 'published', '#10B981', true
WHERE NOT EXISTS (SELECT 1 FROM public.post_statuses WHERE name = 'published');

-- Default categories
INSERT INTO public.categories (name, color, format, is_active) 
SELECT 'Image', '#8B5CF6', 'image', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Image');

INSERT INTO public.categories (name, color, format, is_active) 
SELECT 'Video', '#EF4444', 'video', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Video');

INSERT INTO public.categories (name, color, format, is_active) 
SELECT 'Text', '#6B7280', 'text', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Text');

-- Default pillars
INSERT INTO public.pillars (name, color, is_active) 
SELECT 'Educational', '#3B82F6', true
WHERE NOT EXISTS (SELECT 1 FROM public.pillars WHERE name = 'Educational');

INSERT INTO public.pillars (name, color, is_active) 
SELECT 'Entertainment', '#F59E0B', true
WHERE NOT EXISTS (SELECT 1 FROM public.pillars WHERE name = 'Entertainment');

INSERT INTO public.pillars (name, color, is_active) 
SELECT 'Promotional', '#10B981', true
WHERE NOT EXISTS (SELECT 1 FROM public.pillars WHERE name = 'Promotional');

-- Default product lines
INSERT INTO public.product_lines (name, color, is_active) 
SELECT 'Main Product', '#8B5CF6', true
WHERE NOT EXISTS (SELECT 1 FROM public.product_lines WHERE name = 'Main Product');

INSERT INTO public.product_lines (name, color, is_active) 
SELECT 'Services', '#EF4444', true
WHERE NOT EXISTS (SELECT 1 FROM public.product_lines WHERE name = 'Services');

-- Default formats
INSERT INTO public.formats (name, color, is_active) 
SELECT 'Standard', '#3B82F6', true
WHERE NOT EXISTS (SELECT 1 FROM public.formats WHERE name = 'Standard');

INSERT INTO public.formats (name, color, is_active) 
SELECT 'Story', '#F59E0B', true
WHERE NOT EXISTS (SELECT 1 FROM public.formats WHERE name = 'Story');

INSERT INTO public.formats (name, color, is_active) 
SELECT 'Reel', '#EF4444', true
WHERE NOT EXISTS (SELECT 1 FROM public.formats WHERE name = 'Reel');