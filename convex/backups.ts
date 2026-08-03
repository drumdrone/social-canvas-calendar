import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Monthly full-data export, run by the cron in convex/crons.ts. Convex
// already snapshots the whole database daily on its own — this is an
// additional export that lands as a downloadable JSON file plus an email,
// so a copy of the data exists outside of "log into the Convex dashboard".

const TABLES = [
  "social_media_posts",
  "authors",
  "post_statuses",
  "platforms",
  "pillars",
  "categories",
  "formats",
  "product_lines",
  "recurringActions",
  "mood_board_items",
  "plan_sections",
  "user_profiles",
  "comments",
  "comment_mentions",
  "notifications",
  "mediaGalleryItems",
] as const;

const KEEP_BACKUPS = 3;

export const exportAllForBackup = internalQuery({
  args: {},
  handler: async (ctx) => {
    const result: Record<string, unknown[]> = {};
    for (const table of TABLES) {
      result[table] = await ctx.db.query(table as any).collect();
    }
    return result;
  },
});

export const recordBackup = internalMutation({
  args: { storageId: v.id("_storage"), sizeBytes: v.number() },
  handler: async (ctx, { storageId, sizeBytes }) => {
    await ctx.db.insert("backups", {
      storageId,
      createdAt: Date.now(),
      sizeBytes,
    });

    // Retention: keep only the most recent KEEP_BACKUPS snapshots.
    const all = await ctx.db.query("backups").order("desc").collect();
    for (const stale of all.slice(KEEP_BACKUPS)) {
      await ctx.storage.delete(stale.storageId);
      await ctx.db.delete(stale._id);
    }
  },
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Same Brevo Transactional Email API + env vars as convex/comments.ts
// (BREVO_API_KEY, MAIL_FROM). Recipient defaults to Honza's address but can
// be overridden with BACKUP_EMAIL without a code change.
async function sendBackupEmail(payload: {
  url: string | null;
  sizeBytes: number;
  tableCounts: Record<string, number>;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("BREVO_API_KEY not set — skipping backup email");
    return;
  }
  const fromStr = process.env.MAIL_FROM;
  if (!fromStr) {
    console.warn("MAIL_FROM not set — skipping backup email");
    return;
  }
  const match = fromStr.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const from = match ? { name: match[1] || "Notifications", email: match[2] } : { name: "Notifications", email: fromStr.trim() };
  const toEmail = process.env.BACKUP_EMAIL || "honza.hrodek@gmail.com";

  const now = new Date();
  const monthLabel = now.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  const rows = Object.entries(payload.tableCounts)
    .map(([table, count]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">${table}</td><td style="padding:4px 0;text-align:right;font-weight:600;">${count}</td></tr>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><title>Měsíční záloha appky</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;">📦 Měsíční záloha — ${escapeHtml(monthLabel)}</h1>
  </div>
  <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:15px;margin-bottom:20px;">
      Automatická měsíční záloha dat proběhla úspěšně. Velikost souboru: <strong>${formatBytes(payload.sizeBytes)}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:25px;">${rows}</table>
    ${payload.url ? `<div style="text-align:center;margin:30px 0;"><a href="${payload.url}" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:14px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:16px;">Stáhnout zálohu (JSON)</a></div>` : "<p>Odkaz ke stažení se nepodařilo vytvořit.</p>"}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
    <p style="font-size:13px;color:#6b7280;margin:0;">
      Convex si navíc drží vlastní denní snapshoty databáze (Dashboard → Backups) — tohle je doplňková měsíční záloha ke stažení.
      Uchováváme posledních ${KEEP_BACKUPS} měsíčních záloh.
    </p>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: from,
      to: [{ email: toEmail }],
      subject: `Měsíční záloha appky — ${monthLabel}`,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const runMonthlyBackup = internalAction({
  args: {},
  handler: async (ctx) => {
    const data = await ctx.runQuery(internal.backups.exportAllForBackup, {});
    const tableCounts = Object.fromEntries(
      Object.entries(data).map(([table, rows]) => [table, (rows as unknown[]).length]),
    );

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      tables: tableCounts,
      data,
    };
    const json = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([json], { type: "application/json" });

    const storageId = await ctx.storage.store(blob);
    await ctx.runMutation(internal.backups.recordBackup, {
      storageId,
      sizeBytes: blob.size,
    });

    const url = await ctx.storage.getUrl(storageId);
    await sendBackupEmail({ url, sizeBytes: blob.size, tableCounts });
  },
});
