# Resend Email Setup Guide

The comment mention system uses Resend to send email notifications from
`info@socka.site`.

## How it works

```
Uživatel napíše komentář a zmíní @JH
        │
        ▼
Frontend najde @zmínky → dohledá e-mail (tabulka `authors`)
        │
        ▼
Edge Function `send-mention-email`
        │
        ▼
Resend API → from: "Social Canvas <info@socka.site>"
        │
        ▼
📧 e-mail dorazí zmíněnému členovi týmu
```

The edge function accepts **two payload shapes** so both comment panels work:

- **Direct** (panel „Comments & Discussion", `@INICIÁLY`):
  `{ mentionedAuthorEmail, mentionedAuthorName, postTitle, commentText, commenterName }`
- **Notification record** (panel „Team Mentions", `@Jméno`):
  `{ notification_id }`

## Step 1: Verify the socka.site domain in Resend

1. Go to [Resend Domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter `socka.site`
4. Add the DNS records provided by Resend to the socka.site DNS zone:
   - SPF record
   - DKIM record(s)
   - DMARC record
5. Wait for verification (usually a few minutes)

Once verified, the function sends from `info@socka.site` automatically —
no code change needed. To use a different address, set the `EMAIL_FROM`
secret (see Step 2).

## Step 2: Configure Supabase secrets

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
# optional overrides:
supabase secrets set EMAIL_FROM="Social Canvas <info@socka.site>"
supabase secrets set APP_URL="https://socka.site"
```

### Option 2: Use Test Mode (Current Setup)

For testing purposes, you can:

1. Set all author emails to `greenapothekelibchavy@gmail.com` in the Authors settings
2. Emails will be delivered successfully
3. This is useful for development but not production

## Quick Test

To verify the email function is working:

```bash
curl "https://gaqhdjhhkzqbkqknrndx.supabase.co/functions/v1/send-mention-email" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mentionedAuthorEmail":"greenapothekelibchavy@gmail.com",
    "mentionedAuthorName":"Test User",
    "postTitle":"Test Post",
    "commentText":"Testing @TEST mention",
    "commenterName":"Admin"
  }'
```

## Next Steps

1. Decide whether to verify a domain or use test mode
2. If verifying domain, follow Option 1 above
3. Update the edge function's `from` address
4. Test by mentioning a team member in a comment

## Support

- Resend Documentation: https://resend.com/docs
- Resend Domains: https://resend.com/domains
- Resend Pricing: https://resend.com/pricing (free tier includes 100 emails/day)
