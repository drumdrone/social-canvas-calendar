/*
  # Fix Storage RLS Policies for Image Upload

  The image upload fails with "new row violates row-level security policy"
  because multiple conflicting RLS policies accumulated across migrations.

  This migration:
  1. Drops ALL existing storage.objects policies to start clean
  2. Ensures both storage buckets exist and are public
  3. Creates simple, correct policies matching the actual upload paths:
     - social-media-images: code uploads to `public/{filename}`
     - media-gallery: code uploads to `{filename}`
     - backups: code uploads to `manual/{filename}`
*/

-- =============================================
-- 1. DROP ALL EXISTING STORAGE POLICIES
-- =============================================

-- Policies from migration 20250806105912
DROP POLICY IF EXISTS "Allow anyone to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to view images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to update images" ON storage.objects;

-- Policies from migration 20250818075024
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Policies from migration 20250818075419
DROP POLICY IF EXISTS "Public read access to social media images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload social media images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update social media images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete social media images" ON storage.objects;

-- Policies from migration 20250828132944 (media-gallery)
DROP POLICY IF EXISTS "Media gallery images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to media gallery" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their media gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their media gallery files" ON storage.objects;

-- Policies from migration 20251210112816
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Policies from fix-storage-bucket.sql (may have been applied manually)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete images" ON storage.objects;

-- Policies from setup-database.sql (may have been applied manually)
DROP POLICY IF EXISTS "Social media images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own social media images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own social media images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own social media images" ON storage.objects;

-- =============================================
-- 2. ENSURE BUCKETS EXIST
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media-images',
  'social-media-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

INSERT INTO storage.buckets (id, name, public)
VALUES ('media-gallery', 'media-gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 3. CREATE CLEAN POLICIES FOR social-media-images
-- =============================================

-- Public read: bucket is public, anyone can view
CREATE POLICY "smi_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-media-images');

-- Authenticated users can upload images
CREATE POLICY "smi_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media-images');

-- Authenticated users can update images
CREATE POLICY "smi_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'social-media-images');

-- Authenticated users can delete images
CREATE POLICY "smi_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'social-media-images');

-- =============================================
-- 4. CREATE CLEAN POLICIES FOR media-gallery
-- =============================================

-- Public read: bucket is public, anyone can view
CREATE POLICY "mg_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-gallery');

-- Authenticated users can upload to media gallery
CREATE POLICY "mg_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media-gallery');

-- Authenticated users can update media gallery files
CREATE POLICY "mg_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media-gallery');

-- Authenticated users can delete media gallery files
CREATE POLICY "mg_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media-gallery');

-- =============================================
-- 5. CREATE CLEAN POLICIES FOR backups
-- =============================================

-- Only authenticated users can read their backups
CREATE POLICY "backups_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'backups');

-- Authenticated users can create backups
CREATE POLICY "backups_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backups');

-- Authenticated users can delete backups
CREATE POLICY "backups_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'backups');
