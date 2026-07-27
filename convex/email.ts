import { v } from 'convex/values';
import { action } from './_generated/server';

/**
 * Email sending via Resend. Replaces the Supabase edge functions
 * `send-mention-email` and `send-post-pdf`.
 *
 * Convex environment variables:
 *   RESEND_API_KEY        (required)
 *   MENTION_FROM_EMAIL    (default info@socka.site)
 *   MENTION_FROM_NAME     (default "Socka – Social Canvas Calendar")
 *   MENTION_REPLY_TO      (default = MENTION_FROM_EMAIL)
 *   APP_URL               (default GitHub Pages URL)
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fromEmail() {
  return process.env.MENTION_FROM_EMAIL ?? 'info@socka.site';
}

function fromName() {
  return process.env.MENTION_FROM_NAME ?? 'Socka – Social Canvas Calendar';
}

function replyTo() {
  return process.env.MENTION_REPLY_TO ?? fromEmail();
}

function appUrl() {
  return process.env.APP_URL ?? 'https://drumdrone.github.io/social-canvas-calendar';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
  attachments?: Array<Record<string, string>>;
}

async function sendViaResend(payload: ResendPayload) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false as const,
      error:
        'RESEND_API_KEY není nastavený v Convexu (Settings → Environment Variables).',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body?.message || body?.error || `Resend HTTP ${response.status}`;
    console.error('Resend API error', response.status, body);

    const isDomainIssue =
      typeof message === 'string' && /domain|verify|testing emails/i.test(message);

    return {
      success: false as const,
      error: isDomainIssue
        ? `Doména odesílatele (${fromEmail()}) není v Resendu ověřená: ${message}`
        : `Resend: ${message}`,
    };
  }

  return { success: true as const, email_id: body?.id ?? null };
}

/** Notification for an @mention in a post comment. */
export const sendMentionEmail = action({
  args: {
    mentionedAuthorEmail: v.string(),
    mentionedAuthorName: v.optional(v.string()),
    postId: v.optional(v.union(v.string(), v.null())),
    postTitle: v.optional(v.string()),
    commentText: v.string(),
    commenterName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const recipient = args.mentionedAuthorEmail.trim();
    const commentText = args.commentText.trim();

    if (!EMAIL_RE.test(recipient)) {
      return { success: false, error: 'Neplatná emailová adresa příjemce' };
    }

    if (!commentText) {
      return { success: false, error: 'Chybí text komentáře' };
    }

    const recipientName = escapeHtml(args.mentionedAuthorName?.trim() || recipient);
    const commenterName = escapeHtml(args.commenterName?.trim() || 'Někdo z týmu');
    const postTitle = escapeHtml(args.postTitle?.trim() || 'příspěvek');
    const postUrl = args.postId ? `${appUrl()}/post/${args.postId}` : appUrl();

    const html = `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f6f7f9;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 28px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 22px;">📢 Byli jste označeni v komentáři</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin: 0 0 18px;">Ahoj <strong>${recipientName}</strong>,</p>
    <p style="font-size: 16px; margin: 0 0 22px;">
      <strong>${commenterName}</strong> vás označil(a) v komentáři u příspěvku <strong>„${postTitle}"</strong>:
    </p>
    <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 18px; margin: 22px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${escapeHtml(commentText)}</p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${postUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Otevřít příspěvek</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">
    <p style="font-size: 13px; color: #6b7280; margin: 0;">
      Tento email jste dostali, protože vás někdo označil (@) v komentáři v kalendáři.
      Odpovědi směřujte na <a href="mailto:${escapeHtml(replyTo())}" style="color: #667eea;">${escapeHtml(replyTo())}</a>.
    </p>
  </div>
</body>
</html>`;

    const result = await sendViaResend({
      from: `${fromName()} <${fromEmail()}>`,
      reply_to: replyTo(),
      to: [recipient],
      subject: `${args.commenterName?.trim() || 'Někdo z týmu'} vás označil(a) v komentáři: „${args.postTitle?.trim() || 'příspěvek'}"`,
      html,
    });

    return { ...result, from: fromEmail() };
  },
});

/** Sends a post preview + PDF to reviewers. */
export const sendPostPdf = action({
  args: {
    emails: v.array(v.string()),
    pdfBase64: v.optional(v.string()),
    screenshotBase64: v.optional(v.string()),
    postTitle: v.string(),
    postContent: v.optional(v.union(v.string(), v.null())),
    postPlatform: v.optional(v.union(v.string(), v.null())),
    postAuthor: v.optional(v.union(v.string(), v.null())),
    postDate: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (_ctx, args) => {
    const recipients = args.emails.map((email) => email.trim()).filter((email) =>
      EMAIL_RE.test(email)
    );

    if (recipients.length === 0) {
      return { success: false, error: 'Chybí platná emailová adresa' };
    }

    const title = escapeHtml(args.postTitle || '');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Helvetica, Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px 0;">
  <table cellpadding="0" cellspacing="0" width="520" align="center">
    <tr><td style="padding-bottom:12px;font-size:14px;color:#65676B;">Post <strong>${title}</strong> ke schválení:</td></tr>
    <tr><td><img src="cid:post-screenshot" alt="Post preview" style="width:100%;max-width:500px;border-radius:8px;border:1px solid #dddfe2;display:block;" /></td></tr>
    <tr><td align="center" style="padding-top:16px;font-size:12px;color:#9ca3af;">Odesláno ze Social Canvas Calendar</td></tr>
  </table>
</body>
</html>`;

    const attachments: Array<Record<string, string>> = [];

    if (args.screenshotBase64) {
      attachments.push({
        filename: 'post-preview.png',
        content: args.screenshotBase64,
        content_id: 'post-screenshot',
      });
    }

    if (args.pdfBase64) {
      attachments.push({
        filename: `post-${args.postTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`,
        content: args.pdfBase64,
      });
    }

    const result = await sendViaResend({
      from: `${fromName()} <${fromEmail()}>`,
      reply_to: replyTo(),
      to: recipients,
      subject: `Post ke schválení: ${args.postTitle}`,
      html,
      attachments,
    });

    return { ...result, recipients: recipients.length };
  },
});
