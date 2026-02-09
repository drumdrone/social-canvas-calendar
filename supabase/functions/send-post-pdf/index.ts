import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendPostPdfPayload {
  emails: string[]
  email?: string
  pdfBase64?: string
  screenshotBase64?: string
  postTitle: string
  postContent?: string
  postPlatform?: string
  postAuthor?: string
  postDate?: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

    const recipients = body.emails?.length ? body.emails : body.email ? [body.email] : []

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'emails are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const title = escapeHtml(body.postTitle || '')

    // Email HTML: show screenshot as inline image
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Helvetica, Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px 0;">
  <table cellpadding="0" cellspacing="0" width="520" align="center">
    <tr>
      <td style="padding-bottom:12px;font-size:14px;color:#65676B;">
        Post <strong>${title}</strong> ke schvaleni:
      </td>
    </tr>
    <tr>
      <td>
        <img src="cid:post-screenshot" alt="Post preview" style="width:100%;max-width:500px;border-radius:8px;border:1px solid #dddfe2;display:block;" />
      </td>
    </tr>
    <tr>
      <td style="padding-top:16px;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="font-size:12px;color:#9ca3af;">
              Odeslano ze Social Canvas Calendar
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    // Build attachments
    const attachments: Array<Record<string, string>> = []

    // Inline screenshot image
    if (body.screenshotBase64) {
      attachments.push({
        filename: 'post-preview.png',
        content: body.screenshotBase64,
        content_id: 'post-screenshot',
      })
    }

    // PDF attachment
    if (body.pdfBase64) {
      const fileName = `post-${body.postTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`
      attachments.push({
        filename: fileName,
        content: body.pdfBase64,
      })
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Social Canvas <onboarding@resend.dev>',
        to: recipients,
        subject: `Post ke schvaleni: ${body.postTitle}`,
        html: emailHtml,
        attachments,
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
    console.log('Email sent to', recipients.length, 'recipients:', resendData)

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
