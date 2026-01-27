-- DŮLEŽITÉ: Tento skript převede VŠECHNA data na účet honza.hrodek@gmail.com
-- Spusťte POUZE POKUD jste si jisti!

-- Krok 1: Získejte ID nového uživatele
DO $$
DECLARE
  new_user_id UUID;
  old_user_id UUID;
BEGIN
  -- Najděte ID pro honza.hrodek@gmail.com
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'honza.hrodek@gmail.com';

  -- Najděte starého uživatele (ten, který má data)
  SELECT user_id INTO old_user_id
  FROM social_media_posts
  LIMIT 1;

  -- Pokud oba existují, proveďte převod
  IF new_user_id IS NOT NULL AND old_user_id IS NOT NULL THEN
    RAISE NOTICE 'Převádím data z % na %', old_user_id, new_user_id;

    -- Aktualizujte všechny tabulky
    UPDATE social_media_posts SET user_id = new_user_id WHERE user_id = old_user_id;
    UPDATE post_statuses SET user_id = new_user_id WHERE user_id = old_user_id;
    UPDATE pillars SET user_id = new_user_id WHERE user_id = old_user_id;
    UPDATE post_series SET user_id = new_user_id WHERE user_id = old_user_id;
    UPDATE recurring_actions SET user_id = new_user_id WHERE user_id = old_user_id;

    RAISE NOTICE 'Data převedena!';
  ELSE
    RAISE EXCEPTION 'Uživatel nebyl nalezen: new_user_id=%, old_user_id=%', new_user_id, old_user_id;
  END IF;
END $$;

-- Zkontrolujte výsledek
SELECT
  u.email,
  COUNT(p.id) as posts_count
FROM auth.users u
LEFT JOIN social_media_posts p ON p.user_id = u.id
GROUP BY u.id, u.email
ORDER BY posts_count DESC;
