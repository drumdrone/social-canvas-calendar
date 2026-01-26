// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface NotificationPayload {
  notification_id: string
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Parse request body
    const { notification_id } = await req.json() as NotificationPayload

    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: 'notification_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch notification details with all related data
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
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if email already sent
    if (notification.email_sent) {
      return new Response(
        JSON.stringify({ message: 'Email already sent' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has notifications enabled
    if (!notification.user?.notification_enabled) {
      console.log('User has notifications disabled')

      // Mark as sent so we don't try again
      await supabase
        .from('notifications')
        .update({ email_sent: true })
        .eq('id', notification_id)

      return new Response(
        JSON.stringify({ message: 'User has notifications disabled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract data
    const recipientEmail = notification.user?.email
    const recipientName = notification.user?.full_name || 'Team Member'
    const authorName = notification.comment?.author?.full_name || 'Someone'
    const commentContent = notification.comment?.content || ''
    const postTitle = notification.post?.title || 'a post'
    const postId = notification.post?.id

    // Create email HTML
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
      Hi <strong>${recipientName}</strong>,
    </p>

    <p style="font-size: 16px; margin-bottom: 25px;">
      <strong>${authorName}</strong> mentioned you in a comment on <strong>"${postTitle}"</strong>:
    </p>

    <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${commentContent}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://drumdrone.github.io/social-canvas-calendar/post/${postId || ''}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        View Comment
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 13px; color: #6b7280; margin: 0;">
      You're receiving this email because you were mentioned in a comment.
      To stop receiving these notifications, go to <a href="https://drumdrone.github.io/social-canvas-calendar/settings" style="color: #667eea;">Settings</a> and disable notifications.
    </p>
  </div>
</body>
</html>
    `

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Social Canvas Calendar <notifications@yourdomain.com>',
        to: [recipientEmail],
        subject: `${authorName} mentioned you in "${postTitle}"`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('Resend API error:', errorText)
      throw new Error(`Resend API error: ${errorText}`)
    }

    const resendData = await resendResponse.json()
    console.log('Email sent successfully:', resendData)

    // Mark email as sent in database
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ email_sent: true })
      .eq('id', notification_id)

    if (updateError) {
      console.error('Error updating notification:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email_id: resendData.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-mention-email function:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
