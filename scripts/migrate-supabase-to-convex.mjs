#!/usr/bin/env node
/**
 * One-off migration: Supabase (Postgres + Storage) -> Convex (database + file storage).
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   CONVEX_URL=https://xxx.convex.cloud \
 *   node scripts/migrate-supabase-to-convex.mjs [--clear] [--dry-run]
 *
 *   --clear    empty the Convex tables first (safe to re-run the migration)
 *   --dry-run  only read from Supabase and print what would be migrated
 *
 * Requires Node 18+ (uses the built-in fetch).
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || '';

const CLEAR = process.argv.includes('--clear');
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!CONVEX_URL && !DRY_RUN) {
  console.error('Missing CONVEX_URL (https://<deployment>.convex.cloud)');
  process.exit(1);
}

const convex = DRY_RUN ? null : new ConvexHttpClient(CONVEX_URL);

/* ------------------------------------------------------------------ */
/* Supabase helpers (plain REST, no SDK needed)                        */
/* ------------------------------------------------------------------ */

const supabaseHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function fetchTable(table) {
  const rows = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${pageSize}&offset=${offset}`;
    const response = await fetch(url, { headers: supabaseHeaders });

    if (response.status === 404) {
      console.warn(`  ! table ${table} does not exist, skipping`);
      return [];
    }

    if (!response.ok) {
      throw new Error(`GET ${table} failed: ${response.status} ${await response.text()}`);
    }

    const page = await response.json();
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows;
}

/** Recursively lists every object in a storage bucket. */
async function listBucket(bucket, prefix = '') {
  const files = [];
  const limit = 100;

  for (let offset = 0; ; offset += limit) {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { ...supabaseHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit, offset, sortBy: { column: 'name', order: 'asc' } }),
    });

    if (!response.ok) {
      console.warn(`  ! bucket ${bucket} not readable: ${response.status}`);
      return files;
    }

    const page = await response.json();

    for (const entry of page) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.id === null) {
        // Folder – recurse.
        files.push(...(await listBucket(bucket, path)));
      } else if (entry.name !== '.emptyFolderPlaceholder') {
        files.push({ path, size: entry.metadata?.size, contentType: entry.metadata?.mimetype });
      }
    }

    if (page.length < limit) break;
  }

  return files;
}

async function downloadFile(bucket, path) {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`,
    { headers: supabaseHeaders }
  );

  if (!response.ok) {
    throw new Error(`download ${bucket}/${path} failed: ${response.status}`);
  }

  return new Blob([await response.arrayBuffer()], {
    type: response.headers.get('content-type') || 'application/octet-stream',
  });
}

