# Migrační plán: Supabase → Convex

> Datum: 2026-07-29 · Branch: `claude/emailing-komentar-audit-u7chhw`
> Cíl: přesunout web (všechny příspěvky i fotky) ze Supabase na Convex.
> Rozhodnutí: **plán + scaffold** · **heslový gate v Convexu** · **živý Supabase export**.

---

## 1. Shrnutí

Convex není SQL databáze — je to **dokumentová DB + reaktivní funkce + file storage**.
Migrace tedy není výměna knihovny, ale **přepis datové vrstvy**. Rozdělil jsem to na:

1. **Scaffold (hotovo v tomto commitu)** — Convex schema, datové funkce, storage,
   heslový auth a kompletní migrační skript. Nic z toho zatím není zapojené do UI,
   takže současná appka na Supabase běží dál beze změny.
2. **Zapojení + přepis UI (další kroky)** — přepsat 35 souborů z `supabase.from()`
   na Convex `useQuery`/`useMutation` a spustit datovou migraci.

**Co musíš udělat ty (nejde ze sandboxu):** vytvořit Convex projekt a spustit
`npx convex dev` (přihlášení do Convex cloudu) + nastavit env proměnné (klíče).

---

## 2. Rozsah (z auditu kódu)

- **35 souborů** používá Supabase klienta.
- **15 DB tabulek**: `social_media_posts`, `authors`, `post_statuses`, `platforms`,
  `pillars`, `categories`, `formats`, `product_lines`, `recurring_actions`,
  `mood_board_items`, `plan_sections`, `user_profiles`, `comments`,
  `comment_mentions`, `notifications`.
- **Storage buckety**: `social-media-images` (fotky příspěvků), `media-gallery`,
  `backups` (JSON zálohy).
- **Realtime**: 3 kanály `postgres_changes` → v Convexu zdarma (reaktivní `useQuery`).
- **Auth**: sdílené heslo přes `supabase.auth` (`SimpleAuthGate.tsx`).
- **Edge funkce**: `send-mention-email`, `send-post-pdf` → Convex actions.

---

## 3. Co je v tomto commitu (scaffold) ✅

```
convex/
  schema.ts            # všech 15 tabulek (camelCase, indexy, legacyId pro remap)
  posts.ts             # list / listByDateRange / get / create / update / remove
  taxonomy.ts          # CRUD pro statuses, platforms, pillars, categories, formats, product_lines
  authors.ts           # CRUD autorů
  recurringActions.ts  # CRUD opakovaných akcí
  misc.ts              # mood_board_items + plan_sections
  files.ts             # generateUploadUrl / getUrl / remove (náhrada Storage)
  auth.ts              # verifyPassword (heslový gate přes env APP_PASSWORD)
  migrate.ts           # runMigration – kompletní přesun dat + fotek ze Supabase
src/integrations/convex/client.ts   # ConvexReactClient (VITE_CONVEX_URL)
```

> `convex/_generated/*` vygeneruje až `npx convex dev` — do té doby editor hlásí
> chybějící importy, to je u čerstvého scaffoldu očekávané.

---

## 4. Postup nasazení

### Fáze A — Založení Convexu (ty, ~15 min)
```bash
npm install                       # doinstaluje convex (přidáno do package.json)
npx convex dev                    # přihlášení + vytvoření deploymentu
                                  # zapíše VITE_CONVEX_URL do .env.local
```
Nastavit env proměnné deploymentu (Dashboard → Settings → Environment Variables,
nebo `npx convex env set`):
```
APP_PASSWORD                = <sdílené heslo z dnešního gate>
SUPABASE_URL                = https://ejcjdhtgdjyuucknefvp.supabase.co
SUPABASE_SERVICE_ROLE_KEY   = <service-role key ze Supabase>
RESEND_API_KEY / RESEND_FROM / APP_URL   # pro email action (viz emailing plán)
```

### Fáze B — Datová migrace (ty spustíš, běží server-side)
```bash
npx convex run migrate:runMigration '{ "wipe": true }'
```
Skript (`convex/migrate.ts`) udělá vše sám:
- načte tabulky ze Supabase přes PostgREST (service-role),
- převede snake_case → camelCase,
- **stáhne fotky z URL a uloží je do Convex storage** (`imageStorageId`),
- zachová původní UUID v `legacyId` a **remapuje reference**
  (`recurring_action_id`, `post_id`, `author_id`…),
