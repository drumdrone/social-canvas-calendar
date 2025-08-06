-- Fix storage policies to allow uploads without authentication
-- Since we're using simple hardcoded auth, we need to disable RLS on storage

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;

-- Create new policies that allow anyone to upload and access
CREATE POLICY "Allow anyone to upload images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'social-media-images');

CREATE POLICY "Allow anyone to view images" ON storage.objects  
FOR SELECT USING (bucket_id = 'social-media-images');

CREATE POLICY "Allow anyone to update images" ON storage.objects
FOR UPDATE USING (bucket_id = 'social-media-images');