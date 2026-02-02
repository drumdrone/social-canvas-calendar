/*
  # Fix Storage Policies for Public Access

  This migration fixes the storage policies to allow public access to images,
  since the bucket is already set as public.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view images" ON storage.objects;

-- Create new policy for public access
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'social-media-images');

-- Keep upload restricted to authenticated users
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media-images');

-- Keep update/delete restricted to owners
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'social-media-images' AND (owner = auth.uid() OR owner IS NULL));

DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'social-media-images' AND (owner = auth.uid() OR owner IS NULL));
