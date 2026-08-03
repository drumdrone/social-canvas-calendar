# Cursor prompty — dokončení Convex migrace

> Připravené prompty pro Cursor, v pořadí od nejméně rizikového k finálnímu cutover.
> Každý prompt = jedno logické kolo → commit → další. Kontextem pro Cursor je `CONVEX_MIGRATION_PROGRESS.md`.
>
> **Pořadí je záměrné:**
> 1. Fáze A a B jsou bezpečné — buď mažou nepotřebné soubory, nebo doříznou kód, který už z většiny běží na Convexu.
> 2. Fáze C využívá Convex funkce, které už v repu jsou (`recurringActions.ts`, `misc.ts`).
> 3. Fáze D přidává nové Convex funkce (Media Gallery, PostDataManager, monthly backup).
> 4. Fáze E je datová migrace — spouštíš ty ručně přes `npx convex run`.
> 5. Fáze F je závěrečný úklid a merge do main.
>
> **Před každým promptem doporučuju v Cursoru otevřít `CONVEX_MIGRATION_PROGRESS.md` a `CURSOR_PROMPTS.md`** — dostane kontext zdarma.
>
> **Po každém prompt-commitu si otevři appku a klikni na dotčenou feature.** Ať víme hned kdy něco praskne.

---

## Fáze A — Smazat rozhodnuté ke zrušení

### A1 · Smazat Send Post PDF

```
V repo social-canvas-calendar rozhodli jsme se odstranit feature "Send Post as PDF".

Udělej:
1. Smaž soubor src/components/calendar/SendPostPdfDialog.tsx
2. Odstraň veškeré importy a použití SendPostPdfDialog v:
   - src/components/calendar/PostSlidingSidebar.tsx
   - src/components/SocialCalendar.tsx
   (a v jakémkoli dalším souboru, kde se najde — použij grep)
3. Odstraň tlačítko/UI, které dialog otevíralo (celý handler, state, import ikony pokud je nikde jinde nepoužitá).
4. Smaž celý adresář supabase/functions/send-post-pdf/

Neber si nic mimo tuto feature. Nezasahuj do jiných částí sidebaru ani do jiných dialogů.

Commit message: "Remove Send Post PDF feature"
```

**Test:** Otevři aplikaci, otevři sidebar postu — nesmí být tlačítko na PDF, appka se musí bez chyby vykreslit.

---

### A2 · Smazat Post Version History

```
V repo rušíme feature "Post Version History" (historie verzí příspěvku).

Udělej:
1. Smaž soubor src/components/calendar/PostVersionHistory.tsx
2. Odstraň veškeré importy a použití PostVersionHistory v src/components/calendar/PostSlidingSidebar.tsx (a jinde pokud najdeš).
3. Odstraň příslušný tab / tlačítko / handler, který historii otevíral.

Neber si nic mimo tuto feature. Zbytek sidebaru nech.

Commit message: "Remove PostVersionHistory feature"
```

**Test:** Sidebar postu se otevře, komentáře fungují, save funguje.

---

### A3 · Smazat BackupManager

```
V repo rušíme feature "BackupManager" — Convex má vlastní denní snapshoty, přidáme si měsíční cron později.

Udělej:
1. Smaž soubor src/components/settings/BackupManager.tsx
2. Odstraň import a použití BackupManager v src/components/settings/SettingsSidebar.tsx (a jinde).
3. Odstraň příslušnou položku v Settings navigaci / stránce.

Neber si nic mimo tuto feature. Ostatní Settings managers nech (Status/Platform/Category/Author/Format/Pillar/ProductLine/User Management).

Commit message: "Remove BackupManager (Convex handles snapshots)"
```

**Test:** Otevři Settings → v seznamu už nesmí být Backups. Ostatní managery fungují.

---

## Fáze B — Doříznout smíšené soubory

### B1 · Doříznout SocialCalendar.tsx

