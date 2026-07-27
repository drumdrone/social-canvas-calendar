# Přechod ze Supabase na Convex

Aplikace už nepoužívá Supabase – databáze, soubory (fotky), emaily i přihlášení
běží na Convexu. Tenhle návod vede krok za krokem od prázdného Convex projektu
až po vypnutí Supabase.

## Co se kam přesunulo

| Dřív (Supabase) | Teď (Convex) |
| --- | --- |
| tabulky v Postgresu | `convex/schema.ts` (stejné názvy i sloupce) |
| `id` (uuid) | Convex document id (v aplikaci pořád `record.id`) |
| RLS politiky | Convex funkce (`convex/*.ts`) |
| Storage `social-media-images` | Convex file storage (`api.files.*`) |
| Storage `media-gallery` | Convex storage + tabulka `media_files` |
| Storage `backups` | Convex storage + tabulka `backups` |
| SQL funkce `get_post_versions`, `create_post_backup`, `restore_post_from_backup` | `convex/versions.ts` |
| Edge function `send-mention-email` | `api.email.sendMentionEmail` |
| Edge function `send-post-pdf` | `api.email.sendPostPdf` |
| Supabase Auth (sdílený účet) | sdílené heslo ověřované v `api.auth.verifyPassword` |
| realtime `postgres_changes` | `convex.watchQuery(...).onUpdate(...)` |

Migrují se data kalendářové aplikace: příspěvky, verze příspěvků, nastavení
(platformy, statusy, kategorie, pilíře, produktové řady, formáty, autoři),
plán (recurring actions, plan sections), mood board a všechny obrázky.

## 1. Založení Convex projektu

```bash
npm install
npx convex dev        # přihlásí tě, založí projekt a nahraje funkce
```

`npx convex dev` vytvoří `.env.local` s `VITE_CONVEX_URL` a nechá běžet
watcher. Nech ho běžet v jednom terminálu, v druhém pak pouštěj `npm run dev`.

> Poznámka: složka `convex/_generated/` je v repu předgenerovaná, aby šlo
> projekt sestavit i bez připojení k Convexu. První `npx convex dev` ji
> přepíše skutečně vygenerovanou verzí.

## 2. Nastavení proměnných prostředí v Convexu

Convex dashboard → **Settings → Environment Variables**:

| Proměnná | Povinná | Popis |
| --- | --- | --- |
| `APP_PASSWORD` | doporučeně | heslo do aplikace (bez ní platí výchozí `socka`) |
| `RESEND_API_KEY` | pro emaily | API klíč z Resendu |
| `MENTION_FROM_EMAIL` | ne | odesílatel, výchozí `info@socka.site` |
| `MENTION_FROM_NAME` | ne | jméno odesílatele |
| `MENTION_REPLY_TO` | ne | Reply-To, výchozí = odesílatel |
| `APP_URL` | ne | základ odkazu v emailu na příspěvek |

Detaily k emailům jsou v [EMAIL_NOTIFICATION_SETUP.md](./EMAIL_NOTIFICATION_SETUP.md).

## 3. Přenos dat a fotek ze Supabase

Skript čte ze Supabase přes REST API (service role klíč) a zapisuje do Convexu.
Obrázky stahuje z bucketů a nahrává do Convex storage – URL v příspěvcích se
přitom automaticky přepíšou na nové.

```bash
# Nejdřív nasucho – jen vypíše, co by se přeneslo:
SUPABASE_URL=https://ejcjdhtgdjyuucknefvp.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role klíč z Supabase → Settings → API> \
CONVEX_URL=https://<tvoje-deployment>.convex.cloud \
npm run migrate:convex -- --dry-run

# Ostrý běh:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CONVEX_URL=... npm run migrate:convex
```

Přepínače:

- `--dry-run` – nic nezapisuje, jen ukáže počty
- `--clear` – nejdřív vyprázdní cílové tabulky v Convexu (skript jde pustit
  opakovaně, bez něj by se data zdvojila)

Co skript dělá:

1. nahraje soubory z bucketů `social-media-images` (a `SOCIAL_CANVAS`) do Convexu
   a zapamatuje si mapování starých a nových URL,
2. přenese `media-gallery` do knihovny médií,
3. naimportuje číselníky (platformy, statusy, kategorie, pilíře, produktové řady,
   formáty, autory),
4. naimportuje `recurring_actions` a namapuje jejich nová id,
5. naimportuje příspěvky s přepsanými URL obrázků a novým `recurring_action_id`,
6. naimportuje historii verzí, plán a mood board.

Bucket `backups` se nepřenáší – jsou to snapshoty starého formátu. Novou zálohu
si po migraci vytvoř přímo v aplikaci (Nastavení → Zálohy).

## 4. Kontrola

```bash
npm run dev
```

Projdi: kalendář (měsíc/týden/seznam/tabulka), otevření a uložení příspěvku,
nahrání obrázku, komentáře s @označením, Plán, Mood board, Nastavení, zálohu.

V Convex dashboardu (Data) zkontroluj počty řádků proti Supabase.

## 5. Produkční nasazení

```bash
npx convex deploy      # nahraje funkce do produkčního deploymentu
```

Frontend (GitHub Pages) potřebuje URL produkčního deploymentu:
**GitHub → Settings → Secrets and variables → Actions → Variables** →
`VITE_CONVEX_URL = https://<production-deployment>.convex.cloud`.
Workflow `.github/workflows/deploy.yml` ji předává do buildu.

Pro Netlify nastav stejnou proměnnou v **Site settings → Environment variables**.

Pozor: migrační skript zapisuje do toho deploymentu, který zadáš v `CONVEX_URL` –
pro produkci ho pusť s produkční URL.

## 6. Vypnutí Supabase

Až všechno v produkci funguje:

1. stáhni si poslední zálohu ze Supabase (pro jistotu),
2. v Supabase dashboardu **Settings → General → Pause / Delete project**,
3. zruš nepoužívané klíče (service role, anon).

Kód aplikace už na Supabase nikde nesahá – balíček `@supabase/supabase-js`,
složka `supabase/` i `src/integrations/supabase/` jsou odstraněné (zůstávají
v historii gitu).

## Poznámky k chování po migraci

- **Přihlášení**: jedno sdílené heslo. Ověřuje ho Convex akce
  `api.auth.verifyPassword` proti `APP_PASSWORD`, takže heslo není v JS bundlu.
  Data ale nejsou chráněná per-uživatel – kdo zná URL deploymentu, může volat
  funkce (stejné jako dřív s anon klíčem a „allow all" RLS).
- **Uživatelé (`user_profiles`)**: tabulka v živém Supabase projektu neexistovala
  a aplikace ji nepoužívala, proto se nemigruje. Členové týmu se spravují
  v Nastavení → Členové týmu (tabulka `authors`).
- **Verzování příspěvků**: `api.posts.update` automaticky ukládá snapshot do
  `post_versions` (dřív to dělal databázový trigger).
