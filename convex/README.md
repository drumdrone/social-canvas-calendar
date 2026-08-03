# Convex backend

Scaffold for the Supabase → Convex migration. See `../CONVEX_MIGRATION_PLAN.md`
for the full plan.

## First-time setup

```bash
npm install
npx convex dev          # logs in, creates a deployment, generates convex/_generated,
                        # and writes VITE_CONVEX_URL to .env.local
```

Set deployment environment variables (Dashboard → Settings → Environment
Variables, or `npx convex env set NAME value`):

| Variable | Purpose |
|---|---|
| `APP_PASSWORD` | shared password for `auth.verifyPassword` |
| `SUPABASE_URL` | source project for the one-off migration |
| `SUPABASE_SERVICE_ROLE_KEY` | source read access for the migration |
| `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL` | mention emails (see RESEND_SETUP.md) |

## Run the data migration

```bash
npx convex run migrate:runMigration '{ "wipe": true }'
```

Pulls all posts, taxonomy and photos from Supabase into Convex. Re-runnable
(`wipe` clears target tables first). Returns a per-table count.

## Wiring the client

Wrap the app once (`src/App.tsx` / `main.tsx`):

```tsx
import { ConvexProvider } from "convex/react";
import { convex } from "@/integrations/convex/client";

<ConvexProvider client={convex}>
  <App />
</ConvexProvider>
```

Then replace Supabase calls with `useQuery(api.<module>.<fn>)` /
`useMutation(...)`. Mapping table is in the migration plan.
