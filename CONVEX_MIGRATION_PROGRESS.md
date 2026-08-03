# Convex migrace — Progress tracker

> **Poslední aktualizace:** 2026-07-30
> **Sledovaná větev:** `claude/emailing-komentar-audit-u7chhw` (32 commitů před `main`)
> **Doprovodný plán:** [`CONVEX_MIGRATION_PLAN.md`](./CONVEX_MIGRATION_PLAN.md) (původní scaffold plán z 2026-07-29)

Tento soubor drží **aktuální stav** migrace ze Supabase na Convex. Cílem je, aby každý nový chat/session mohl začít odsud a věděl, co je hotové, co běží duplicitně a co ještě zbývá — bez opakovaného auditu kódu.

**Pravidlo údržby:** aktualizuj tento soubor při každém merge PR, který posouvá migraci (přidat commit hash + přesunout položku mezi sekcemi). Ne pro každou drobnost — jen když se změní status nějaké feature/souboru.

---

## 0. Kontext větví

- `main` (SHA `3c368fa`) — pre-Convex. Pouze Supabase. Poslední commit „Fix post save failing with null user_id constraint error" z fáze před migrací.
- `claude/emailing-komentar-audit-u7chhw` (SHA `b44b726`) — obsahuje **veškerou Convex práci**. 32 commitů před `main`.

Pokud čteš tenhle soubor na `main`, tak nic z níže popsaného ještě není v produkci — je to zatím jen na feature branchi.

---

## 1. ✅ HOTOVO (na feature branchi)

### 1.1 Backend scaffold (Convex)
- **`convex/schema.ts`** — všech 15 tabulek + indexy + `legacyId` pro remap z UUID.
- **`convex/posts.ts`** — CRUD kalendářních postů (`list`, `listByDateRange`, `get`, `create`, `update`, `remove`).
- **`convex/taxonomy.ts`** — CRUD pro `statuses`, `platforms`, `pillars`, `categories`, `formats`, `product_lines`.
- **`convex/authors.ts`** — CRUD autorů.
- **`convex/comments.ts`** — komentáře, mentions, notifications (commit `a4bcd2c`, `b62b2d5`).
- **`convex/userProfiles.ts`** — uživatelské profily.
- **`convex/files.ts`** — `generateUploadUrl` / `getUrl` / `remove` (náhrada Supabase Storage).
- **`convex/auth.ts`** — `verifyPassword` pro heslový gate proti env `APP_PASSWORD`.
- **`convex/recurringActions.ts`** — CRUD opakovaných akcí (funkce existují, UI je ale zatím na Supabase — viz §3).
- **`convex/misc.ts`** — `mood_board_items` + `plan_sections` (funkce existují, UI je ale zatím na Supabase — viz §3).
- **`convex/migrate.ts`** — server-side migrace ze Supabase (stáhne fotky, přemapuje reference).
- **Commit:** `885dcb3` „Scaffold Convex backend and Supabase migration path".

### 1.2 App plumbing
- **ConvexProvider** obalen kolem appky v `src/main.tsx` (commit `453b7cf`).
- **`src/integrations/convex/client.ts`** — ConvexReactClient s `VITE_CONVEX_URL`.
- **`src/integrations/convex/useUploadImage.ts`** — hook pro upload přes Convex storage (commit `74ac942`).
- Dependency `"convex": "^1.42.3"` v `package.json`, `npm run convex` script.

