/*
  # Create Authors Table

  1. New Tables
    - `authors`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Full name of the author
      - `initials` (text) - 3-letter initials
      - `email` (text, optional) - Contact email
      - `color` (text) - Color code for visual identification
      - `is_active` (boolean) - Whether the author is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `authors` table
    - Add policy for authenticated users to read their own authors
    - Add policy for authenticated users to insert their own authors
    - Add policy for authenticated users to update their own authors
    - Add policy for authenticated users to delete their own authors
*/

CREATE TABLE IF NOT EXISTS authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  initials text NOT NULL CHECK (length(initials) = 3),
  email text,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own authors"
  ON authors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own authors"
  ON authors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own authors"
  ON authors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own authors"
  ON authors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_authors_user_id ON authors(user_id);
CREATE INDEX IF NOT EXISTS idx_authors_is_active ON authors(is_active);