/*
  # Remove Auto-Generate Posts Trigger
  
  1. Changes
    - Drop trigger that automatically generates posts
    - Drop the function
*/

DROP TRIGGER IF EXISTS trigger_auto_generate_posts ON recurring_actions;
DROP FUNCTION IF EXISTS auto_generate_posts_for_action();
