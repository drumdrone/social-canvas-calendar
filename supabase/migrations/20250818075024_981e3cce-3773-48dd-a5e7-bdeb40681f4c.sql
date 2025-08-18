-- Fix image display issue by making the storage bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('social-media-images', 'SOCIAL_CANVAS');

-- Create storage policies for public access to images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'social-media-images');

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'SOCIAL_CANVAS');

-- Allow authenticated users to insert/update/delete their own images
CREATE POLICY "Authenticated users can upload images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'social-media-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'social-media-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own images" ON storage.objects 
FOR DELETE USING (bucket_id = 'social-media-images' AND auth.role() = 'authenticated');