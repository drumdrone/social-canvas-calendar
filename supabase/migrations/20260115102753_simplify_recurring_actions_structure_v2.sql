/*
  # Simplify Recurring Actions Structure
  
  This migration simplifies the recurring_actions table for the new Plan page design.
  
  1. Changes to recurring_actions table
    - Remove template_id (no longer using templates)
    - Remove group_id (no longer needed)
    - Remove is_custom (all actions are custom now)
    - Remove week (not needed)
    - Remove month (not needed)
    - Remove subtitle (keeping it simple)
    - Remove status (not needed)
    - Add frequency field (e.g., "1x monthly", "2x weekly", "4x quarterly")
    - Keep: id, user_id, action_type, title, description, data, color, order_index, created_at, updated_at
  
  2. Important Notes
    - Existing data will be preserved where possible
    - Template references will be removed
    - action_templates table will be dropped as it's no longer used
*/

-- First, check and drop the foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'recurring_actions_template_id_fkey'
    AND table_name = 'recurring_actions'
  ) THEN
    ALTER TABLE recurring_actions DROP CONSTRAINT recurring_actions_template_id_fkey;
  END IF;
END $$;

-- Drop action_templates table if it exists
DROP TABLE IF EXISTS action_templates CASCADE;

-- Add frequency column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recurring_actions' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE recurring_actions ADD COLUMN frequency text DEFAULT '1x monthly';
  END IF;
END $$;

-- Drop columns that are no longer needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_actions' AND column_name = 'template_id') THEN
    ALTER TABLE recurring_actions DROP COLUMN template_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_actions' AND column_name = 'group_id') THEN
    ALTER TABLE recurring_actions DROP COLUMN group_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_actions' AND column_name = 'is_custom') THEN
    ALTER TABLE recurring_actions DROP COLUMN is_custom;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_actions' AND column_name = 'week') THEN
    ALTER TABLE recurring_actions DROP COLUMN week;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_actions' AND column_name = 'month') THEN
    ALTER TABLE recurring_actions DROP COLUMN month;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_actions' AND column_name = 'subtitle') THEN
    ALTER TABLE recurring_actions DROP COLUMN subtitle;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_actions' AND column_name = 'status') THEN
    ALTER TABLE recurring_actions DROP COLUMN status;
  END IF;
END $$;

-- Drop the generate_instances function if it exists
DROP FUNCTION IF EXISTS generate_instances(uuid, integer, integer[]) CASCADE;

-- Drop the auto_update_instances_trigger if it exists
DROP FUNCTION IF EXISTS auto_update_instances_trigger() CASCADE;
