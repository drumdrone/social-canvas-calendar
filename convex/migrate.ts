import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// One-off migration from the live Supabase project into Convex.
//
// Everything runs server-side inside a single Convex action so images can be
// streamed straight into Convex file storage. Trigger it from the CLI once the
// deployment is linked and env vars are set:
//
//   npx convex env set SUPABASE_URL           https://ejcjdhtgdjyuucknefvp.supabase.co
//   npx convex env set SUPABASE_SERVICE_ROLE_KEY  <service-role-key>
//   npx convex run migrate:runMigration '{ "wipe": true }'
//
// `wipe: true` clears the target tables first so the migration is re-runnable
// while you test. Order matters: parent tables are imported before the tables
// that reference them, so legacy UUIDs can be remapped to new Convex ids.

// --- low-level helpers callable from the action ------------------------------

export const insertDoc = internalMutation({
  args: { table: v.string(), doc: v.any() },
  handler: async (ctx, { table, doc }): Promise<string> => {
    return ctx.db.insert(table as any, doc);
  },
});

export const clearTable = internalMutation({
  args: { table: v.string() },
  handler: async (ctx, { table }): Promise<number> => {
    const rows = await ctx.db.query(table as any).collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return rows.length;
  },
});

// --- the migration itself ----------------------------------------------------

const toMs = (s?: string | null) => (s ? new Date(s).getTime() : undefined);