```
V src/components/SocialCalendar.tsx zbývá jedno Supabase volání (kolem řádku 81) — zbytek souboru už jede přes Convex useQuery.

Udělej:
1. Najdi to jediné volání "supabase.from(...)" v souboru.
2. Zjisti co dělá:
   - Pokud je to fallback query (např. natáhnout starší data), přepiš na Convex api.posts.list nebo listByDateRange.
   - Pokud je to realtime subscription (postgres_changes), SMAŽ ho — Convex useQuery je reaktivní automaticky, žádný ekvivalent není potřeba.
3. Odstraň import "supabase" z hlavy souboru (pokud už není potřeba).
4. Zkontroluj že import z '@/integrations/supabase/client' zmizel.

Commit message: "Drop last Supabase call from SocialCalendar"
```

**Test:** Kalendář se načte, filtry fungují, refresh po uložení postu funguje.

---

### B2 · Doříznout realtime v PostSlidingSidebar.tsx

```
V src/components/calendar/PostSlidingSidebar.tsx zbývá jedno Supabase volání (kolem řádku 138) — pravděpodobně realtime kanál supabase.channel(...postgres_changes).

Udělej:
1. Najdi to volání supabase.channel(...) v souboru.
2. Smaž celou subscription (setup + cleanup v useEffect return).
3. Convex useQuery, kterým se sidebar načítá, je už reaktivní sám — když se post v Convexu změní, sidebar se překreslí bez kanálu.
4. Odstraň import "supabase" pokud už není potřeba.

Nedělej nic jiného v souboru — nesahej na save handler, komentáře, ani na image editor.

Commit message: "Drop Supabase realtime channel from PostSlidingSidebar"
```

**Test:** Otevři sidebar postu, uprav něco jinde v Convex Dashboardu (nebo v druhém tabu appky) — sidebar se má překreslit automaticky.

---

### B3 · Doříznout SimpleAuthGate

```
V src/components/SimpleAuthGate.tsx zbývá stín Supabase auth session (signIn, signUp, signOut, getSession) vedle už funkčního Convex verifyPassword.

Kontext: Rozhodli jsme se pro jednoheslový gate proti Convex APP_PASSWORD. Žádný per-user login. Supabase auth session už nikdo nepotřebuje (poslední soubory co ji chtěly kvůli RLS se rušily / přepisují na Convex).

Udělej:
1. Odstraň veškerá volání supabase.auth.* (signInWithPassword, signUp, signOut, getSession) — všech ~6 míst.
2. Ponech pouze Convex flow: verifyPassword action (useAction z convex/react), lokální state "isAuthed" v localStorage nebo sessionStorage tak jak je to teď.
3. Signout tlačítko ať jen smaže lokální flag + reloadne.
4. Odstraň import "supabase" z hlavy souboru.

Nesahej na UX (input pole, error zpráva, styling) — jen backend.

Commit message: "Drop Supabase auth shadow from SimpleAuthGate"
```

**Test:** Otevři appku v anonymním okně → heslo → dostaneš se dovnitř. Odhlas se → reload → gate se ukáže znovu.

---

### B4 · Přepsat / smazat AuthContext.tsx

```
V src/contexts/AuthContext.tsx je pravděpodobně obalovač Supabase session pro celou appku. Po B3 už nikdo Supabase session nepotřebuje.

Udělej:
1. Zjisti, co konzumuje useAuth() z tohohle contextu — grep na "useAuth" + na AuthContext.
2. Pro každého konzumenta:
   - Pokud jen kontroluje "am I logged in" → nahraď jednoduchou kontrolou localStorage flagu, který nastavuje SimpleAuthGate.
   - Pokud potřebuje user id / email → protože nemáme per-user login, hoď natvrdo default (nebo přizpůsob — např. mentions vybírají jméno ze seznamu userProfiles v Convexu, ne z auth session).
3. Po přepsání všech konzumentů:
   - Smaž src/contexts/AuthContext.tsx
   - Smaž provider wrap v src/App.tsx nebo main.tsx
   - Smaž import a všechny reference

Nesmíš rozbít UI — pokud se ti zdá, že nějaký konzument by přišel o důležitou funkci, radši nech AuthContext a nahraď v něm jen supabase.auth voláním na nic (return null user).

Commit message: "Remove AuthContext — SimpleAuthGate is the source of truth"
```

**Test:** Login gate funguje, appka se otevře, komentáře jdou psát pod vybraným jménem.

---

## Fáze C — Přepsat na existující Convex funkce

### C1 · RecurringActionCard + RecurringActionsGrid → Convex

