-- ============================================
-- PŘIDÁNÍ UŽIVATELŮ PRO TESTOVÁNÍ
-- ============================================

-- Nejdřív odstraňte testovací uživatele (pokud existují)
DELETE FROM user_profiles WHERE email IN ('martin@example.com', 'petra@example.com');

-- Přidejte Terezu a Elišku (pokud ještě neexistují)
INSERT INTO user_profiles (email, full_name, notification_enabled)
VALUES
  ('tereza.moravcova@mediate.cz', 'Tereza Moravcová', true),
  ('eliska.kalousova@mediate.cz', 'Eliška Kalousová', true)
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  notification_enabled = EXCLUDED.notification_enabled;

-- Ujistěte se, že Jan Hrodek existuje
INSERT INTO user_profiles (email, full_name, notification_enabled)
VALUES ('honza.hrodek@gmail.com', 'Jan Hrodek', true)
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  notification_enabled = EXCLUDED.notification_enabled;

-- Zkontrolujte výsledek
SELECT
  id,
  email,
  full_name,
  notification_enabled,
  created_at
FROM user_profiles
ORDER BY created_at DESC;