### 1.3 Přepsané UI (jede přes Convex)
| Oblast | Soubory | Commit |
|---|---|---|
| **Heslový gate** — ověřuje proti Convex `APP_PASSWORD` | `SimpleAuthGate.tsx` (částečně, viz §2) | `e3379de` |
| **Kalendář (read)** — načítání postů | `SocialCalendar.tsx` (částečně), `CalendarGrid.tsx`, `CalendarList.tsx`, `CalendarDay.tsx`, `CalendarFilters.tsx`, `PostPreview.tsx`, `FacebookPostPreview.tsx`, `MatrixGrid.tsx`, `RightCalendarSidebar.tsx`, `ShareablePost.tsx` | `2dd0271`, `6fc87d2` |
| **Post editor (write)** — create/update/delete postů | `PostSlidingSidebar.tsx` (částečně) | `4d1bb80`, `442b53a`, `13b0e78`, `e1aeead` |
| **Upload obrázků** — přes Convex storage | `MultiImageUpload.tsx`, `useUploadImage.ts` | `74ac942`, `0f55e2c`, `ccb4f83` |
| **Taxonomie (Settings)** — všech 7 managerů | `StatusManager.tsx`, `PlatformManager.tsx`, `PillarManager.tsx`, `CategoryManager.tsx`, `FormatManager.tsx`, `ProductLineManager.tsx`, `AuthorManager.tsx` + všichni konzumenti | `c2112f4`, `83ce113` |
| **Komentáře + @mentions + notifikace** | `CommentEditor.tsx`, `CommentList.tsx`, mentions dropdown v portálu | `a4bcd2c`, `310335d`, `b726203`, `1bf2ecf` |
| **Uživatelé (Settings)** | `UserManagement.tsx` | součást `a4bcd2c` |

### 1.4 Emaily
- **Mention emaily** už **nejdou přes Supabase edge funkci** `send-mention-email`. Odesílají se přímo z Convex action → **Brevo** (commit `329ef0c`, dříve Resend v `b2e1e07`).
- Emaily jsou v češtině, diagnostické `console.log`y odstraněné (commit `b44b726`).

### 1.5 Uklizeno / odstraněno
- `PostsTable` view (nepoužívané) — commit `743ed28`.
- Legacy inline-text komentáře v sidebar (commit `e1ecbcd`).

---

## 2. 🚧 SMÍŠENÝ STAV (v souboru je Convex i Supabase)

Tyto soubory už z většiny běží na Convexu, ale zbývá v nich ještě volání na Supabase, které je potřeba doříznout:

| Soubor | Zbývá vyřešit | Poznámka |
|---|---|---|
| ~~`SimpleAuthGate.tsx`~~ | ~~6 volání~~ | ✅ **Doříznuto** (commit `e7a2b3e`) — celá stínová Supabase session pryč, zůstal jen Convex `verifyPassword`. |
| ~~`SocialCalendar.tsx`~~ | ~~1~~ | ✅ **Doříznuto** (commit `97b04a1`) — bylo to `select scheduled_date` pro edit-via-URL flow, nahrazeno lookupem v už načteném `postsQ`. |
| ~~`PostSlidingSidebar.tsx`~~ | ~~1~~ | ✅ **Doříznuto** (commit `4ff72d7`) — dropdown opakovaných akcí teď jede přes `api.recurringActions.list`. |
| ~~`RecurringActionCard.tsx`~~ | ~~subscription + select~~ | ✅ **Doříznuto** (commit `84aff48`) — nová Convex query `posts.listByRecurringAction` (index `by_recurringAction`) nahradila fetch i realtime kanál. |

---

## 3. ⬜ ZBÝVÁ MIGROVAT (soubor jede jen na Supabase)

Podle rozhodnutí z §5 se určí, které z těchto se **přepíšou na Convex** a které se **smažou úplně**.