function publicUrl(bucket, path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/* ------------------------------------------------------------------ */
/* Convex helpers                                                      */
/* ------------------------------------------------------------------ */

async function uploadToConvex(blob) {
  const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Convex upload failed: ${response.status}`);
  }

  const { storageId } = await response.json();
  const url = await convex.query(api.files.getUrl, { storageId });

  return { storageId, url };
}

async function importRows(table, rows) {
  const ids = [];
  const batchSize = 200;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const result = await convex.mutation(api.migrate.importRows, { table, rows: batch });
    ids.push(...result.ids);
  }

  return ids;
}

/* ------------------------------------------------------------------ */
/* Migration                                                           */
/* ------------------------------------------------------------------ */

const LOOKUP_TABLES = [
  'platforms',
  'post_statuses',
  'categories',
  'pillars',
  'product_lines',
  'formats',
  'authors',
];

const ALL_TARGET_TABLES = [
  ...LOOKUP_TABLES,
  'recurring_actions',
  'social_media_posts',
  'post_versions',
  'plan_sections',
  'mood_board_items',
  'mood_board_images',
  'mood_board_notes',
];

const DATE_FIELDS = ['scheduled_date', 'created_at', 'updated_at'];

/**
 * Drops columns that no longer exist in Convex and normalises timestamps to
 * `...Z` ISO strings – Convex compares them as plain strings, so a single
 * format keeps date ranges correct.
 */
function strip(row, extraKeys = []) {
  const copy = { ...row };
  for (const key of ['id', 'user_id', ...extraKeys]) delete copy[key];

  for (const field of DATE_FIELDS) {
    if (typeof copy[field] === 'string') {
      const parsed = new Date(copy[field]);
      if (!Number.isNaN(parsed.getTime())) copy[field] = parsed.toISOString();
    }
  }

  return copy;
}

function rewriteUrl(url, urlMap) {
  if (!url) return url ?? null;
  return urlMap.get(url) ?? url;
}

async function main() {
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Convex:   ${CONVEX_URL || '(dry run)'}\n`);

  if (CLEAR && !DRY_RUN) {
    console.log('Clearing Convex tables…');
    for (const table of ALL_TARGET_TABLES) {
      const { deleted } = await convex.mutation(api.migrate.clearTable, { table });
      console.log(`  ${table}: ${deleted} deleted`);
    }
    console.log('');
  }

  /* 1. Files -------------------------------------------------------- */
  const urlMap = new Map();

  for (const bucket of ['social-media-images', 'SOCIAL_CANVAS']) {
    const files = await listBucket(bucket);
    if (files.length === 0) continue;

    console.log(`Bucket ${bucket}: ${files.length} files`);

    for (const file of files) {
      if (DRY_RUN) continue;

      try {
        const blob = await downloadFile(bucket, file.path);
        const { url } = await uploadToConvex(blob);
        urlMap.set(publicUrl(bucket, file.path), url);
        process.stdout.write('.');
      } catch (error) {
        console.warn(`\n  ! ${file.path}: ${error.message}`);
      }
    }

    console.log('');
  }

  /* 2. Media gallery ------------------------------------------------ */
  const mediaFiles = await listBucket('media-gallery');
  console.log(`Bucket media-gallery: ${mediaFiles.length} files`);

  for (const file of mediaFiles) {
    if (DRY_RUN) continue;

    try {
      const blob = await downloadFile('media-gallery', file.path);
      const { storageId, url } = await uploadToConvex(blob);

      await convex.mutation(api.files.addMedia, {
        storageId,
        name: file.path.split('/').pop(),
        size: file.size,
        contentType: file.contentType ?? null,
      });

      urlMap.set(publicUrl('media-gallery', file.path), url);
      process.stdout.write('.');
    } catch (error) {
      console.warn(`\n  ! ${file.path}: ${error.message}`);
    }
  }
  console.log('\n');

  /* 3. Lookup tables ------------------------------------------------ */
  for (const table of LOOKUP_TABLES) {
    const rows = await fetchTable(table);
    console.log(`${table}: ${rows.length} rows`);

    if (!DRY_RUN && rows.length) {
      await importRows(table, rows.map((row) => strip(row)));
    }
  }

  /* 4. Recurring actions (posts reference them) --------------------- */
  const actions = await fetchTable('recurring_actions');
  console.log(`recurring_actions: ${actions.length} rows`);

  const actionIdMap = new Map();
  if (!DRY_RUN && actions.length) {
    const ids = await importRows(
      'recurring_actions',
      actions.map((row) => strip(row))
    );
    actions.forEach((row, index) => actionIdMap.set(row.id, ids[index]));
  }

  /* 5. Posts -------------------------------------------------------- */
  const posts = await fetchTable('social_media_posts');
  console.log(`social_media_posts: ${posts.length} rows`);

  const postIdMap = new Map();
  if (!DRY_RUN && posts.length) {
    const prepared = posts.map((row) => ({
      ...strip(row),
      image_url: rewriteUrl(row.image_url, urlMap),
      image_url_1: rewriteUrl(row.image_url_1, urlMap),
      image_url_2: rewriteUrl(row.image_url_2, urlMap),
      image_url_3: rewriteUrl(row.image_url_3, urlMap),
      recurring_action_id: row.recurring_action_id
        ? (actionIdMap.get(row.recurring_action_id) ?? null)
        : null,
    }));

    const ids = await importRows('social_media_posts', prepared);
    posts.forEach((row, index) => postIdMap.set(row.id, ids[index]));
  }

  /* 6. Post versions ------------------------------------------------ */
  const versions = await fetchTable('post_versions');
  const mappableVersions = versions.filter((row) => postIdMap.has(row.post_id));
  console.log(
    `post_versions: ${versions.length} rows (${mappableVersions.length} with an existing post)`
  );

  if (!DRY_RUN && mappableVersions.length) {
    await importRows(
      'post_versions',
      mappableVersions.map((row) => ({
        ...strip(row),
        post_id: postIdMap.get(row.post_id),
        image_url: rewriteUrl(row.image_url, urlMap),
      }))
    );
  }

  /* 7. Plan + mood board -------------------------------------------- */
  const planSections = await fetchTable('plan_sections');
  console.log(`plan_sections: ${planSections.length} rows`);
  if (!DRY_RUN && planSections.length) {
    await importRows('plan_sections', planSections.map((row) => strip(row)));
  }

  for (const table of ['mood_board_items', 'mood_board_notes']) {
    const rows = await fetchTable(table);
    console.log(`${table}: ${rows.length} rows`);
    if (!DRY_RUN && rows.length) {
      await importRows(table, rows.map((row) => strip(row)));
    }
  }

  const moodImages = await fetchTable('mood_board_images');
  console.log(`mood_board_images: ${moodImages.length} rows`);
  if (!DRY_RUN && moodImages.length) {
    await importRows(
      'mood_board_images',
      moodImages.map((row) => ({ ...strip(row), url: rewriteUrl(row.url, urlMap) }))
    );
  }

  console.log('\nDone.');
  if (DRY_RUN) console.log('(dry run – nothing was written to Convex)');
}

main().catch((error) => {
  console.error('\nMigration failed:', error);
  process.exit(1);
});
