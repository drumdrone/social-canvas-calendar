#!/usr/bin/env node

/**
 * Migration script to export data from old Bolt-managed Supabase database
 * and import it into the new user-owned Supabase project
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Old Bolt-managed database
const OLD_SUPABASE_URL = "https://gaqhdjhhkzqbkqknrndx.supabase.co";
const OLD_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcWhkamhoa3pxYmtxa25ybmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTY0NTQsImV4cCI6MjA3NTQ5MjQ1NH0.CcI5J_Crc69bmRBTTIRg5eq2nEhNLs_jslN-fix-OyY";

// New user-owned database
const NEW_SUPABASE_URL = "https://ejcjdhtgdjyuucknefvp.supabase.co";
const NEW_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqY2pkaHRnZGp5dXVja25lZnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNjMxNTYsImV4cCI6MjA4NDYzOTE1Nn0.jvWD4bwU26RlswmIR4PBxRfiy_njmIfLIcXoQAVU8nU";

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

// Tables to migrate (in order due to foreign key constraints)
const TABLES = [
  'platforms',
  'formats',
  'post_statuses',
  'pillars',
  'categories',
  'product_lines',
  'authors',
  'social_media_posts',
  'recurring_actions'
];

async function exportData() {
  console.log('🔍 Exporting data from old database...\n');
  const exportedData = {};

  for (const table of TABLES) {
    try {
      console.log(`  Fetching ${table}...`);
      const { data, error } = await oldSupabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`  ❌ Error fetching ${table}:`, error.message);
        continue;
      }

      exportedData[table] = data || [];
      console.log(`  ✅ ${table}: ${data?.length || 0} rows`);
    } catch (err) {
      console.error(`  ❌ Exception fetching ${table}:`, err.message);
    }
  }

  // Save to file
  const filename = 'migration-backup.json';
  fs.writeFileSync(filename, JSON.stringify(exportedData, null, 2));
  console.log(`\n💾 Data saved to ${filename}\n`);

  return exportedData;
}

async function importData(data) {
  console.log('📥 Importing data to new database...\n');

  for (const table of TABLES) {
    const rows = data[table] || [];
    if (rows.length === 0) {
      console.log(`  ⏭️  Skipping ${table} (no data)`);
      continue;
    }

    try {
      console.log(`  Importing ${table} (${rows.length} rows)...`);

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await newSupabase
          .from(table)
          .insert(batch);

        if (error) {
          console.error(`  ❌ Error importing ${table} batch ${i}:`, error.message);
          console.error('     Details:', error);
          // Continue with next batch
        }
      }

      console.log(`  ✅ ${table} imported successfully`);
    } catch (err) {
      console.error(`  ❌ Exception importing ${table}:`, err.message);
    }
  }

  console.log('\n✨ Migration complete!\n');
}

async function migrate() {
  try {
    // Test old database connection
    console.log('🔗 Testing old database connection...');
    const { data: oldTest, error: oldError } = await oldSupabase
      .from('social_media_posts')
      .select('count');

    if (oldError) {
      console.error('❌ Cannot connect to old database:', oldError.message);
      console.log('\n💡 Data might be inaccessible. Using backup approach...\n');
    } else {
      console.log('✅ Old database accessible\n');
    }

    // Export data
    const exportedData = await exportData();

    // Check if we have any data
    const totalRows = Object.values(exportedData).reduce((sum, rows) => sum + rows.length, 0);
    if (totalRows === 0) {
      console.log('⚠️  No data exported. Old database might be inaccessible.');
      console.log('   Check if data is still visible in Bolt dashboard.\n');
      return;
    }

    console.log(`📊 Total rows exported: ${totalRows}\n`);

    // Ask for confirmation
    console.log('Ready to import to new database.');
    console.log('Press Ctrl+C to cancel, or any key to continue...\n');

    // Import data
    await importData(exportedData);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
