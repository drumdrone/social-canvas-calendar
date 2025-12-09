/*
  # Add group_id to recurring_actions table
  
  1. Changes
    - Add `group_id` column to `recurring_actions` table
    - This column will be used to group related actions that were created together (e.g., 12 monthly actions)
    - When editing the title of one action, all actions with the same group_id will be updated
  
  2. Notes
    - group_id is optional (nullable) for backwards compatibility with existing actions
    - New actions created with "repeat for 12 months" will share the same group_id
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_actions' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE recurring_actions ADD COLUMN group_id uuid;
  END IF;
END $$;