### 3.1 Core (musí zůstat a být přepsáno)
| Soubor | Supabase usages | Co dělá |
|---|---:|---|
| **`src/integrations/supabase/client.ts`** | client | Umře úplně poslední, až nikdo nebude importovat. |
| ~~`src/contexts/AuthContext.tsx`~~ | ~~11~~ | ✅ **Přepsáno** (commit `c011104`) — tenký wrapper okolo `simple_auth_verified` localStorage flagu, exportuje jen `logout()`. `src/pages/Login.tsx` smazán (byl mrtvý kód, `/login` route přesměrovává na `/`). |
| ~~`src/pages/Plan.tsx`~~ | ~~2~~ | ✅ **Přepsáno** (commit `28b0312`) — post lookup přes už načtený `api.posts.list`. |
| ~~`src/components/plan/RecurringActionsGrid.tsx`~~ | ~~6~~ | ✅ **Přepsáno** (commit `84aff48`) — CRUD přes `api.recurringActions.*`. |
| ~~`src/components/dashboard/MoodBoard.tsx`~~ | ~~6~~ | ✅ **Přepsáno** (commit `0fe9c25`) — CRUD přes `api.misc.*MoodItem`. |

### 3.2 Features k rozhodnutí (viz §5) — rozhodnuto ✅
| Soubor | Supabase usages | Co dělá | Rozhodnutí | Stav |
|---|---:|---|---|---|
| ~~`SendPostPdfDialog.tsx`~~ | ~~3~~ | Volal edge funkci `send-post-pdf` s Facebook-style náhledem | smazat | ✅ **Smazáno** (commit `e7e7808`) — spolu s `PostPdfPreview.tsx` (orphan po smazání) a tlačítkem/state v `PostSlidingSidebar.tsx`. |
| ~~`MediaGallery.tsx`~~ | ~~5~~ | Galerie z bucketu `media-gallery` | zachovat, přepsat na Convex | ✅ **Přepsáno** (commit `77454e1`) — nová tabulka `mediaGalleryItems` + `convex/mediaGallery.ts`. Pozn: komponenta zatím nemá konzumenta v appce (byla odpojená už předtím). |
| ~~`PostVersionHistory.tsx`~~ | ~~4~~ | Historie verzí postu | smazat | ✅ **Smazáno** (commit `1e878ba`) — modal + tlačítko + state z `PostSlidingSidebar.tsx`. |
| ~~`PostDataManager.tsx`~~ | ~~4~~ | JSON import/export | zachovat, přepsat na Convex | ✅ **Přepsáno** (commit `fbd11ca`) — export čte `api.posts.list`, import volá `api.posts.create` (chápe legacy i nové field names). |
| ~~`BackupManager.tsx`~~ | ~~15~~ | Zálohy do bucketu `backups` | smazat, nahradit měsíčním cronem | ✅ **Smazáno** (commit `3d4c61f`) — Backup tab v `SettingsSidebar.tsx` pryč. Náhrada (D3) ještě čeká. |

### 3.3 Supabase edge funkce, které pořád běží na serveru
| Funkce | Stav |
|---|---|
| `send-mention-email` | **Už se z UI nevolá.** Smazat ze `supabase/functions/` a undeploynout (součást F1). |
| `send-post-pdf` | ✅ **Smazáno** (commit `e7e7808`) — `supabase/functions/send-post-pdf/` už neexistuje. |
| `create-test-user` | Pravděpodobně nepoužité — ověřit a smazat (součást F1). |

---

## 4. 🗂️ Datová migrace (Fáze B z původního plánu)

**Není odškrtnuto.** Skript `convex/migrate.ts` existuje a je připravený, ale reálné spuštění `npx convex run migrate:runMigration` **vyžaduje uživatele** (potřebuje `SUPABASE_SERVICE_ROLE_KEY` v Convex env). Bez toho zůstává Convex prázdný a appka nemá s čím pracovat.

