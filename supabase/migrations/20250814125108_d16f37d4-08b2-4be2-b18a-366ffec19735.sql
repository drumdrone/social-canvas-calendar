-- Create post versions table for backup functionality
CREATE TABLE public.post_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  content text,
  platform text NOT NULL,
  category text NOT NULL DEFAULT 'Image',
  pillar text,
  product_line text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_date timestamp with time zone NOT NULL,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  backup_reason text DEFAULT 'manual_backup',
  UNIQUE(post_id, version_number)
);

-- Enable RLS on post versions
ALTER TABLE public.post_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for post versions
CREATE POLICY "Users can view their own post versions" 
ON public.post_versions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own post versions" 
ON public.post_versions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own post versions" 
ON public.post_versions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own post versions" 
ON public.post_versions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Function to create a backup version of a post
CREATE OR REPLACE FUNCTION public.create_post_backup(
  p_post_id uuid,
  p_backup_reason text DEFAULT 'manual_backup'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_post_record social_media_posts%ROWTYPE;
  v_next_version integer;
  v_backup_id uuid;
BEGIN
  -- Get the current post data
  SELECT * INTO v_post_record
  FROM public.social_media_posts 
  WHERE id = p_post_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found or access denied';
  END IF;
  
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_next_version
  FROM public.post_versions 
  WHERE post_id = p_post_id;
  
  -- Create the backup version
  INSERT INTO public.post_versions (
    post_id, user_id, version_number, title, content, platform,
    category, pillar, product_line, status, scheduled_date, 
    image_url, backup_reason
  ) VALUES (
    v_post_record.id, v_post_record.user_id, v_next_version,
    v_post_record.title, v_post_record.content, v_post_record.platform,
    v_post_record.category, v_post_record.pillar, v_post_record.product_line,
    v_post_record.status, v_post_record.scheduled_date, v_post_record.image_url,
    p_backup_reason
  ) RETURNING id INTO v_backup_id;
  
  RETURN v_backup_id;
END;
$$;

-- Function to restore a post from a backup version
CREATE OR REPLACE FUNCTION public.restore_post_from_backup(
  p_post_id uuid,
  p_version_number integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_version_record post_versions%ROWTYPE;
BEGIN
  -- Get the version data
  SELECT * INTO v_version_record
  FROM public.post_versions 
  WHERE post_id = p_post_id 
    AND version_number = p_version_number 
    AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found or access denied';
  END IF;
  
  -- Create a backup of current state before restoring
  PERFORM public.create_post_backup(p_post_id, 'auto_backup_before_restore');
  
  -- Update the post with the backup data
  UPDATE public.social_media_posts 
  SET 
    title = v_version_record.title,
    content = v_version_record.content,
    platform = v_version_record.platform,
    category = v_version_record.category,
    pillar = v_version_record.pillar,
    product_line = v_version_record.product_line,
    status = v_version_record.status,
    scheduled_date = v_version_record.scheduled_date,
    image_url = v_version_record.image_url,
    updated_at = now()
  WHERE id = p_post_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Trigger function to auto-backup posts before updates
CREATE OR REPLACE FUNCTION public.auto_backup_post_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create backup if there are actual changes
  IF (OLD.title, OLD.content, OLD.platform, OLD.category, OLD.pillar, 
      OLD.product_line, OLD.status, OLD.scheduled_date, OLD.image_url) IS DISTINCT FROM
     (NEW.title, NEW.content, NEW.platform, NEW.category, NEW.pillar, 
      NEW.product_line, NEW.status, NEW.scheduled_date, NEW.image_url) THEN
    
    -- Create backup with current user context
    PERFORM public.create_post_backup(OLD.id, 'auto_backup_on_update');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic backups
CREATE TRIGGER trigger_auto_backup_posts
  BEFORE UPDATE ON public.social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_backup_post_on_update();

-- Function to get post version history
CREATE OR REPLACE FUNCTION public.get_post_versions(p_post_id uuid)
RETURNS TABLE (
  version_id uuid,
  version_number integer,
  title text,
  content text,
  platform text,
  category text,
  pillar text,
  product_line text,
  status text,
  scheduled_date timestamp with time zone,
  image_url text,
  created_at timestamp with time zone,
  backup_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id, pv.version_number, pv.title, pv.content, pv.platform,
    pv.category, pv.pillar, pv.product_line, pv.status, 
    pv.scheduled_date, pv.image_url, pv.created_at, pv.backup_reason
  FROM public.post_versions pv
  WHERE pv.post_id = p_post_id AND pv.user_id = auth.uid()
  ORDER BY pv.version_number DESC;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_post_versions_post_id ON public.post_versions(post_id);
CREATE INDEX idx_post_versions_user_id ON public.post_versions(user_id);
CREATE INDEX idx_post_versions_created_at ON public.post_versions(created_at DESC);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_post_backup(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_post_from_backup(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_versions(uuid) TO authenticated;