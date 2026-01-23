-- ============================================
-- MANUÁLNÍ TEST NOTIFIKACE (BEZ APLIKACE)
-- ============================================
-- Tento SQL vytvoří testovací komentář s @mention
-- a zavolá Edge Function pro odeslání emailu

-- POZNÁMKA: Nahraďte tyto hodnoty skutečnými ID z vaší databáze:
-- - author_id: ID vašeho přihlášeného uživatele
-- - mentioned_user_id: ID Jana Hrodka (honza.hrodek@gmail.com)
-- - post_id: ID nějakého existujícího postu

-- Krok 1: Získejte potřebná ID
DO $$
DECLARE
  v_author_id UUID;
  v_mentioned_user_id UUID;
  v_post_id UUID;
  v_comment_id UUID;
  v_notification_id UUID;
BEGIN
  -- Najděte autora (můžete změnit email na svůj)
  SELECT id INTO v_author_id FROM user_profiles LIMIT 1;

  -- Najděte Jana Hrodka
  SELECT id INTO v_mentioned_user_id FROM user_profiles WHERE email = 'honza.hrodek@gmail.com';

  -- Najděte nějaký post
  SELECT id INTO v_post_id FROM social_media_posts LIMIT 1;

  -- Pokud nemáme všechna ID, vypište chybu
  IF v_author_id IS NULL OR v_mentioned_user_id IS NULL OR v_post_id IS NULL THEN
    RAISE EXCEPTION 'Chybí potřebná data. Ujistěte se, že existují uživatelé a posty.';
  END IF;

  -- Vytvořte komentář
  INSERT INTO comments (post_id, author_id, content)
  VALUES (v_post_id, v_author_id, 'Test @Jan Hrodek - zkouším email notifikace!')
  RETURNING id INTO v_comment_id;

  RAISE NOTICE 'Komentář vytvořen: %', v_comment_id;

  -- Vytvořte mention
  INSERT INTO comment_mentions (comment_id, mentioned_user_id)
  VALUES (v_comment_id, v_mentioned_user_id);

  RAISE NOTICE 'Mention vytvořen pro: %', v_mentioned_user_id;

  -- Trigger by měl automaticky vytvořit notifikaci
  -- Zkontrolujte, že byla vytvořena
  SELECT id INTO v_notification_id
  FROM notifications
  WHERE comment_id = v_comment_id
  LIMIT 1;

  IF v_notification_id IS NOT NULL THEN
    RAISE NOTICE 'Notifikace vytvořena: %', v_notification_id;
    RAISE NOTICE 'Nyní byste měli zavolat Edge Function ručně nebo počkat, až ji zavolá aplikace.';
  ELSE
    RAISE NOTICE 'VAROVÁNÍ: Notifikace nebyla automaticky vytvořena. Zkontrolujte trigger.';
  END IF;

END $$;

-- Zkontrolujte výsledek
SELECT
  n.id as notification_id,
  n.email_sent,
  n.created_at,
  u.email as recipient_email,
  u.full_name as recipient_name,
  c.content as comment_content,
  p.title as post_title
FROM notifications n
JOIN user_profiles u ON n.user_id = u.id
JOIN comments c ON n.comment_id = c.id
JOIN social_media_posts p ON n.post_id = p.id
ORDER BY n.created_at DESC
LIMIT 5;
