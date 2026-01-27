-- Zkontrolujte všechny existující uživatele v auth.users
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Pokud vidíte nějakého uživatele, můžete použít jeho email
-- a resetovat heslo v Supabase Dashboard:
-- Authentication → Users → Klikněte na uživatele → "Reset Password"
