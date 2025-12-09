/*
  # Add Template Reference to Recurring Actions
  
  1. Changes to `recurring_actions` table
    - Add `template_id` (uuid, nullable, foreign key to action_templates)
    - Add `is_custom` (boolean) - true if this instance was manually customized from template
    - Add index on template_id for better query performance
  
  2. Notes
    - Existing recurring_actions will have NULL template_id (they are custom)
    - New instances generated from templates will have template_id set
    - When user customizes an instance, is_custom is set to true
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_actions' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE recurring_actions ADD COLUMN template_id uuid REFERENCES action_templates(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_actions' AND column_name = 'is_custom'
  ) THEN
    ALTER TABLE recurring_actions ADD COLUMN is_custom boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_actions_template_id ON recurring_actions(template_id);