- vrátí přehled počtů (`{ social_media_posts: N, images: M, ... }`).
`wipe: true` cílové tabulky nejdřív vymaže → skript je opakovatelně spustitelný.

> Fotky uložené jako base64 přímo v datech se nechávají beze změny.
> Pokud je dat hodně, pusť migraci po částech (viz „Rizika").

### Fáze C — Přepis UI (hlavní práce, iterativně)
Obalit appku providerem a nahrazovat volání soubor po souboru. V `src/App.tsx`
(nebo `main.tsx`):
```tsx
import { ConvexProvider } from "convex/react";
import { convex } from "@/integrations/convex/client";
// <ConvexProvider client={convex}> … </ConvexProvider>
```

Mapování vzorů:

| Supabase | Convex |
|---|---|
| `supabase.from('t').select()` | `useQuery(api.t.list)` |
| `.insert(x)` | `useMutation(api.t.create)(x)` |
| `.update(x).eq('id',id)` | `useMutation(api.t.update)({ id, patch: x })` |
| `.delete().eq('id',id)` | `useMutation(api.t.remove)({ id })` |
| `.channel(...postgres_changes)` | **smazat** — `useQuery` je reaktivní automaticky |
| `storage.from(b).upload()` | `files.generateUploadUrl` → `fetch(POST)` → uložit `storageId` |
| `storage…getPublicUrl()` | `files.getUrl` / `imageUrl` z query |
| `supabase.auth.signInWithPassword` | `useAction(api.auth.verifyPassword)` |
| `functions.invoke('send-mention-email')` | `useAction(api.email.sendMention)` |

**Pořadí přepisu (od izolovaných k propojeným):**
1. Taxonomie v Settings (`StatusManager`, `PlatformManager`, `CategoryManager`,
   `AuthorManager`, `ProductLineManager`, `FormatManager`, `PillarManager`).
2. Fotky/upload (`MultiImageUpload`, `PostsTable`, `PostSlidingSidebar`, `MediaGallery`).
3. Příspěvky (kalendář, tabulka, sidebar).
4. Realtime sidebary (`RightCalendarSidebar`, `RecurringActionCard`) — jen smazat kanály.
5. Auth (`SimpleAuthGate`).
6. Edge funkce → actions (`send-mention-email`, `send-post-pdf`), backupy.
7. Odstranit `@supabase/supabase-js` a `src/integrations/supabase/*`.

### Fáze D — Ověření a cutover
- Porovnat počty (Supabase vs Convex) a vizuálně projít kalendář + fotky.
- Přepnout produkci na Convex deployment (Netlify env `VITE_CONVEX_URL`).
- Supabase nechat read-only jako zálohu, než se vše ověří.

---

## 5. Rizika a poznámky

- **Limit běhu akce:** `runMigration` běží v jedné akci. Pro velké objemy fotek
  hrozí timeout — pak migruj po tabulkách/dávkách (skript je na to připravený,
  stačí volat po částech) nebo obrázky ve druhém průchodu.
- **Reference (`_id`):** Convex ids nejsou UUID. Vše, co odkazovalo přes UUID,
  se remapuje přes `legacyId`. Po ověření lze `legacyId` z dat odstranit.
- **Fotky mimo storage:** některé `image_url` mohou být externí/base64 — externí
  se stáhnou, base64 zůstává inline.
- **Auth je jen heslový gate** — žádné per-user účty (dle rozhodnutí). Snadno
  vyměnitelné za Convex Auth později.
- **Netlify SPA** zůstává; mění se jen datová vrstva a env proměnné.

---

## 6. Odhad

| Fáze | Kdo | Náročnost |
|---|---|---|
| A – založení Convexu | ty | ~15 min |
| B – datová migrace | ty (spustit) | ~min–desítky min dle objemu |
| C – přepis UI (35 souborů) | společně | největší část (řádově hodiny) |
| D – ověření + cutover | společně | ~1–2 h |

Scaffold (schema, funkce, storage, auth, migrační skript) je hotový v tomto commitu.
Doporučuji jako první krok **Fázi A + B** (data „nateče" do Convexu), pak iterativně
přepisovat UI po skupinách z Fáze C.
