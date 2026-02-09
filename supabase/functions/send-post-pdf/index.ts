import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

interface SendPostPayload {
  emails: string[]
  email?: string
  screenshotBase64?: string
  postTitle: string
  appUrl?: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), { status: 200, headers: jsonHeaders })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json() as SendPostPayload

    const recipients = body.emails?.length ? body.emails : body.email ? [body.email] : []

    if (recipients.length === 0) {
      return ok({ error: 'Zadejte alespon jeden email.' })
    }

    if (!RESEND_API_KEY) {
      return ok({ error: 'RESEND_API_KEY neni nastaveny na serveru.' })
    }

    const title = escapeHtml(body.postTitle || '')
    const appLink = body.appUrl || ''

    // Check screenshot size - warn if too large (> 1MB base64 ~ 750KB image)
    const screenshotSize = body.screenshotBase64?.length || 0
    console.log(`Screenshot base64 size: ${screenshotSize} chars (${Math.round(screenshotSize / 1024)}KB)`)

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
    ${body.screenshotBase64 ? `<tr>
      <td>
        <img src="cid:post-screenshot" alt="Post preview" style="width:100%;max-width:500px;border-radius:8px;border:1px solid #dddfe2;display:block;" />
      </td>
    </tr>` : ''}
    ${appLink ? `<tr>
      <td style="padding-top:16px;text-align:center;">
        <a href="${escapeHtml(appLink)}" style="display:inline-block;background:#1877F2;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Otevrit v Social Canvas</a>
      </td>
    </tr>` : ''}
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

    const attachments: Array<Record<string, string>> = []

    if (body.screenshotBase64) {
      // Detect format from base64 header or default to JPEG
      const isJpeg = !body.screenshotBase64.startsWith('iVBOR') // PNG starts with iVBOR in base64
      attachments.push({
        filename: isJpeg ? 'post-preview.jpg' : 'post-preview.png',
        content: body.screenshotBase64,
        content_type: isJpeg ? 'image/jpeg' : 'image/png',
        content_id: 'post-screenshot',
      })
    }

    console.log(`Sending email to ${recipients.length} recipients: ${recipients.join(', ')}`)
    console.log(`Attachments: ${attachments.length}, has screenshot: ${!!body.screenshotBase64}`)

    const resendPayload = {
      from: 'Social Canvas <onboarding@resend.dev>',
      to: recipients,
      subject: `Post ke schvaleni: ${body.postTitle}`,
      html: emailHtml,
      attachments,
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    })

    const resendText = await resendResponse.text()
    console.log(`Resend response status: ${resendResponse.status}, body: ${resendText}`)

    if (!resendResponse.ok) {
      let errorDetail = resendText
      try {
        const parsed = JSON.parse(resendText)
        errorDetail = parsed.message || parsed.error || resendText
      } catch { /* use raw text */ }
      return ok({ error: `Resend API (${resendResponse.status}): ${errorDetail}` })
    }

    let resendData: Record<string, unknown> = {}
    try {
      resendData = JSON.parse(resendText)
    } catch { /* ignore parse error */ }

    return ok({ success: true, email_id: resendData.id, recipients: recipients.length })
  } catch (error) {
    console.error('Error in send-post-pdf:', error)
    return ok({ error: error.message || 'Internal server error' })
  }
})
