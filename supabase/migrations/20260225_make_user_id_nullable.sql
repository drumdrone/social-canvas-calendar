/*
  # Make user_id nullable in social_media_posts

  The column was created as NOT NULL, but the app uses a shared admin account
  for Supabase auth. When the auth session fails or expires, ensureSupabaseSession()
  returns null, and the insert fails with a NOT NULL constraint violation.

  This migration makes user_id nullable so posts can be saved even when
  the Supabase auth session is unavailable. The RLS policies already handle
  NULL user_id (see 20260225_fix_rls_allow_anon.sql).

  Changes:
  - Drop NOT NULL constraint on user_id
  - Update FK constraint to SET NULL on delete (instead of CASCADE)
*/

-- Make user_id nullable
ALTER TABLE social_media_posts ALTER COLUMN user_id DROP NOT NULL;

-- Update FK to SET NULL instead of CASCADE (safer for nullable column)
ALTER TABLE social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_user_id_fkey;
ALTER TABLE social_media_posts
  ADD CONSTRAINT social_media_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
