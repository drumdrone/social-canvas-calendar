// Supabase Edge Function: send-mention-email
// Sends an email notification via Resend when a team member is @mentioned in a comment.
// Stateless: receives the recipient and comment content directly in the request body.
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
// Sender address. Use a verified Resend domain in production.
// Falls back to Resend's shared test sender (only delivers to your own verified address).
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Social Canvas Calendar <onboarding@resend.dev>'
// Base URL of the deployed app, used for links in the email.
const APP_URL = (Deno.env.get('APP_URL') || 'https://drumdrone.github.io/social-canvas-calendar').replace(/\/$/, '')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

interface MentionPayload {
  mentionedAuthorEmail: string
  mentionedAuthorName?: string
  postTitle?: string
  commentText: string
  commenterName?: string
  postId?: string
}

// Escape user-supplied text before interpolating into HTML.
function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return json({ error: 'Email service not configured: RESEND_API_KEY missing' }, 500)
    }

    const payload = (await req.json()) as Partial<MentionPayload>
    const {
      mentionedAuthorEmail,
      mentionedAuthorName,
      postTitle,
      commentText,
      commenterName,
      postId,
    } = payload

    // Validate required fields
    if (!mentionedAuthorEmail || !commentText) {
      return json(
        { error: 'mentionedAuthorEmail and commentText are required' },
        400,
      )
    }

    const recipientName = mentionedAuthorName?.trim() || 'Team Member'
    const authorName = commenterName?.trim() || 'Someone'
    const safePostTitle = postTitle?.trim() || 'a post'

    // Build email content (escape all user-supplied values)
    const eRecipient = escapeHtml(recipientName)
    const eAuthor = escapeHtml(authorName)
    const eTitle = escapeHtml(safePostTitle)
    const eComment = escapeHtml(commentText)
    const postUrl = `${APP_URL}/post/${encodeURIComponent(postId || '')}`
    const settingsUrl = `${APP_URL}/settings`

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You were mentioned in a comment</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📢 You were mentioned!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi <strong>${eRecipient}</strong>,
    </p>

    <p style="font-size: 16px; margin-bottom: 25px;">
      <strong>${eAuthor}</strong> mentioned you in a comment on <strong>"${eTitle}"</strong>:
    </p>

    <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${eComment}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${postUrl}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        View Comment
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 13px; color: #6b7280; margin: 0;">
      You're receiving this email because you were mentioned in a comment.
      To stop receiving these notifications, go to <a href="${settingsUrl}" style="color: #667eea;">Settings</a> and disable notifications.
    </p>
  </div>
</body>
</html>
    `

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [mentionedAuthorEmail],
        subject: `${authorName} mentioned you in "${safePostTitle}"`,
        html: emailHtml,
      }),
    })

    const resendData = await resendResponse.json().catch(() => ({}))

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResponse.status, resendData)
      // Surface Resend's message so the client can distinguish domain/test-mode issues.
      const message =
        (resendData && (resendData.message || resendData.error)) ||
        `Resend API error (status ${resendResponse.status})`
      return json({ error: message }, 502)
    }

    console.log('Email sent successfully:', resendData?.id)

    return json({
      success: true,
      message: 'Email sent successfully',
      email_id: resendData?.id,
    })
  } catch (error) {
    console.error('Error in send-mention-email function:', error)
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500,
    )
  }
})