```
Přepiš tyto soubory ze Supabase na Convex:
- src/components/plan/RecurringActionCard.tsx
- src/components/plan/RecurringActionsGrid.tsx

Convex API co použít (už existuje v convex/recurringActions.ts):
- api.recurringActions.list (query, žádné argumenty) → seznam
- api.recurringActions.create (mutation)
- api.recurringActions.update (mutation, args: { id, patch })
- api.recurringActions.remove (mutation, args: { id })

Postup:
1. Nahraď všechny supabase.from('recurring_actions').select/insert/update/delete za useQuery / useMutation z convex/react.
2. Smaž supabase.channel(...) subscription v RecurringActionCard (useQuery je reaktivní).
3. Field mapping: Convex tabulka má camelCase pole (viz convex/schema.ts). Uprav mapování dat v komponentě.
4. Reference (např. post_id) v Convexu jsou Convex _id, ne UUID. Pokud stará data mají UUID, použij legacyId (viz convex/posts.ts getByLegacyId, existují podobné utility). Podívej se jak to řeší už migrované soubory jako CalendarGrid.tsx.
5. Odstraň supabase importy.

Commit message: "Move recurring actions to Convex"
```

**Test:** Plan stránka se načte, opakované akce se zobrazí, můžeš vytvořit / editovat / smazat.

---

### C2 · MoodBoard → Convex

```
Přepiš src/components/dashboard/MoodBoard.tsx ze Supabase na Convex.

Convex API co použít (už existuje v convex/misc.ts):
- api.misc.listMoodBoard (query)
- api.misc.createMoodItem (mutation)
- api.misc.updateMoodItem (mutation, args: { id, patch })
- api.misc.removeMoodItem (mutation, args: { id })

Pro obrázky použij Convex storage:
- api.files.generateUploadUrl (mutation) — vrátí URL kam POST
- api.files.getUrl (query, args: { storageId }) — vrátí signed URL
- api.files.remove (mutation, args: { storageId })

Jak upload funguje, se podívej v src/integrations/convex/useUploadImage.ts (existující hook) a v src/components/calendar/MultiImageUpload.tsx.

Postup:
1. Nahraď supabase.from('mood_board_items').* za useQuery/useMutation.
2. Nahraď supabase.storage.from(...).upload za flow generateUploadUrl → fetch POST → uložit storageId.
3. Nahraď supabase.storage getPublicUrl za api.files.getUrl (nebo si nech vracet URL z queries pokud misc.ts vrací už zpracované).
4. Odstraň supabase importy.

Commit message: "Move MoodBoard to Convex"
```

**Test:** Dashboard → MoodBoard se načte, můžeš přidat obrázek, smazat, editovat.

---

### C3 · Plan.tsx → Convex

```
Přepiš src/pages/Plan.tsx ze Supabase na Convex (jen 2 supabase volání).

Convex API co použít (už existuje v convex/misc.ts):
- api.misc.listPlanSections (query)
- api.misc.upsertPlanSection (mutation)
- api.misc.removePlanSection (mutation)

+ pokud stránka čte i posts nebo recurring actions, použij api.posts.* a api.recurringActions.* (už migrované).

Postup:
1. Najdi 2 supabase volání v Plan.tsx.
2. Nahraď za useQuery / useMutation.
3. Odstraň supabase importy.

Commit message: "Move Plan page to Convex"
```

**Test:** Plan stránka se načte, můžeš přidat / upravit / smazat sekci plánu.

---

## Fáze D — Nové Convex funkce

### D1 · Media Gallery — nový Convex modul + přepis komponenty

```
Vytvoř Convex backend pro Media Gallery a přepiš na něj UI komponentu.

Krok 1 — nový soubor convex/mediaGallery.ts:
- Přidej do convex/schema.ts tabulku "mediaGalleryItems" (pokud tam ještě není): fields storageId (v.id("_storage")), name (v.string()), createdAt (v.number()), tags (v.optional(v.array(v.string()))), legacyId (v.optional(v.string())). Index na by_createdAt.
- V convex/mediaGallery.ts exportuj:
  - list = query() → vrátí položky seřazené DESC podle createdAt, každou obalí o "url" (voláním ctx.storage.getUrl(item.storageId)).
  - add = mutation({ storageId, name, tags? }) → vloží.
  - remove = mutation({ id }) → smaže z tabulky + volá ctx.storage.delete(item.storageId).

Krok 2 — přepiš src/components/media/MediaGallery.tsx:
- Použij useQuery(api.mediaGallery.list) místo supabase.storage.from('media-gallery').list.
- Upload flow přes generateUploadUrl → POST → api.mediaGallery.add({ storageId, name }).
- Delete přes api.mediaGallery.remove.
- Odstraň všechny supabase importy.

Commit message: "Move Media Gallery to Convex storage"
```

