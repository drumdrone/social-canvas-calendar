#!/usr/bin/env node
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('database-export.json', 'utf8'));

let sql = '-- Import data from old database\n\n';

// Post statuses
if (data.post_statuses && data.post_statuses.length > 0) {
  sql += '-- Import post_statuses\n';
  data.post_statuses.forEach(row => {
    sql += `INSERT INTO post_statuses (id, user_id, name, color, is_active, created_at, updated_at) VALUES ('${row.id}', '${row.user_id}', '${row.name.replace(/'/g, "''")}', '${row.color}', ${row.is_active}, '${row.created_at}', '${row.updated_at}');\n`;
  });
  sql += '\n';
}

// Pillars
if (data.pillars && data.pillars.length > 0) {
  sql += '-- Import pillars\n';
  data.pillars.forEach(row => {
    sql += `INSERT INTO pillars (id, user_id, name, color, is_active, created_at, updated_at) VALUES ('${row.id}', '${row.user_id}', '${row.name.replace(/'/g, "''")}', '${row.color}', ${row.is_active}, '${row.created_at}', '${row.updated_at}');\n`;
  });
  sql += '\n';
}

// Authors
if (data.authors && data.authors.length > 0) {
  sql += '-- Import authors\n';
  data.authors.forEach(row => {
    const email = row.email ? `'${row.email}'` : 'NULL';
    sql += `INSERT INTO authors (id, user_id, name, initials, email, color, is_active, created_at, updated_at) VALUES ('${row.id}', '${row.user_id}', '${row.name.replace(/'/g, "''")}', '${row.initials}', ${email}, '${row.color}', ${row.is_active}, '${row.created_at}', '${row.updated_at}');\n`;
  });
  sql += '\n';
}

// Recurring actions
if (data.recurring_actions && data.recurring_actions.length > 0) {
  sql += '-- Import recurring_actions\n';
  data.recurring_actions.forEach(row => {
    const desc = row.description ? `'${row.description.replace(/'/g, "''")}'` : 'NULL';
    const dataJson = JSON.stringify(row.data).replace(/'/g, "''");
    sql += `INSERT INTO recurring_actions (id, user_id, action_type, title, description, data, color, order_index, frequency, created_at, updated_at) VALUES ('${row.id}', '${row.user_id}', '${row.action_type}', '${row.title.replace(/'/g, "''")}', ${desc}, '${dataJson}'::jsonb, '${row.color}', ${row.order_index}, '${row.frequency}', '${row.created_at}', '${row.updated_at}');\n`;
  });
  sql += '\n';
}

// Social media posts
if (data.social_media_posts && data.social_media_posts.length > 0) {
  sql += '-- Import social_media_posts\n';
  data.social_media_posts.forEach(row => {
    const content = row.content ? `'${row.content.replace(/'/g, "''").replace(/\n/g, '\\n')}'` : 'NULL';
    const imageUrl = row.image_url ? `'${row.image_url}'` : 'NULL';
    const imageUrl1 = row.image_url_1 ? `'${row.image_url_1}'` : 'NULL';
    const imageUrl2 = row.image_url_2 ? `'${row.image_url_2}'` : 'NULL';
    const imageUrl3 = row.image_url_3 ? `'${row.image_url_3}'` : 'NULL';
    const category = row.category ? `'${row.category}'` : 'NULL';
    const pillar = row.pillar ? `'${row.pillar}'` : 'NULL';
    const productLine = row.product_line ? `'${row.product_line}'` : 'NULL';
    const author = row.author ? `'${row.author}'` : 'NULL';
    const comments = row.comments ? `'${row.comments.replace(/'/g, "''")}'` : 'NULL';
    const recurringActionId = row.recurring_action_id ? `'${row.recurring_action_id}'` : 'NULL';
    const wasEdited = row.was_edited || false;
    
    sql += `INSERT INTO social_media_posts (id, user_id, recurring_action_id, title, content, platform, image_url, image_url_1, image_url_2, image_url_3, scheduled_date, status, category, pillar, product_line, author, comments, was_edited, created_at, updated_at) VALUES ('${row.id}', '${row.user_id}', ${recurringActionId}, '${row.title.replace(/'/g, "''")}', ${content}, '${row.platform}', ${imageUrl}, ${imageUrl1}, ${imageUrl2}, ${imageUrl3}, '${row.scheduled_date}', '${row.status}', ${category}, ${pillar}, ${productLine}, ${author}, ${comments}, ${wasEdited}, '${row.created_at}', '${row.updated_at}');\n`;
  });
}

fs.writeFileSync('import-data.sql', sql);
console.log('✅ Generated import-data.sql');
console.log('   Run this file in Supabase SQL Editor to import all data.');
