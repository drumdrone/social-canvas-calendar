#!/usr/bin/env node

/**
 * Import script to load data from database-export.json into new Supabase project
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// New user-owned database
const NEW_SUPABASE_URL = "https://ejcjdhtgdjyuucknefvp.supabase.co";
const NEW_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqY2pkaHRnZGp5dXVja25lZnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNjMxNTYsImV4cCI6MjA4NDYzOTE1Nn0.jvWD4bwU26RlswmIR4PBxRfiy_njmIfLIcXoQAVU8nU";

const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

// Tables to import (in order due to foreign key constraints)
const TABLES = [
  'post_statuses',
  'pillars',
  'authors',
  'recurring_actions',
  'social_media_posts'
];

async function importData() {
  console.log('📥 Starting data import to new Supabase database...\n');

  // Read exported data
  const exportedData = JSON.parse(fs.readFileSync('database-export.json', 'utf8'));

  let totalImported = 0;

  for (const table of TABLES) {
    const rows = exportedData[table] || [];

    if (rows.length === 0) {
      console.log(`  ⏭️  Skipping ${table} (no data)`);
      continue;
    }

    try {
      console.log(`  Importing ${table} (${rows.length} rows)...`);

      // Insert all rows
      const { data, error } = await supabase
        .from(table)
        .insert(rows);

      if (error) {
        console.error(`  ❌ Error importing ${table}:`, error.message);
        console.error('     Details:', error);
      } else {
        totalImported += rows.length;
        console.log(`  ✅ ${table}: ${rows.length} rows imported`);
      }
    } catch (err) {
      console.error(`  ❌ Exception importing ${table}:`, err.message);
    }
  }

  console.log(`\n✨ Import complete! Total rows imported: ${totalImported}`);
  console.log('\n🎉 Your data has been migrated to your new Supabase database!');
  console.log('   You can now use the application with all your posts and settings.\n');
}

// Run import
importData().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
