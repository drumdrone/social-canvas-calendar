/*
  # Add week field to recurring_actions
  
  1. Changes
    - Add `week` field (integer, nullable) to track week number (1-4) for weekly actions
    - Add `status` field (text) to track action status
  
  2. Notes
    - Week is only used for weekly actions
    - Status defaults to 'active'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_actions' AND column_name = 'week'
  ) THEN
    ALTER TABLE recurring_actions ADD COLUMN week integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_actions' AND column_name = 'status'
  ) THEN
    ALTER TABLE recurring_actions ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;
