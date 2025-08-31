-- Fix the plan_sections table structure and data issues

-- First, clean up duplicate records, keeping only the most recent one for each user_id/section_order combination
DELETE FROM plan_sections 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, section_order) id
  FROM plan_sections 
  ORDER BY user_id, section_order, updated_at DESC
);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE plan_sections 
ADD CONSTRAINT plan_sections_user_section_unique 
UNIQUE (user_id, section_order);