**Test:** Media Gallery se otevře, upload obrázku funguje, smazání funguje.

---

### D2 · PostDataManager (JSON export/import) — Convex action

```
Vytvoř Convex backend pro export/import všech postů do/z JSONu a přepiš PostDataManager.

Krok 1 — nový soubor convex/dataManager.ts:
- exportAll = query() → vrátí { posts: [...všechny posty s poli], authors: [...], statuses: [...], platforms: [...], pillars: [...], categories: [...], formats: [...], productLines: [...], recurringActions: [...], moodBoardItems: [...], planSections: [...] }. Storage IDs převeď na public URL.
- importAll = mutation({ payload }) — vezme stejnou strukturu, pro každou tabulku:
  - Buď wipe + insert (jednodušší) nebo upsert podle legacyId.
  - Před nasazením se rozhodneme — dej na začátek payload.mode: "wipe" | "merge" a chování rozhodni podle toho.
  - MODE "wipe" smaže obsah tabulky a nahraje nový. MODE "merge" upsertuje.

Krok 2 — přepiš src/components/calendar/PostDataManager.tsx:
- Export tlačítko: zavolej useAction(api.dataManager.exportAll)() → stringify → download blob.
- Import tlačítko: parse JSON → useMutation(api.dataManager.importAll)({ payload, mode }).
- Ptej se uživatele před wipe (confirm dialog).
- Odstraň supabase importy.

Commit message: "Move PostDataManager JSON import/export to Convex"
```

**Test:** Klikni Export → stáhne se JSON. Klikni Import → nahraješ JSON → data se objeví v kalendáři.

---

### D3 · Monthly backup cron + email

```
Přidej Convex cron, který 1. každého měsíce udělá zálohu všech dat + fotek do JSONu, uloží do Convex storage a pošle Honzovi email s odkazem.

Krok 1 — nový soubor convex/backups.ts:
- runMonthlyBackup = internalAction():
  1. Zavolej runQuery(api.dataManager.exportAll) — vrátí kompletní snapshot (viz D2).
  2. Serializuj do JSONu.
  3. Ulož jako file do Convex storage: storage.store(new Blob([json])) → storageId.
  4. Vytvoř řádek v tabulce "backups": { storageId, createdAt: Date.now(), sizeBytes }.
  5. Získej public URL: storage.getUrl(storageId).
  6. Pošli email přes Brevo (stejnou cestou jako mention emaily — podívej se do stávajícího Convex action co posílá mention email, přizpůsob):
     - Adresát: honza.hrodek@gmail.com (nebo env BACKUP_EMAIL).
     - Předmět: "Měsíční záloha appky — {měsíc rok}"
     - Tělo: krátký text česky + odkaz ke stažení + velikost.
  7. Retence: smaž řádky z tabulky "backups" starší než 3 nejnovější, včetně jejich storage souborů (storage.delete).

Krok 2 — přidej do convex/schema.ts tabulku "backups":
- fields: storageId (v.id("_storage")), createdAt (v.number()), sizeBytes (v.number())
- index by_createdAt

Krok 3 — nový soubor convex/crons.ts:
- import { cronJobs } from "convex/server";
- const crons = cronJobs();
- crons.monthly("monthly-backup", { day: 1, hourUTC: 3, minuteUTC: 0 }, internal.backups.runMonthlyBackup);
- export default crons;

Krok 4 — env var BACKUP_EMAIL (default můj email v kódu, override z env).

Commit message: "Add monthly backup cron with email link"
```

**Test:** V Convex Dashboardu spusť `runMonthlyBackup` ručně (Functions → Run) → přijde ti email → klik na odkaz → stáhne se JSON.

---

