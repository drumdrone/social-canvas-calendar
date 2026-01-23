-- Zkontrolujte, zda existují triggery a funkce

-- 1. Zkontrolujte trigger pro vytváření notifikací
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_mention_create_notification';

-- 2. Zkontrolujte funkci pro vytváření notifikací
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'create_mention_notification'
  AND routine_schema = 'public';

-- 3. Pokud trigger neexistuje, spusťte tuto migraci:
/*
-- Vytvořte funkci pro automatické vytváření notifikací
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, comment_id, post_id, is_read, email_sent)
  SELECT
    NEW.mentioned_user_id,
    NEW.comment_id,
    c.post_id,
    false,
    false
  FROM comments c
  WHERE c.id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vytvořte trigger
DROP TRIGGER IF EXISTS on_mention_create_notification ON comment_mentions;
CREATE TRIGGER on_mention_create_notification
  AFTER INSERT ON comment_mentions
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();
*/

-- 4. Test - zkontrolujte poslední mentions a notifikace
SELECT
  cm.id as mention_id,
  cm.comment_id,
  cm.mentioned_user_id,
  cm.created_at as mention_created,
  u.email as mentioned_user_email,
  (SELECT COUNT(*) FROM notifications WHERE comment_id = cm.comment_id) as notification_count
FROM comment_mentions cm
LEFT JOIN user_profiles u ON cm.mentioned_user_id = u.id
ORDER BY cm.created_at DESC
LIMIT 5;
