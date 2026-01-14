/*
  # Add Cascade Delete for Unmodified Generated Posts

  1. Changes
    - Create function to delete unmodified social media posts when recurring action is deleted
    - Add trigger to call this function before recurring action deletion
    - Only deletes posts that still have the original generated title (unmodified)

  2. Logic
    - When a recurring_action is deleted, find all social_media_posts linked to it
    - Check if the post title matches the original generated title pattern
    - Delete only posts that haven't been manually edited (title unchanged)
    - Keep posts where user changed the title (indicates manual editing)
*/

-- Function to delete unmodified generated posts
CREATE OR REPLACE FUNCTION delete_unmodified_generated_posts()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete social_media_posts that are linked to this recurring_action
  -- and still have the original generated title (haven't been modified)
  DELETE FROM social_media_posts
  WHERE recurring_action_id = OLD.id
    AND title = OLD.title;  -- Only delete if title matches exactly (unmodified)
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before recurring_action is deleted
DROP TRIGGER IF EXISTS trigger_delete_unmodified_posts ON recurring_actions;

CREATE TRIGGER trigger_delete_unmodified_posts
  BEFORE DELETE ON recurring_actions
  FOR EACH ROW
  EXECUTE FUNCTION delete_unmodified_generated_posts();