export const runMigration = internalAction({
  args: { wipe: v.optional(v.boolean()) },
  handler: async (ctx, { wipe }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !KEY) {
      throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the Convex deployment");
    }

    async function fetchAll(table: string): Promise<any[]> {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` },
      });
      // Tolerate tables that don't exist in this Supabase project (the schema
      // drifted over time) — skip them instead of aborting the whole run.
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`Supabase read ${table}: ${res.status} ${await res.text()}`);
      return res.json();
    }

    const insert = (table: string, doc: any) =>
      ctx.runMutation(internal.migrate.insertDoc, { table, doc });

    const report: Record<string, number> = {};
    const maps: Record<string, Record<string, string>> = {};

    // Import a table with a row->doc mapper, recording legacyId -> newId.
    async function importTable(
      table: string,
      convexTable: string,
      map: (row: any) => any,
    ) {
      if (wipe) await ctx.runMutation(internal.migrate.clearTable, { table: convexTable });
      const rows = await fetchAll(table);
      maps[table] = {};
      for (const row of rows) {
        const doc = {
          ...map(row),
          legacyId: row.id,
          createdAt: toMs(row.created_at),
          updatedAt: toMs(row.updated_at),
        };
        const id = await insert(convexTable, doc);
        maps[table][row.id] = id;
      }
      report[convexTable] = rows.length;
    }

    // 1) Lookup / taxonomy tables (no cross references)
    const lookup = (row: any) => ({
      name: row.name,
      color: row.color,
      isActive: row.is_active,
    });
    await importTable("post_statuses", "post_statuses", lookup);
    await importTable("platforms", "platforms", (r) => ({ ...lookup(r), iconName: r.icon_name }));
    await importTable("pillars", "pillars", lookup);
    await importTable("categories", "categories", (r) => ({ ...lookup(r), format: r.format }));
    await importTable("formats", "formats", lookup);
    await importTable("product_lines", "product_lines", lookup);
    await importTable("authors", "authors", (r) => ({
      name: r.name,
      initials: r.initials,
      color: r.color,
      email: r.email,
      isActive: r.is_active,
    }));

    // 2) recurring_actions (referenced by posts)
    await importTable("recurring_actions", "recurringActions", (r) => ({
      actionType: r.action_type,
      title: r.title,
      subtitle: r.subtitle,
      description: r.description,
      data: r.data,
      color: r.color,
      orderIndex: r.order_index,
      month: r.month,
      week: r.week,
      groupId: r.group_id,
      isCustom: r.is_custom,
      status: r.status,
      frequency: r.frequency,
      userId: r.user_id,
    }));

    // 3) user_profiles (referenced by comments/notifications)
    await importTable("user_profiles", "user_profiles", (r) => ({
      email: r.email,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      notificationEnabled: r.notification_enabled,
    }));

    // 4) posts — remap recurring_action_id and pull images into Convex storage
    if (wipe) await ctx.runMutation(internal.migrate.clearTable, { table: "social_media_posts" });
    const posts = await fetchAll("social_media_posts");
    maps["social_media_posts"] = {};
    let imagesMigrated = 0;
    // Pull one remote image URL into Convex storage; leave base64 / already-null
    // sources alone. Returns the resulting storage id (or undefined).
    async function pullImage(src: string | null): Promise<string | undefined> {
      if (!src || !/^https?:\/\//.test(src)) return undefined;
      try {
        const res = await fetch(src);
        if (!res.ok) return undefined;
        const sid = await ctx.storage.store(await res.blob());
        imagesMigrated++;
        return sid;
      } catch {
        return undefined;
      }
    }
    for (const row of posts) {
      const [sid1, sid2, sid3] = await Promise.all([
        pullImage(row.image_url ?? row.image_url_1),
        pullImage(row.image_url_2),
        pullImage(row.image_url_3),
      ]);
      const recRef = row.recurring_action_id
        ? maps["recurring_actions"]?.[row.recurring_action_id]
        : undefined;
      const id = await insert("social_media_posts", {
        title: row.title,
        content: row.content,
        platform: row.platform,
        category: row.category,
        status: row.status,
        scheduledDate: row.scheduled_date,
        author: row.author,
        pillar: row.pillar,
        productLine: row.product_line,
        comments: row.comments,
        imageUrl: sid1 ? undefined : (row.image_url ?? row.image_url_1 ?? null),
        imageUrl2: sid2 ? undefined : (row.image_url_2 ?? null),
        imageUrl3: sid3 ? undefined : (row.image_url_3 ?? null),
        imageStorageId: sid1,
        imageStorageId2: sid2,
        imageStorageId3: sid3,
        recurringActionId: recRef ?? undefined,
        userId: row.user_id,
        legacyId: row.id,
        createdAt: toMs(row.created_at),
        updatedAt: toMs(row.updated_at),
      });
      maps["social_media_posts"][row.id] = id;
    }
    report["social_media_posts"] = posts.length;
    report["images"] = imagesMigrated;

    // 5) mood_board_items and plan_sections (self-contained)
    await importTable("mood_board_items", "mood_board_items", (r) => ({
      format: r.format,
      imagePrompt: r.image_prompt,
      napad: r.napad,
      popis: r.popis,
      text: r.text,
      userId: r.user_id,
    }));
    await importTable("plan_sections", "plan_sections", (r) => ({
      sectionData: r.section_data,
      sectionOrder: r.section_order,
      userId: r.user_id,
    }));

    // 6) comments -> comment_mentions -> notifications (remap FKs)
    if (wipe) {
      await ctx.runMutation(internal.migrate.clearTable, { table: "notifications" });
      await ctx.runMutation(internal.migrate.clearTable, { table: "comment_mentions" });
      await ctx.runMutation(internal.migrate.clearTable, { table: "comments" });
    }
    const P = maps["social_media_posts"], U = maps["user_profiles"];
    maps["comments"] = {};
    for (const row of await fetchAll("comments")) {
      const postId = P?.[row.post_id], authorId = U?.[row.author_id];
      if (!postId || !authorId) continue; // orphaned row, skip
      const id = await insert("comments", {
        postId, authorId, content: row.content,
        legacyId: row.id, createdAt: toMs(row.created_at), updatedAt: toMs(row.updated_at),
      });
      maps["comments"][row.id] = id;
    }
    const C = maps["comments"];
    for (const row of await fetchAll("comment_mentions")) {
      const commentId = C?.[row.comment_id], mentionedUserId = U?.[row.mentioned_user_id];
      if (!commentId || !mentionedUserId) continue;
      await insert("comment_mentions", {
        commentId, mentionedUserId,
        legacyId: row.id, createdAt: toMs(row.created_at),
      });
    }
    for (const row of await fetchAll("notifications")) {
      const userId = U?.[row.user_id], commentId = C?.[row.comment_id], postId = P?.[row.post_id];
      if (!userId || !commentId || !postId) continue;
      await insert("notifications", {
        userId, commentId, postId, isRead: row.is_read, emailSent: row.email_sent,
        legacyId: row.id, createdAt: toMs(row.created_at),
      });
    }

    return report;
  },
});
