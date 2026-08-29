/*
  # Fix missing data: open RLS for all user-scoped tables

  After PR #21 added auto-login as admin@socialcanvas.app, the Supabase auth
  session uses a NEW user UUID. Existing rows in these tables were created by
  a previous admin user, so RLS policies of the form `auth.uid() = user_id`
  hide all legacy data — it looks "missing" in the UI even though the rows
  still exist in the database.

  social_media_posts was already opened up in 20260225_fix_rls_allow_anon.sql.
  This migration applies the same fix to every other user-scoped table the app
  reads on the calendar / plan / settings pages.

  Strategy:
    - Drop existing per-user policies
    - Allow SELECT to anon + authenticated unconditionally (data is shared
      behind a single-password gate; ownership is not enforced at the app
      level)
    - Allow INSERT/UPDATE/DELETE to anon + authenticated regardless of
      user_id, mirroring the social_media_posts policy
    - Make user_id nullable so inserts work even when the auto-login session
      hasn't completed
*/

-- ============================================================
-- Helper: drop legacy per-user policies and create open ones
-- ============================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'platforms',
    'post_statuses',
    'categories',
    'formats',
    'pillars',
    'product_lines',
    'authors',
    'recurring_actions',
    'action_templates'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip silently if the table doesn't exist in this environment
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    -- Drop every existing policy on the table
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;

    -- Make user_id nullable if the column exists and is currently NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id DROP NOT NULL', t);
    END IF;

    -- Create open policies (anon + authenticated, no user_id check)
    EXECUTE format($f$
      CREATE POLICY "Allow viewing all %1$s"
        ON %1$I FOR SELECT
        TO anon, authenticated
        USING (true)
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Allow inserting %1$s"
        ON %1$I FOR INSERT
        TO anon, authenticated
        WITH CHECK (true)
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Allow updating %1$s"
        ON %1$I FOR UPDATE
        TO anon, authenticated
        USING (true)
        WITH CHECK (true)
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Allow deleting %1$s"
        ON %1$I FOR DELETE
        TO anon, authenticated
        USING (true)
    $f$, t);
  END LOOP;
END $$;