**Co je potřeba udělat (Honza):**
1. `npx convex dev` — pokud ještě neexistuje deployment.
2. V Convex Dashboard → Settings → Environment Variables nastavit:
   - `APP_PASSWORD`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BREVO_API_KEY` + related (pro mention emaily)
3. `npx convex run migrate:runMigration '{ "wipe": true }'`

---

## 5. ❓ Otevřená rozhodnutí (blokují další postup)

Původní plán skončil na těchto 4 otázkách a nikdo je zatím nezodpověděl:

1. **Které features zachovat (přepsat na Convex) a které smazat?**
   - Send Post PDF (`SendPostPdfDialog.tsx` + edge `send-post-pdf`)
   - Media Gallery (`MediaGallery.tsx` + bucket `media-gallery`)
   - Post Version History (`PostVersionHistory.tsx`)
   - Post Data Manager — JSON import/export (`PostDataManager.tsx`)

2. **Backup Manager** (`BackupManager.tsx`) — smazat úplně (Convex má vlastní zálohy v cloudu), nebo přepsat na Convex storage?

3. **Auth** — jednoheslový gate (`APP_PASSWORD`) stačí, nebo chceme per-user login?

4. **Postup dokončení** — po fázích s testováním mezi kroky, nebo velký PR najednou?

Odpovědi na tyto otázky pak přesuň do §6.

---

## 6. 📋 Rozhodnutí (2026-07-30)

**Features (§5.1):**
- ❌ **Send Post PDF** — smazat (soubor `SendPostPdfDialog.tsx` + edge funkce `send-post-pdf`).
- ✅ **Media Gallery** — zachovat, přepsat na Convex.
- ❌ **Post Version History** — smazat (`PostVersionHistory.tsx`).
- ✅ **Post Data Manager** (JSON import/export) — zachovat, přepsat na Convex.

**Zálohy (§5.2):**
- ❌ **`BackupManager.tsx` smazat** — Convex má vlastní denní snapshoty (4 dny na free).
- ✅ **Přidat měsíční Convex cron** (commit `050a027`) — 1. každého měsíce v 3:00 UTC:
  1. `convex/backups.ts` exportuje všechny tabulky (16 tabulek) do JSONu.
  2. Nahraje do Convex file storage.
  3. Pošle email přes Brevo s odkazem ke stažení (`BACKUP_EMAIL` env, default Honzova adresa).
  4. Drží posledních 3 měsíční zálohy, starší maže (storage i DB řádek).

**Auth (§5.3):**
- ✅ **Jednoheslový gate zůstává** (`APP_PASSWORD` proti Convexu, žádný per-user login).
- V komentářích/mentions se jméno vybírá ze seznamu (jak je to teď).

**Postup dokončení (§5.4):**
- ✅ **Jeden velký PR** — všechny zbývající změny na feature branchi najednou, jeden merge do `main`.
- Datová migrace (`convex run migrate:runMigration`) se spustí **před merge**, ne po — jinak by přepnutá appka neměla odkud brát data.

---

## 7. 🎯 Co dělat příště (checklist)

Až budou rozhodnutí z §5:

- [ ] Doříznout `SimpleAuthGate.tsx` — odstranit Supabase auth.
- [ ] Doříznout `SocialCalendar.tsx` (řádek 81).
- [ ] Doříznout `PostSlidingSidebar.tsx` (řádek 138) — smazat realtime kanál.
- [ ] Přepsat `RecurringActionCard.tsx` a `RecurringActionsGrid.tsx` na Convex.
- [ ] Přepsat `MoodBoard.tsx` na Convex.
- [ ] Přepsat/smazat `Plan.tsx`, `AuthContext.tsx`.
- [ ] Vyřídit features ze §3.2 podle rozhodnutí.
- [ ] Smazat `supabase/functions/send-mention-email/` (už nepoužité).
- [ ] Ověřit + smazat `supabase/functions/create-test-user/`.
- [ ] Spustit datovou migraci (§4).
- [ ] Smazat `@supabase/supabase-js` z `package.json`.
- [ ] Smazat `src/integrations/supabase/`.
- [ ] Smazat `supabase/` adresář.
- [ ] Smazat SQL soubory z rootu (`import-*.sql`, `setup-database.sql`, atd.) — jsou to artefakty ze Supabase setupu.
- [ ] Merge feature branch do `main`.
- [ ] Přepnout Netlify env na Convex deployment.