## Fáze E — Datová migrace (spouštíš ty, ne Cursor)

### E1 · Založení Convex deploymentu

```bash
npx convex dev
```

- Přihlaš se do Convex cloudu (nebo použij existující).
- Vytvoří `.env.local` s `VITE_CONVEX_URL`.
- Nech proces běžet — sype schema, funkce a `_generated/` typy do Convexu.

### E2 · Nastavení env vars v Convex Dashboardu

**Convex Dashboard → Settings → Environment Variables:**

| Klíč | Hodnota |
|---|---|
| `APP_PASSWORD` | tvé sdílené heslo z dnešního gate |
| `SUPABASE_URL` | `https://ejcjdhtgdjyuucknefvp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key ze Supabase Dashboardu |
| `BREVO_API_KEY` | tvůj Brevo klíč |
| `BREVO_FROM_EMAIL` | tvá odesílací adresa |
| `BREVO_FROM_NAME` | zobrazované jméno |
| `APP_URL` | `https://appka.gomer.cz` (nebo tvůj Netlify URL) |
| `BACKUP_EMAIL` | `honza.hrodek@gmail.com` |

### E3 · Spuštění datové migrace

```bash
npx convex run migrate:runMigration '{"wipe": true}'
```

- `wipe: true` = cíl vyčistí předtím, aby byl skript re-runnovatelný.
- Skript stáhne data + fotky ze Supabase, přemapuje reference.
- Sleduj log. Pokud timeout na velký objem fotek, pusť po tabulkách (viz `CONVEX_MIGRATION_PLAN.md` §5).

**Ověř:**
- Convex Dashboard → Data → projdi tabulky → počty odpovídají Supabase.
- Otevři appku lokálně (`npm run dev`) proti Convexu → kalendář ukazuje data + fotky.

---

## Fáze F — Finální úklid

### F1 · Smazat všechen Supabase kód

```
V repo social-canvas-calendar dokončili jsme migraci na Convex. Odstraň veškeré stopy Supabase.

Udělej:
1. Grep na "supabase" v celém src/ — nesmí nic zbýt (kromě CONVEX_MIGRATION_PROGRESS.md a CURSOR_PROMPTS.md).
2. Smaž src/integrations/supabase/ (celá složka).
3. Smaž supabase/ v rootu repa (celá složka včetně functions/).
4. Smaž z rootu:
   - všechny *.sql soubory (import-*.sql, setup-database.sql, check-triggers.sql, fix-storage-bucket.sql, test-database-check.sql, manual-test-notification.sql, add-test-users.sql)
   - export-from-browser.js, generate-import-sql.js, import-data.js, migrate-data.js, database-export.json, migration-backup.json
5. Odstraň "@supabase/supabase-js" z dependencies v package.json.
6. Spusť: npm install (aby se aktualizoval lockfile).
7. Spusť: npm run build — musí projít.

Neber si nic z convex/, ani ze zbytku src/ (kód už na Supabase nesahá).

Commit message: "Remove Supabase — migration to Convex complete"
```

**Test:** `npm run build` projde bez chyby. `npm run dev` startne, appka funguje kompletně.

---

### F2 · Cutover na Netlify

**Netlify Dashboard → Site → Environment variables:**
- Přidej `VITE_CONVEX_URL` (hodnota z `.env.local` — production Convex URL, ne dev).
- Volitelně smaž `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY` (už nejsou potřeba).

**Merge do main:**

```bash
git checkout main
git pull
git merge claude/emailing-komentar-audit-u7chhw
git push origin main
```

(Nebo přes PR v GitHubu, ať máš review v historii.)

Netlify udělá deploy → ověř produkci → pokud OK, můžeš Supabase projekt archivovat (nechat read-only jako zálohu, ne rovnou smazat).

---

## Odškrtávání

Po každé fázi otevři `CONVEX_MIGRATION_PROGRESS.md` a přesuň hotovou položku ze `§3` do `§1` (nebo jen změň emoji ⬜ → ✅). Ať víme, kde jsme.

Až bude vše hotovo:
- Smaž tento soubor (`CURSOR_PROMPTS.md`) — už není potřeba.
- V `CONVEX_MIGRATION_PROGRESS.md` napiš na začátek "MIGRACE DOKONČENA" + datum.
