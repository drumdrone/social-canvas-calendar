# Resend Email Setup Guide

The comment mention system uses Resend to send email notifications. Currently, it's in test mode.

## Current Status

✅ Edge function deployed and working
✅ Comment system functional
⚠️ Email delivery limited to test mode

## Issue

Resend's test mode only allows sending emails to your own verified email address (greenapothekelibchavy@gmail.com). To send emails to team members, you need to verify a domain.

## Solution: Verify a Domain

### Option 1: Verify Your Own Domain (Recommended)

1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., yourdomain.com)
4. Add the DNS records provided by Resend to your domain
5. Wait for verification (usually takes a few minutes)
6. Update the edge function:

```bash
# Edit: supabase/functions/send-mention-email/index.ts
# Change line 82 from:
from: "Social Media Manager <onboarding@resend.dev>",

# To:
from: "Social Media Manager <notifications@yourdomain.com>",
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
