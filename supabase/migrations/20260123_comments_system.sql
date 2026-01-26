-- User Profiles, Comments, Mentions and Notifications System

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  notification_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES social_media_posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Create comment_mentions table (who was mentioned in which comment)
CREATE TABLE IF NOT EXISTS comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(comment_id, mentioned_user_id)
);

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES social_media_posts(id) ON DELETE CASCADE NOT NULL,
  is_read boolean DEFAULT false,
  email_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (allow all for development)
CREATE POLICY "Allow all on user_profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comment_mentions" ON comment_mentions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- 8. Create trigger function to automatically create notifications when mentioned
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for mentioned user
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

-- 9. Create trigger on comment_mentions
DROP TRIGGER IF EXISTS on_mention_create_notification ON comment_mentions;
CREATE TRIGGER on_mention_create_notification
  AFTER INSERT ON comment_mentions
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();

-- 10. Update triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Insert sample users for testing
INSERT INTO user_profiles (email, full_name, notification_enabled) VALUES
('honza.hrodek@gmail.com', 'Honza Hrodek', true),
('martin@example.com', 'Martin Novák', true),
('petra@example.com', 'Petra Svobodová', true)
ON CONFLICT (email) DO NOTHING;
