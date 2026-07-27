// Sends an email notification when someone is @mentioned in a post comment.
//
// Deploy:  supabase functions deploy send-mention-email
// Secrets: supabase secrets set RESEND_API_KEY=re_...
//          (optional) MENTION_FROM_EMAIL, MENTION_FROM_NAME, MENTION_REPLY_TO, APP_URL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// All comment notifications are sent from info@socka.site.
const FROM_EMAIL = Deno.env.get('MENTION_FROM_EMAIL') ?? 'info@socka.site'
const FROM_NAME = Deno.env.get('MENTION_FROM_NAME') ?? 'Socka – Social Canvas Calendar'
const REPLY_TO = Deno.env.get('MENTION_REPLY_TO') ?? FROM_EMAIL
const APP_URL =
  Deno.env.get('APP_URL') ?? 'https://drumdrone.github.io/social-canvas-calendar'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

interface MentionEmailPayload {
  mentionedAuthorEmail: string
  mentionedAuthorName?: string
  postId?: string | null
  postTitle?: string
  commentText: string
  commenterName?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function buildEmailHtml(payload: {
  recipientName: string
  commenterName: string
  postTitle: string
  commentText: string
  postUrl: string
}): string {
  const recipientName = escapeHtml(payload.recipientName)
  const commenterName = escapeHtml(payload.commenterName)
  const postTitle = escapeHtml(payload.postTitle)
  const commentText = escapeHtml(payload.commentText)

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Byli jste označeni v komentáři</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f6f7f9;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 28px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 22px;">📢 Byli jste označeni v komentáři</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin: 0 0 18px;">Ahoj <strong>${recipientName}</strong>,</p>

    <p style="font-size: 16px; margin: 0 0 22px;">
      <strong>${commenterName}</strong> vás označil(a) v komentáři u příspěvku
      <strong>„${postTitle}"</strong>:
    </p>

    <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 18px; margin: 22px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${commentText}</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${payload.postUrl}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        Otevřít příspěvek
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">

    <p style="font-size: 13px; color: #6b7280; margin: 0;">
      Tento email jste dostali, protože vás někdo označil (@) v komentáři v kalendáři.
      Odpovědi směřujte na <a href="mailto:${escapeHtml(REPLY_TO)}" style="color: #667eea;">${escapeHtml(REPLY_TO)}</a>.
    </p>
  </div>
</body>
</html>`
}

serve(async (req) => {
  // CORS preflight – required for supabase.functions.invoke() from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured')
      return jsonResponse(
        {
          success: false,
          error:
            'RESEND_API_KEY není nastavený. Spusťte: supabase secrets set RESEND_API_KEY=re_...',
        },
        500
      )
    }

    const payload = (await req.json()) as MentionEmailPayload

    const recipientEmail = (payload.mentionedAuthorEmail || '').trim()
    const commentText = (payload.commentText || '').trim()

    if (!recipientEmail || !EMAIL_RE.test(recipientEmail)) {
      return jsonResponse(
        { success: false, error: 'Chybí nebo je neplatný mentionedAuthorEmail' },
        400
      )
    }

    if (!commentText) {
      return jsonResponse({ success: false, error: 'Chybí commentText' }, 400)
    }

    const recipientName = payload.mentionedAuthorName?.trim() || recipientEmail
    const commenterName = payload.commenterName?.trim() || 'Někdo z týmu'
    const postTitle = payload.postTitle?.trim() || 'příspěvek'
    const postUrl = payload.postId ? `${APP_URL}/post/${payload.postId}` : APP_URL

    const html = buildEmailHtml({
      recipientName,
      commenterName,
      postTitle,
      commentText,
      postUrl,
    })

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        reply_to: REPLY_TO,
        to: [recipientEmail],
        subject: `${commenterName} vás označil(a) v komentáři: „${postTitle}"`,
        html,
      }),
    })

    const resendBody = await resendResponse.json().catch(() => null)

    if (!resendResponse.ok) {
      const resendError =
        resendBody?.message || resendBody?.error || `HTTP ${resendResponse.status}`
      console.error('Resend API error:', resendResponse.status, resendBody)

      const isDomainIssue =
        typeof resendError === 'string' &&
        /domain|verify|testing emails/i.test(resendError)

      return jsonResponse(
        {
          success: false,
          error: isDomainIssue
            ? `Doména odesílatele (${FROM_EMAIL}) není v Resendu ověřená: ${resendError}`
            : `Resend: ${resendError}`,
        },
        502
      )
    }

    console.log('Mention email sent', {
      to: recipientEmail,
      from: FROM_EMAIL,
      id: resendBody?.id,
    })

    return jsonResponse({
      success: true,
      message: 'Email odeslán',
      email_id: resendBody?.id ?? null,
      from: FROM_EMAIL,
    })
  } catch (error) {
    console.error('Error in send-mention-email function:', error)
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    )
  }
})
