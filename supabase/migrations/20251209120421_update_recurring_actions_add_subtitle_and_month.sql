/*
  # Update recurring_actions table - add subtitle and month fields

  1. Changes
    - Add `subtitle` field for secondary title (e.g., "Muffiny" under "Recept 1")
    - Add `month` field to track which month this action template is for
    - These are reusable templates that can be assigned to posts

  2. Notes
    - No RLS changes needed (existing policies still apply)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_actions' AND column_name = 'subtitle'
  ) THEN
    ALTER TABLE recurring_actions ADD COLUMN subtitle text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_actions' AND column_name = 'month'
  ) THEN
    ALTER TABLE recurring_actions ADD COLUMN month text DEFAULT '';
  END IF;
END $$;