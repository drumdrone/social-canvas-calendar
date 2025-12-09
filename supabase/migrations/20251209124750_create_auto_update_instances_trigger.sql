/*
  # Create Trigger to Auto-Update Instances from Templates
  
  1. New Trigger Function
    - `auto_update_instances_from_template()`
    - Automatically updates recurring_actions when template is updated
    - Only updates instances where is_custom = false
    - Preserves custom changes made by users
  
  2. Trigger
    - Fires AFTER UPDATE on action_templates
    - Updates all linked non-custom instances
*/

CREATE OR REPLACE FUNCTION auto_update_instances_from_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE recurring_actions
  SET
    title = NEW.title,
    subtitle = NEW.subtitle,
    description = NEW.description,
    status = NEW.status,
    updated_at = now()
  WHERE
    template_id = NEW.id
    AND is_custom = false
    AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_update_instances ON action_templates;

CREATE TRIGGER trigger_auto_update_instances
  AFTER UPDATE ON action_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_instances_from_template();
