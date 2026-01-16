/*
  # Update status default value

  1. Changes
    - Change default status from 'draft' to 'nezahájeno' to match current Czech status values
    
  2. Notes
    - The application now uses Czech status names ('nezahájeno', 'v procesu', 'publikováno')
    - Old default 'draft' is no longer valid and could cause issues
*/

ALTER TABLE social_media_posts 
ALTER COLUMN status SET DEFAULT 'nezahájeno';
