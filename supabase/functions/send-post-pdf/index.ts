import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendPostPdfPayload {
  emails: string[]
  email?: string // backward compat
  pdfBase64: string
  postTitle: string
  postContent?: string
  postPlatform?: string
  postAuthor?: string
  postDate?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json() as SendPostPdfPayload

    // Support both `emails` array and legacy single `email`
    const recipients = body.emails?.length ? body.emails : body.email ? [body.email] : []
    const { pdfBase64, postTitle, postContent, postPlatform, postAuthor, postDate } = body

    if (recipients.length === 0 || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'emails and pdfBase64 are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured. Set it with: supabase secrets set RESEND_API_KEY=re_...' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fileName = `post-${postTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1877F2 0%, #42a5f5 100%); padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Social Canvas - Post ke schvaleni</h1>
  </div>
  <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 15px; margin-bottom: 16px;">
      Posilame Vam post <strong>"${postTitle}"</strong> ke schvaleni.
    </p>
    ${postPlatform ? `<p style="font-size: 14px; color: #65676B; margin-bottom: 8px;">Platforma: <strong>${postPlatform}</strong></p>` : ''}
    ${postAuthor ? `<p style="font-size: 14px; color: #65676B; margin-bottom: 8px;">Autor: <strong>${postAuthor}</strong></p>` : ''}
    ${postDate ? `<p style="font-size: 14px; color: #65676B; margin-bottom: 8px;">Naplanovano: <strong>${postDate}</strong></p>` : ''}
    ${postContent ? `
    <div style="background: #f9fafb; border-left: 4px solid #1877F2; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; white-space: pre-wrap;">${postContent}</p>
    </div>
    ` : ''}
    <p style="font-size: 14px; color: #65676B; margin-top: 16px;">
      PDF s nahledem postu je prilozen k tomuto emailu.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      Odeslano ze Social Canvas Calendar
    </p>
  </div>
</body>
</html>`

    // Send email to all recipients via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Social Canvas <onboarding@resend.dev>',
        to: recipients,
        subject: `Post ke schvaleni: ${postTitle}`,
        html: emailHtml,
        attachments: [
          {
            filename: fileName,
            content: pdfBase64,
          },
        ],
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('Resend API error:', errorText)
      return new Response(
        JSON.stringify({ error: `Email se nepodarilo odeslat: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendData = await resendResponse.json()
    console.log('Email sent successfully to', recipients.length, 'recipients:', resendData)

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id, recipients: recipients.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-post-pdf:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
