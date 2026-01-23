# Email Notification Setup Guide

This guide will help you set up email notifications for @mentions in comments.

## Prerequisites

- Supabase project running
- Access to Supabase dashboard
- Domain for sending emails (or use Resend's testing domain)

## Step 1: Register for Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address
4. Go to **API Keys** section in dashboard
5. Create a new API key
6. Copy the API key (starts with `re_...`)

## Step 2: Configure Supabase Secrets

1. Install Supabase CLI if not already installed:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

3. Set the Resend API key as a secret:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

## Step 3: Deploy Edge Function

1. Navigate to your project directory:
```bash
cd /home/user/social-canvas-calendar
```

2. Deploy the Edge Function:
```bash
supabase functions deploy send-mention-email
```

3. Verify deployment:
```bash
supabase functions list
```

## Step 4: Run Database Migration

Execute the notification webhook migration:

```bash
supabase db push
```

Or manually run the SQL from:
- `supabase/migrations/20260123_notification_webhook.sql`

## Step 5: Configure Resend Domain (Optional but Recommended)

### For Production (Custom Domain):

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the provided DNS records to your domain:
   - SPF record
   - DKIM record
   - DMARC record
5. Wait for verification (usually 5-10 minutes)
6. Update the Edge Function email "from" address:
   ```typescript
   from: 'Social Canvas Calendar <notifications@yourdomain.com>',
   ```

### For Testing:

Resend provides a test domain `onboarding@resend.dev` that you can use immediately without verification. However, emails will only be sent to the email address you signed up with.

## Step 6: Test the Flow

1. Go to your application
2. Open a post in the calendar view
3. Add a comment and mention a user: `@Jan Hrodek test notification`
4. Submit the comment
5. Check that:
   - Comment appears in the UI
   - Notification is created in database
   - Email is sent (check recipient's inbox and spam folder)

## Step 7: Configure Email Settings (Alternative Method)

If the webhook approach doesn't work, you can configure Supabase Database Webhooks:

1. Go to Supabase Dashboard → Database → Webhooks
2. Click **Create a new hook**
3. Configure:
   - **Name**: Send Mention Email
   - **Table**: notifications
   - **Events**: INSERT
   - **Type**: Supabase Edge Function
   - **Edge Function**: send-mention-email
   - **HTTP Headers**:
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - **Payload**:
     ```sql
     SELECT id as notification_id FROM notifications WHERE id = NEW.id
     ```

## Troubleshooting

### Emails Not Sending

1. Check Edge Function logs:
```bash
supabase functions logs send-mention-email
```

2. Verify RESEND_API_KEY is set:
```bash
supabase secrets list
```

3. Test Edge Function directly:
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-mention-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"notification_id": "YOUR_NOTIFICATION_ID"}'
```

### Check Notification Table

```sql
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
```

### Check User Notification Settings

```sql
SELECT id, email, full_name, notification_enabled
FROM user_profiles;
```

Make sure `notification_enabled` is `true` for users who should receive emails.

## Email Template Customization

To customize the email template, edit:
`supabase/functions/send-mention-email/index.ts`

Key sections:
- Line 100-102: Email header styling and title
- Line 109-111: Email body greeting and message
- Line 113-115: Comment content display
- Line 117-122: Call-to-action button
- Line 126-129: Footer text

After making changes, redeploy:
```bash
supabase functions deploy send-mention-email
```

## Configuration Variables

### Update Project URL in Email Links

In `send-mention-email/index.ts`, line 118:
```typescript
href="https://drumdrone.github.io/social-canvas-calendar/post/${postId || ''}"
```

Update to match your deployment URL.

### Update Settings Link

Line 128:
```typescript
href="https://drumdrone.github.io/social-canvas-calendar/settings"
```

## Security Notes

- Edge Function uses service role key to bypass RLS
- Never expose service role key in client code
- Resend API key is stored as Supabase secret
- Users can disable notifications in Settings
- Email is only sent once per notification
