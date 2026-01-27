-- 1. Zjistěte všechny uživatele v auth.users
SELECT
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at;

-- 2. Zjistěte, jaký user_id používají existující data
SELECT DISTINCT user_id, COUNT(*) as post_count
FROM social_media_posts
GROUP BY user_id;

-- 3. Zjistěte user_id pro honza.hrodek@gmail.com
SELECT id, email
FROM auth.users
WHERE email = 'honza.hrodek@gmail.com';
