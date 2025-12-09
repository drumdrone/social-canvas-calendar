/*
  # Create recurring_actions table for Plan page

  1. New Tables
    - `recurring_actions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `action_type` (text) - 'monthly', 'weekly', 'quarterly'
      - `title` (text) - název akce/kampaně
      - `description` (text) - popis
      - `data` (jsonb) - flexibilní data pro různé typy akcí
      - `color` (text) - barva karty
      - `order_index` (integer) - pořadí v rámci sloupce
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `recurring_actions` table
    - Add policies for authenticated users to manage their own actions
*/

CREATE TABLE IF NOT EXISTS recurring_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('monthly', 'weekly', 'quarterly')),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  data jsonb DEFAULT '{}'::jsonb,
  color text DEFAULT '#6366f1',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring actions"
  ON recurring_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring actions"
  ON recurring_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring actions"
  ON recurring_actions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring actions"
  ON recurring_actions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_actions_user_type ON recurring_actions(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_recurring_actions_order ON recurring_actions(order_index);