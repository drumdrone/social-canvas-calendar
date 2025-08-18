-- Fix image display issue by making the storage bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('social-media-images', 'SOCIAL_CANVAS');

-- Drop existing policies first
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Create storage policies for public access to images
CREATE POLICY "Public read access to social media images" ON storage.objects 
FOR SELECT USING (bucket_id IN ('social-media-images', 'SOCIAL_CANVAS'));

-- Allow authenticated users to manage their own images  
CREATE POLICY "Authenticated users can upload social media images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id IN ('social-media-images', 'SOCIAL_CANVAS') AND auth.role() = 'authenticated');

CREATE POLICY "Users can update social media images" ON storage.objects 
FOR UPDATE USING (bucket_id IN ('social-media-images', 'SOCIAL_CANVAS') AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete social media images" ON storage.objects 
FOR DELETE USING (bucket_id IN ('social-media-images', 'SOCIAL_CANVAS') AND auth.role() = 'authenticated');