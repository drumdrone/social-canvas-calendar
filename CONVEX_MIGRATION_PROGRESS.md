# Convex migrace — Progress tracker

> **Poslední aktualizace:** 2026-08-04 — **MIGRACE DOKONČENA A V PRODUKCI.** Appka běží na `https://socka27.netlify.app/` proti produkčnímu Convex deploymentu (`fine-tiger-542`) s migrovanými daty. Supabase se dál nepoužívá.
> **`main`** obsahuje vše (PR #26, #27, #28 mergnuté).
> **Doprovodný plán:** [`CONVEX_MIGRATION_PLAN.md`](./CONVEX_MIGRATION_PLAN.md) (původní scaffold plán z 2026-07-29)

Tento soubor drží **aktuální stav** migrace ze Supabase na Convex. Cílem je, aby každý nový chat/session mohl začít odsud a věděl, co je hotové, co běží duplicitně a co ještě zbývá — bez opakovaného auditu kódu.

**Pravidlo údržby:** aktualizuj tento soubor při každém merge PR, který posouvá migraci (přidat commit hash + přesunout položku mezi sekcemi). Ne pro každou drobnost — jen když se změní status nějaké feature/souboru.

---

## 0. Kontext větví

- `main` — obsahuje **celou migraci**. Mergnuto přes tři PR:
  - [#26](https://github.com/drumdrone/social-canvas-calendar/pull/26) „Migrate from Supabase to Convex" — veškerý kód (fáze A–F, viz §1–3).
  - [#27](https://github.com/drumdrone/social-canvas-calendar/pull/27) „Fix Netlify build to generate convex/_generated" — build command na `npx convex deploy --cmd '...'` (nedostačující, viz §8).
  - [#28](https://github.com/drumdrone/social-canvas-calendar/pull/28) „Split Netlify build into explicit convex deploy then build steps" — finální funkční build command.
- Feature branch `claude/emailing-komentar-audit-u7chhw` je smergovaná a dá se smazat.
- Zbytek téhle sekce (dřívější historie commitů před mergem) je ponechán níže jako záznam, ale už neplatí rozlišení „na feature branchi vs. na main" — všechno je na `main`.

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

## 2. ✅ SMÍŠENÝ STAV — DOŘÍZNUTO

Všechny soubory, které měly rozjeté oba stacky zároveň, jsou dotažené na čistý Convex:

| Soubor | Zbývalo vyřešit | Poznámka |
|---|---|---|
| ~~`SimpleAuthGate.tsx`~~ | ~~6 volání~~ | ✅ **Doříznuto** (commit `e7a2b3e`) — celá stínová Supabase session pryč, zůstal jen Convex `verifyPassword`. |
| ~~`SocialCalendar.tsx`~~ | ~~1~~ | ✅ **Doříznuto** (commit `97b04a1`) — bylo to `select scheduled_date` pro edit-via-URL flow, nahrazeno lookupem v už načteném `postsQ`. |
| ~~`PostSlidingSidebar.tsx`~~ | ~~1~~ | ✅ **Doříznuto** (commit `4ff72d7`) — dropdown opakovaných akcí teď jede přes `api.recurringActions.list`. |
| ~~`RecurringActionCard.tsx`~~ | ~~subscription + select~~ | ✅ **Doříznuto** (commit `84aff48`) — nová Convex query `posts.listByRecurringAction` (index `by_recurringAction`) nahradila fetch i realtime kanál. |

---

## 3. ✅ VŠECHNO PŘEPSÁNO / SMAZÁNO / ODSTRANĚNO

### 3.1 Core — přepsáno na Convex
| Soubor | Supabase usages | Co dělá |
|---|---:|---|
| ~~`src/integrations/supabase/client.ts`~~ | client | ✅ **Smazáno** (commit `2ab6acb`, součást F1) — nikdo ho už neimportoval. |
| ~~`src/contexts/AuthContext.tsx`~~ | ~~11~~ | ✅ **Přepsáno** (commit `c011104`) — tenký wrapper okolo `simple_auth_verified` localStorage flagu, exportuje jen `logout()`. `src/pages/Login.tsx` smazán (byl mrtvý kód, `/login` route přesměrovává na `/`). |
| ~~`src/pages/Plan.tsx`~~ | ~~2~~ | ✅ **Přepsáno** (commit `28b0312`) — post lookup přes už načtený `api.posts.list`. |
| ~~`src/components/plan/RecurringActionsGrid.tsx`~~ | ~~6~~ | ✅ **Přepsáno** (commit `84aff48`) — CRUD přes `api.recurringActions.*`. |
| ~~`src/components/dashboard/MoodBoard.tsx`~~ | ~~6~~ | ✅ **Přepsáno** (commit `0fe9c25`) — CRUD přes `api.misc.*MoodItem`. |

### 3.2 Features k rozhodnutí (viz §5) — rozhodnuto a hotovo ✅
| Soubor | Supabase usages | Co dělá | Rozhodnutí | Stav |
|---|---:|---|---|---|
| ~~`SendPostPdfDialog.tsx`~~ | ~~3~~ | Volal edge funkci `send-post-pdf` s Facebook-style náhledem | smazat | ✅ **Smazáno** (commit `e7e7808`) — spolu s `PostPdfPreview.tsx` (orphan po smazání) a tlačítkem/state v `PostSlidingSidebar.tsx`. |
| ~~`MediaGallery.tsx`~~ | ~~5~~ | Galerie z bucketu `media-gallery` | zachovat, přepsat na Convex | ✅ **Přepsáno** (commit `77454e1`) — nová tabulka `mediaGalleryItems` + `convex/mediaGallery.ts`. Pozn: komponenta zatím nemá konzumenta v appce (byla odpojená už předtím) — funkční, ale nikam nezapojená. |
| ~~`PostVersionHistory.tsx`~~ | ~~4~~ | Historie verzí postu | smazat | ✅ **Smazáno** (commit `1e878ba`) — modal + tlačítko + state z `PostSlidingSidebar.tsx`. |
| ~~`PostDataManager.tsx`~~ | ~~4~~ | JSON import/export | zachovat, přepsat na Convex | ✅ **Přepsáno** (commit `fbd11ca`) — export čte `api.posts.list`, import volá `api.posts.create` (chápe legacy i nové field names). |
| ~~`BackupManager.tsx`~~ | ~~15~~ | Zálohy do bucketu `backups` | smazat, nahradit měsíčním cronem | ✅ **Smazáno** (commit `3d4c61f`) — Backup tab v `SettingsSidebar.tsx` pryč. Náhrada hotová v D3 (§6). |

### 3.3 Supabase edge funkce
| Funkce | Stav |
|---|---|
| `send-mention-email` | ✅ **Smazáno** (commit `2ab6acb`) — z UI se už dřív přestala volat, zdrojový soubor pryč. |
| `send-post-pdf` | ✅ **Smazáno** (commit `e7e7808`). |
| `create-test-user` | ✅ **Zdrojový soubor smazán** (commit `2ab6acb`). Pokud byla funkce ještě nasazená na Supabase projektu samotném, undeploy je manuální krok mimo repo (Supabase dashboard/CLI) — jinak neškodí, appka na ni nesahá. |

### 3.4 Finální úklid repa (F1, commit `2ab6acb`)
- Smazáno: `src/integrations/supabase/`, celý `supabase/` adresář (migrace, `config.toml`, edge funkce).
- Smazáno: root SQL/JS skripty z původní Postgres migrace (`import-*.sql`, `setup-database.sql`, `migrate-data.js`, atd.) + stará data (`database-export.json`, `migration-backup.json`).
- `package.json`: odstraněno `@supabase/supabase-js`, a `html2canvas` + `jspdf` (byly použité jen v už smazaném Send Post PDF feature). `npm install` proběhl, `package-lock.json` aktualizovaný.
- **`npm run build` na téhle větvi pořád padá** — ale jen na chybějícím `convex/_generated/*`, což vygeneruje až `npx convex dev` (viz §4). `tsc --noEmit` mimo tenhle jeden known-gap nehlásí nic.

---

## 4. ✅ Datová migrace — HOTOVO (na dev i na produkci)

`convex/migrate.ts` proběhlo úspěšně proti oběma Convex deploymentům, se shodnými počty:

```
authors: 1, categories: 0, formats: 0, images: 35, mood_board_items: 0,
pillars: 4, plan_sections: 0, platforms: 0, post_statuses: 3,
product_lines: 0, recurringActions: 5, social_media_posts: 50, user_profiles: 3
```

**Nulové tabulky (`platforms`, `categories`, `formats`, `product_lines`, `mood_board_items`, `plan_sections`) jsou v pořádku, ne bug** — ověřeno (viz konverzace 2026-08-03): vznikly ve stejné Supabase migraci jako `pillars`/`post_statuses`, ale bez seed dat, a nikdy se do nich přes Settings UI nic nepřidalo. Posty mají platformu/kategorii uloženou jako text přímo na sobě, takže to nijak nevadí — jen dropdowny pro tyhle taxonomie budou v Settings prázdné, dokud tam něco nepřidáš.

- **Dev** (`jan-hrodek:socka-convex:dev`, URL `lovable-wren-425.eu-west-1.convex.cloud`) — migrace spuštěna přes `npx convex run migrate:runMigration '{"wipe":true}'` lokálně.
- **Production** (`fine-tiger-542`, URL `fine-tiger-542.eu-west-1.convex.cloud`) — migrace spuštěna přes Dashboard → Functions → `migrate:runMigration` → Run function → `{"wipe": true}`.

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

## 7. 🎯 Checklist — VŠE HOTOVO ✅

- [x] Doříznout `SimpleAuthGate.tsx`, `SocialCalendar.tsx`, `PostSlidingSidebar.tsx`.
- [x] Přepsat `RecurringActionCard.tsx`, `RecurringActionsGrid.tsx`, `MoodBoard.tsx`, `Plan.tsx`, `AuthContext.tsx`.
- [x] Vyřídit features ze §3.2 podle rozhodnutí (smazat PDF/History/Backup, přepsat Gallery/DataManager).
- [x] Přidat měsíční backup cron (D3).
- [x] Smazat `supabase/`, SQL/JS skripty, `@supabase/supabase-js`, `html2canvas`, `jspdf`.
- [x] `npx convex dev` — Convex projekt založen (`jan-hrodek:socka-convex`).
- [x] Env vars nastaveny na **dev** i **production** Convex deploymentu.
- [x] Datová migrace spuštěna proti **dev i production** (viz §4).
- [x] `npm run build` prochází (po opravě `netlify.toml`, viz §8), appka ověřena naživo.
- [x] Merge do `main` (PR #26, #27, #28).
- [x] Netlify nastaven — produkční web `https://socka27.netlify.app/`, `VITE_CONVEX_URL` → production Convex.
- [ ] **Volitelné, časem:** Supabase projekt nechat read-only jako pojistku, pak zrušit.
- [ ] **Volitelné:** smazat mergnuté feature/fix branche (`claude/emailing-komentar-audit-u7chhw`, `fix/netlify-convex-deploy`, `fix/netlify-build-order`).

---

## 8. 🚀 Produkční cutover — detaily a nástrahy (2026-08-04)

Tohle je záznam, co se reálně stalo při přechodu appky na Netlify, pro příště / pro ponaučení.

### Rozhodnutí
- **Zůstalo se na existujícím Convex projektu** (`jan-hrodek:socka-convex`), ne na novém — jen se založil jeho **Production** deployment vedle už existujícího **Development**.
- Development (`lovable-wren-425...`) zůstává pro lokální vývoj/testy. Production (`fine-tiger-542...`) jede appka naživo.
- **Convex dev a production jsou nezávislé databáze** — každý potřebuje vlastní sadu env vars a vlastní běh datové migrace. Tohle se snadno zapomene.

### Nástrahy, na které jsme narazili (a jak byly vyřešené)

1. **`npm run build` na Netlify padal na `Cannot find module 'convex/_generated/api'`.**
   `convex/_generated/*` je derivovaný výstup, vzniká jen při `npx convex dev`/`deploy` s přihlášeným účtem — v čistém CI kontejneru neexistuje. **Fix:** `netlify.toml` build command změněn tak, aby nejdřív spustil Convex a teprve pak Vite.

2. **`npx convex deploy --cmd 'npm run build'` nestačilo** — `vite build` uvnitř `--cmd` pořád nenašel `convex/_generated`, zjevně kvůli pořadí/timing uvnitř toho flagu (přesný důvod jsme neladili). **Fix (PR #28):** rozdělit na dva jasně sekvenční příkazy:
   ```toml
   command = "npx convex deploy && npm run build"
   ```
   `&&` garantuje, že `convex deploy` doběhne (a `_generated` je zapsané na disk) dřív, než se vůbec spustí Vite.

3. **`CONVEX_DEPLOY_KEY`** (Netlify env var, používaný jen buildem) — vytvořen s **minimálním oprávněním**: jen `deployment:deploy`. Nic víc není pro `npx convex deploy` potřeba (žádný env read/write, žádné spouštění funkcí).

4. **`VITE_CONVEX_URL` nesmí být označené jako "secret"** v Netlify — je to veřejná hodnota (zapeče se do JS bundlu, uvidí ji každý v DevTools). Označení jako secret by mohlo shodit build přes Netlify's secret-scanning (detekuje "leak" vlastní veřejné hodnoty v bundlu).

5. **`VITE_CONVEX_URL` chybělo při prvním úspěšném buildu** → appka naběhla jako bílá stránka. Konzole: `No address provided to ConvexReactClient`. **Fix:** doplnit `VITE_CONVEX_URL` s produkční Convex URL do Netlify env vars + „Clear cache and deploy site" (samotné uložení proměnné build sám od sebe nespustí).

6. **Heslo nefungovalo i po nastavení `VITE_CONVEX_URL`.** Convex Dashboard **Logs** (ne konzole prohlížeče, tam je jen generické „Server Error") ukázal skutečnou příčinu: `APP_PASSWORD is not configured on the Convex deployment` — proměnná se totiž nastavovala jen na **Development**, ne na **Production** (snadná záměna v deployment-switcheru nahoře v Dashboardu). **Fix:** zkopírovat všechny env vars i na Production.

### Ponaučení pro příště
- Convex server-side chyby (`throw new Error(...)`) se klientovi ukážou jen jako generické „Server Error" — **skutečný text je vždy v Convex Dashboard → Logs**, ne v konzoli prohlížeče.
- Při jakékoli práci s Convex **dev vs. production** vždy dvakrát zkontrolovat přepínač nahoře v Dashboardu — je snadné omylem editovat/spouštět něco na špatném deploymentu.
