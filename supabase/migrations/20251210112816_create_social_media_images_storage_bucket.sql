/*
  # Create Storage Bucket for Social Media Images

  1. New Storage Bucket
    - Creates `social-media-images` bucket for storing post images
    - Public bucket accessible to authenticated users
  
  2. Security
    - Enable RLS on storage.objects
    - Authenticated users can upload images
    - Authenticated users can read their own images
    - Authenticated users can delete their own images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-images', 'social-media-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media-images');

DROP POLICY IF EXISTS "Users can view images" ON storage.objects;
CREATE POLICY "Users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'social-media-images');

DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'social-media-images' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'social-media-images' AND owner = auth.uid());
