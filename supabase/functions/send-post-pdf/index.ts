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
  postTitle: string
  postContent?: string
  postPlatform?: string
  postAuthor?: string
  postDate?: string
  postImages?: string[]
  postCategory?: string
  postPillar?: string
  postStatus?: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildFacebookHtml(p: SendPostPdfPayload): string {
  const authorInitials = p.postAuthor ? p.postAuthor.slice(0, 2).toUpperCase() : 'SC'
  const authorName = escapeHtml(p.postAuthor || 'Social Canvas')
  const title = escapeHtml(p.postTitle || '')
  const content = p.postContent ? escapeHtml(p.postContent) : ''
  const date = p.postDate || ''
  const images = (p.postImages || []).filter(Boolean)

  // Tags
  const tags: string[] = []
  if (p.postPlatform) tags.push(`<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#E7F3FF;color:#1877F2;font-weight:600;">${escapeHtml(p.postPlatform)}</span>`)
  if (p.postCategory) tags.push(`<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#F0F2F5;color:#65676B;font-weight:600;">${escapeHtml(p.postCategory)}</span>`)
  if (p.postPillar && p.postPillar !== 'none') tags.push(`<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#FFF3E0;color:#E65100;font-weight:600;">${escapeHtml(p.postPillar)}</span>`)
  if (p.postStatus) tags.push(`<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#E8F5E9;color:#2E7D32;font-weight:600;">${escapeHtml(p.postStatus)}</span>`)

  // Image HTML
  let imageHtml = ''
  if (images.length === 1) {
    imageHtml = `<img src="${images[0]}" alt="Post" style="width:100%;max-height:500px;object-fit:cover;display:block;" />`
  } else if (images.length === 2) {
    imageHtml = `<table cellpadding="0" cellspacing="1" width="100%"><tr>
      <td width="50%"><img src="${images[0]}" alt="Post 1" style="width:100%;height:250px;object-fit:cover;display:block;" /></td>
      <td width="50%"><img src="${images[1]}" alt="Post 2" style="width:100%;height:250px;object-fit:cover;display:block;" /></td>
    </tr></table>`
  } else if (images.length >= 3) {
    imageHtml = `<table cellpadding="0" cellspacing="1" width="100%"><tr>
      <td width="60%" rowspan="2"><img src="${images[0]}" alt="Post 1" style="width:100%;height:301px;object-fit:cover;display:block;" /></td>
      <td width="40%"><img src="${images[1]}" alt="Post 2" style="width:100%;height:150px;object-fit:cover;display:block;" /></td>
    </tr><tr>
      <td width="40%"><img src="${images[2]}" alt="Post 3" style="width:100%;height:150px;object-fit:cover;display:block;" /></td>
    </tr></table>`
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Helvetica, Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px 0;">
  <table cellpadding="0" cellspacing="0" width="500" align="center" style="background:#ffffff;border-radius:8px;border:1px solid #dddfe2;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td style="padding:12px 16px;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="48" valign="top">
              <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1877F2,#42a5f5);text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">${authorInitials}</div>
            </td>
            <td style="padding-left:8px;" valign="middle">
              <div style="font-weight:600;font-size:14px;color:#050505;">${authorName}</div>
              <div style="font-size:12px;color:#65676B;">${escapeHtml(date)} &middot; &#127760;</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Title & Content -->
    <tr>
      <td style="padding:0 16px 12px;">
        <div style="font-size:15px;color:#050505;font-weight:600;margin-bottom:4px;">${title}</div>
        ${content ? `<div style="font-size:14px;color:#050505;line-height:1.4;white-space:pre-wrap;">${content}</div>` : ''}
      </td>
    </tr>

    <!-- Tags -->
    ${tags.length > 0 ? `<tr><td style="padding:0 16px 10px;">${tags.join(' ')}</td></tr>` : ''}

    <!-- Images -->
    ${imageHtml ? `<tr><td style="padding:0;">${imageHtml}</td></tr>` : ''}

    <!-- Reaction bar -->
    <tr>
      <td style="padding:8px 16px;border-top:1px solid #dddfe2;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="font-size:13px;color:#65676B;">Social Canvas Calendar</td>
            <td align="right" style="font-size:11px;color:#65676B;">Naplanovano</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Action buttons -->
    <tr>
      <td style="border-top:1px solid #dddfe2;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="33%" align="center" style="padding:10px 0;font-size:13px;font-weight:600;color:#65676B;">&#128077; To se mi libi</td>
            <td width="34%" align="center" style="padding:10px 0;font-size:13px;font-weight:600;color:#65676B;border-left:1px solid #dddfe2;border-right:1px solid #dddfe2;">&#128172; Komentar</td>
            <td width="33%" align="center" style="padding:10px 0;font-size:13px;font-weight:600;color:#65676B;">&#8617; Sdilet</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <table cellpadding="0" cellspacing="0" width="500" align="center" style="margin-top:16px;">
    <tr>
      <td align="center" style="font-size:12px;color:#9ca3af;font-family:Helvetica,Arial,sans-serif;">
        Odeslano ze Social Canvas Calendar
      </td>
    </tr>
  </table>
</body>
</html>`
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

    const emailHtml = buildFacebookHtml(body)

    // Build email payload
    const emailPayload: Record<string, unknown> = {
      from: 'Social Canvas <onboarding@resend.dev>',
      to: recipients,
      subject: `Post ke schvaleni: ${body.postTitle}`,
      html: emailHtml,
    }

    // Attach PDF if provided
    if (body.pdfBase64) {
      const fileName = `post-${body.postTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`
      emailPayload.attachments = [{ filename: fileName, content: body.pdfBase64 }]
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
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
