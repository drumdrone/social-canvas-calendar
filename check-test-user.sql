-- Zkontrolujte, zda testovací uživatel existuje
SELECT
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'test@example.com';

-- Pokud uživatel NEEXISTUJE, vytvořte ho pomocí Supabase Dashboard:
-- 1. Jděte na: Supabase Dashboard → Authentication → Users
-- 2. Klikněte "Add user" → "Create new user"
-- 3. Email: test@example.com
-- 4. Password: 123456
-- 5. Auto Confirm User: ON (zapnuto)

-- Alternativně můžete použít svůj email honza.hrodek@gmail.com
-- a zaregistrovat se přímo v aplikaci (pokud má registraci)
