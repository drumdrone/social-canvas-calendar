// Browser Console Export Script
// Run this in the browser console on https://drumdrone.github.io/social-canvas-calendar/

(async function exportAllData() {
  console.log('🔍 Starting data export...');

  // Import Supabase client from the app
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

  // Old database credentials (from GitHub Pages)
  const SUPABASE_URL = "https://gaqhdjhhkzqbkqknrndx.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcWhkamhoa3pxYmtxa25ybmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTY0NTQsImV4cCI6MjA3NTQ5MjQ1NH0.CcI5J_Crc69bmRBTTIRg5eq2nEhNLs_jslN-fix-OyY";

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

  const exportedData = {};
  let totalRows = 0;

  for (const table of TABLES) {
    console.log(`  Fetching ${table}...`);
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.error(`  ❌ Error fetching ${table}:`, error.message);
        exportedData[table] = [];
      } else {
        exportedData[table] = data || [];
        totalRows += (data || []).length;
        console.log(`  ✅ ${table}: ${(data || []).length} rows`);
      }
    } catch (err) {
      console.error(`  ❌ Exception fetching ${table}:`, err.message);
      exportedData[table] = [];
    }
  }

  console.log(`\n📊 Total rows exported: ${totalRows}`);
  console.log('\n💾 Downloading export file...');

  // Download as JSON file
  const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'database-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('✅ Export complete! Check your Downloads folder.');

  return exportedData;
})();
