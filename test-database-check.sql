-- ============================================
-- KONTROLA DATABÁZE PRO EMAIL NOTIFIKACE
-- ============================================

-- 1. Zkontrolujte, zda existují všechny tabulky
SELECT
  table_name,
  CASE
    WHEN table_name IN ('user_profiles', 'comments', 'comment_mentions', 'notifications')
    THEN '✅ OK'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'comments', 'comment_mentions', 'notifications')
ORDER BY table_name;

-- 2. Zkontrolujte uživatele
SELECT
  id,
  email,
  full_name,
  notification_enabled,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- 3. Zkontrolujte, zda existuje trigger pro notifikace
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('create_mention_notification', 'on_notification_created');

-- 4. Počet existujících komentářů
SELECT COUNT(*) as total_comments FROM comments;

-- 5. Počet existujících notifikací
SELECT COUNT(*) as total_notifications FROM notifications;

-- 6. Zkontrolujte poslední komentáře (pokud existují)
SELECT
  c.id,
  c.content,
  c.created_at,
  u.full_name as author_name,
  p.title as post_title
FROM comments c
LEFT JOIN user_profiles u ON c.author_id = u.id
LEFT JOIN social_media_posts p ON c.post_id = p.id
ORDER BY c.created_at DESC
LIMIT 5;
