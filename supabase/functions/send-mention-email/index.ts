// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Odesílací adresa. Doména socka.site musí být ověřená v Resend (SPF, DKIM, DMARC).
// Lze přepsat přes secret EMAIL_FROM, jinak se použije info@socka.site.
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'Social Canvas <info@socka.site>'

// Kam odkazuje tlačítko v e-mailu. Lze přepsat přes secret APP_URL.
const APP_URL = Deno.env.get('APP_URL') || 'https://drumdrone.github.io/social-canvas-calendar'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

interface DirectPayload {
  mentionedAuthorEmail: string
  mentionedAuthorName?: string
  postTitle?: string
  commentText: string
  commenterName?: string
}

interface NotificationPayload {
  notification_id: string
}

// Sestaví HTML e-mailu pro zmínku v komentáři.
function buildEmailHtml(params: {
  recipientName: string
  authorName: string
  commentContent: string
  postTitle: string
  postId?: string
}): string {
  const { recipientName, authorName, commentContent, postTitle, postId } = params
  const postUrl = `${APP_URL}/post/${postId || ''}`
  const settingsUrl = `${APP_URL}/settings`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You were mentioned in a comment</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📢 Byli jste zmíněni!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Ahoj <strong>${recipientName}</strong>,
    </p>

    <p style="font-size: 16px; margin-bottom: 25px;">
      <strong>${authorName}</strong> tě zmínil(a) v komentáři u příspěvku <strong>"${postTitle}"</strong>:
    </p>

    <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${commentContent}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${postUrl}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        Zobrazit komentář
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 13px; color: #6b7280; margin: 0;">
      Tento e-mail jsi dostal(a), protože tě někdo zmínil v komentáři.
      Notifikace lze vypnout v <a href="${settingsUrl}" style="color: #667eea;">Nastavení</a>.
    </p>
  </div>
</body>
</html>
  `
}

// Odešle e-mail přes Resend. Vrací id odeslaného e-mailu.
async function sendViaResend(params: {
  to: string
  subject: string
  html: string
}): Promise<string> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY není nastavený (Supabase secret).')
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text()
    console.error('Resend API error:', errorText)
    throw new Error(`Resend API error: ${errorText}`)
  }

  const resendData = await resendResponse.json()
  console.log('Email sent successfully:', resendData)
  return resendData.id
}

// Přímý režim: frontend pošle rovnou příjemce a text komentáře.
// Používá panel "Comments & Discussion" (tabulka authors, @INICIÁLY).
async function handleDirect(payload: DirectPayload): Promise<Response> {
  const {
    mentionedAuthorEmail,
    mentionedAuthorName,
    postTitle,
    commentText,
    commenterName,
  } = payload

  if (!mentionedAuthorEmail || !commentText) {
    return new Response(
      JSON.stringify({
        error: 'mentionedAuthorEmail a commentText jsou povinné',
      }),
      { status: 400, headers: jsonHeaders },
    )
  }

  const html = buildEmailHtml({
    recipientName: mentionedAuthorName || 'člene týmu',
    authorName: commenterName || 'Někdo',
    commentContent: commentText,
    postTitle: postTitle || 'příspěvku',
  })

  const emailId = await sendViaResend({
    to: mentionedAuthorEmail,
    subject: `${commenterName || 'Někdo'} tě zmínil v "${postTitle || 'příspěvku'}"`,
    html,
  })

  return new Response(
    JSON.stringify({ success: true, message: 'Email sent successfully', email_id: emailId }),
    { status: 200, headers: jsonHeaders },
  )
}

// Režim přes DB záznam notifikace.
// Používá panel "Team Mentions & Notifications" (user_profiles, notifications).
async function handleNotification(notification_id: string): Promise<Response> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .select(`
      *,
      user:user_profiles!notifications_user_id_fkey(*),
      comment:comments!notifications_comment_id_fkey(
        *,
        author:user_profiles!comments_author_id_fkey(*)
      ),
      post:social_media_posts!notifications_post_id_fkey(*)
    `)
    .eq('id', notification_id)
    .single()

  if (notificationError || !notification) {
    console.error('Error fetching notification:', notificationError)
    return new Response(
      JSON.stringify({ error: 'Notification not found' }),
      { status: 404, headers: jsonHeaders },
    )
  }

  // E-mail už byl odeslaný
  if (notification.email_sent) {
    return new Response(
      JSON.stringify({ message: 'Email already sent' }),
      { status: 200, headers: jsonHeaders },
    )
  }

  // Uživatel má notifikace vypnuté
  if (!notification.user?.notification_enabled) {
    console.log('User has notifications disabled')
    await supabase
      .from('notifications')
      .update({ email_sent: true })
      .eq('id', notification_id)

    return new Response(
      JSON.stringify({ message: 'User has notifications disabled' }),
      { status: 200, headers: jsonHeaders },
    )
  }

  const recipientEmail = notification.user?.email
  const html = buildEmailHtml({
    recipientName: notification.user?.full_name || 'člene týmu',
    authorName: notification.comment?.author?.full_name || 'Někdo',
    commentContent: notification.comment?.content || '',
    postTitle: notification.post?.title || 'příspěvku',
    postId: notification.post?.id,
  })

  const emailId = await sendViaResend({
    to: recipientEmail,
    subject: `${notification.comment?.author?.full_name || 'Někdo'} tě zmínil v "${notification.post?.title || 'příspěvku'}"`,
    html,
  })

  const { error: updateError } = await supabase
    .from('notifications')
    .update({ email_sent: true })
    .eq('id', notification_id)

  if (updateError) {
    console.error('Error updating notification:', updateError)
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Email sent successfully', email_id: emailId }),
    { status: 200, headers: jsonHeaders },
  )
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const body = await req.json()

    // Rozliš režim podle payloadu.
    if (body?.mentionedAuthorEmail) {
      return await handleDirect(body as DirectPayload)
    }

    if (body?.notification_id) {
      return await handleNotification((body as NotificationPayload).notification_id)
    }

    return new Response(
      JSON.stringify({
        error:
          'Neplatný payload. Očekává se buď { mentionedAuthorEmail, commentText, ... } nebo { notification_id }.',
      }),
      { status: 400, headers: jsonHeaders },
    )
  } catch (error) {
    console.error('Error in send-mention-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: jsonHeaders },
    )
  }
})
