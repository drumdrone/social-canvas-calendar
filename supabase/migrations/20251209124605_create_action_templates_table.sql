/*
  # Create Action Templates Table
  
  1. New Tables
    - `action_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text) - Name of the action template
      - `subtitle` (text) - Optional subtitle
      - `description` (text) - Detailed description
      - `frequency` (text) - How often it repeats: weekly, monthly, quarterly, yearly
      - `times_per_period` (integer) - How many times per period (e.g., 4x per month)
      - `color` (text) - Display color
      - `status` (text) - Status of the template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `action_templates` table
    - Add policy for authenticated users to read their own templates
    - Add policy for authenticated users to insert their own templates
    - Add policy for authenticated users to update their own templates
    - Add policy for authenticated users to delete their own templates
*/

CREATE TABLE IF NOT EXISTS action_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text DEFAULT '',
  description text DEFAULT '',
  frequency text NOT NULL DEFAULT 'monthly',
  times_per_period integer NOT NULL DEFAULT 1,
  color text DEFAULT '#3b82f6',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own action templates"
  ON action_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action templates"
  ON action_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action templates"
  ON action_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own action templates"
  ON action_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_action_templates_user_id ON action_templates(user_id);
