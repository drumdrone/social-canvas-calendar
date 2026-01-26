-- Enable pg_net extension for making HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to call Edge Function when notification is created
CREATE OR REPLACE FUNCTION notify_mention_via_email()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase URL and construct Edge Function endpoint
  -- Note: Replace YOUR_PROJECT_REF with actual project reference
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-mention-email';
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Call Edge Function asynchronously via pg_net
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after notification insert
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_mention_via_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, anon, authenticated, service_role;
