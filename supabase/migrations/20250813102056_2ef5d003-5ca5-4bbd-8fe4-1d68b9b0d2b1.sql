-- Recovery Plan Step 1: Fix database security and seed data

-- Fix function search paths (from security scan warnings)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_auth_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

-- Seed default platforms data
INSERT INTO public.platforms (name, icon_name, color, is_active) VALUES
('Facebook', 'facebook', '#1877F2', true),
('Instagram', 'instagram', '#E4405F', true),
('Twitter', 'twitter', '#1DA1F2', true),
('LinkedIn', 'linkedin', '#0A66C2', true),
('YouTube', 'youtube', '#FF0000', true),
('TikTok', 'music', '#000000', true),
('Pinterest', 'pinterest', '#BD081C', true)
ON CONFLICT (name) DO NOTHING;

-- Seed default statuses
INSERT INTO public.post_statuses (name, color, is_active) VALUES
('Draft', '#94A3B8', true),
('Ready', '#22C55E', true),
('Scheduled', '#3B82F6', true),
('Published', '#10B981', true),
('Archived', '#6B7280', true)
ON CONFLICT (name) DO NOTHING;

-- Seed default categories
INSERT INTO public.categories (name, color, is_active) VALUES
('Image', '#3B82F6', true),
('Video', '#EF4444', true),
('Story', '#F59E0B', true),
('Carousel', '#8B5CF6', true),
('Reel', '#EC4899', true),
('Text', '#10B981', true)
ON CONFLICT (name) DO NOTHING;

-- Seed default formats
INSERT INTO public.formats (name, color, is_active) VALUES
('Square', '#3B82F6', true),
('Portrait', '#EF4444', true),
('Landscape', '#F59E0B', true),
('Story', '#8B5CF6', true),
('Cover', '#EC4899', true)
ON CONFLICT (name) DO NOTHING;

-- Seed default pillars
INSERT INTO public.pillars (name, color, is_active) VALUES
('Education', '#3B82F6', true),
('Entertainment', '#EF4444', true),
('Inspiration', '#F59E0B', true),
('Behind the Scenes', '#8B5CF6', true),
('Product Showcase', '#EC4899', true),
('Community', '#10B981', true)
ON CONFLICT (name) DO NOTHING;

-- Seed default product lines
INSERT INTO public.product_lines (name, color, is_active) VALUES
('Main Product', '#3B82F6', true),
('Premium Line', '#EF4444', true),
('Budget Line', '#F59E0B', true),
('Limited Edition', '#8B5CF6', true),
('Seasonal', '#EC4899', true)
ON CONFLICT (name) DO NOTHING;