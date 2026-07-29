# Audit & plán: Emailing z komentářů (Resend)

> Datum: 2026-07-29 · Branch: `claude/emailing-komentar-audit-u7chhw`
> Rozsah: notifikace e-mailem při @zmínce (mention) v komentáři u příspěvku.

---

## 1. Shrnutí (TL;DR)

Emailing přes Resend je **z ~70 % hotový, ale v současném stavu neodešle jediný e-mail.**
Existují dva paralelní, vzájemně nekompatibilní systémy zmínek a nasazená edge funkce
odpovídá tomu, který **není zapojený do živého UI**. Navíc odesílací adresa je neplatný
zástupný text. Níže je audit s prioritami a konkrétní plán oprav.

**Dvě blokující (P0) chyby:**
1. Nesoulad payloadu mezi UI a edge funkcí → funkce vrací `400 notification_id is required`.
2. `from: notifications@yourdomain.com` není ověřená doména v Resend → Resend vrací `422`.

Dokud nejsou opraveny obě, notifikace nefungují.

---

## 2. Co už je hotové ✅

- Resend integrace v edge funkci `supabase/functions/send-mention-email/index.ts`
  (volání `https://api.resend.com/emails`, HTML šablona e-mailu, hezký design).
- UI pro psaní komentářů se zmínkami:
  - `src/components/calendar/MentionInput.tsx` – autocomplete `@INITIALS`.
  - `src/components/calendar/PostSlidingSidebar.tsx` – detekce zmínek + volání edge funkce
    (`detectMentionsAndSendEmails`, řádky ~447–558).
- Datový model pro alternativní systém: migrace
  `supabase/migrations/20260123_comments_system.sql` (tabulky `comments`,
  `comment_mentions`, `notifications`, trigger na vytvoření notifikace) a
  `20260123_notification_webhook.sql` (pg_net webhook).
- `authors` tabulka má sloupec `email` (migrace `20260115082427_create_authors_table.sql`).
- Dokumentace: `RESEND_SETUP.md`, `EMAIL_NOTIFICATION_SETUP.md`.

---

## 3. Zjištění auditu (podle priority)

### 🔴 P0 — Blokující (bez nich nic neodejde)

**A) Nesoulad payloadu UI ↔ edge funkce**
- Živé UI (`PostSlidingSidebar.detectMentionsAndSendEmails`, ř. 490–498) posílá:
  ```json
  { "mentionedAuthorEmail", "mentionedAuthorName", "postTitle", "commentText", "commenterName" }
  ```
- Nasazená edge funkce (`send-mention-email/index.ts`, ř. 23–30) ale přijímá **jen**
  `{ "notification_id": "..." }` a jinak vrací `400`.
- **Důsledek:** každé volání z hlavního UI selže dřív, než se vůbec dostane k Resend.

**B) Neplatná odesílací adresa (`from`)**
- `send-mention-email/index.ts`, ř. 143: `from: 'Social Canvas Calendar <notifications@yourdomain.com>'`.
- `yourdomain.com` není ověřená doména → Resend odmítne (`422 Domain not verified`).
- Pozn.: `RESEND_SETUP.md` naopak zmiňuje `onboarding@resend.dev` — dokumentace a kód se rozcházejí.

### 🟠 P1 — Vysoká

**C) Chybí CORS / obsluha `OPTIONS` v edge funkci**
- Funkce nemá žádné CORS hlavičky ani větev pro `OPTIONS` preflight (0 výskytů).
- Volání z prohlížeče přes `supabase.functions.invoke` může selhat na preflightu.
  Standard u Supabase edge funkcí je vracet `Access-Control-Allow-Origin` a ošetřit `OPTIONS`.

**D) Dva rozdílné, konkurující si systémy zmínek**
- **Systém A (tabulkový):** `comments`/`comment_mentions`/`notifications` + `CommentEditor.tsx`/
  `CommentList.tsx` + DB trigger + pg_net webhook. Zmínka podle **celého jména** `@Jan Hrodek`.
  Autor komentáře je natvrdo `users[0]` (`CommentEditor.tsx`, ř. 135) — jen provizorní.
- **Systém B (textový, živý):** komentáře jako text ve sloupci `social_media_posts.comments`
  ve formátu `[čas] Jméno (INI): text`, zmínka podle **iniciál** `@XX` přes `authors`.
- Edge funkce byla přepsána pro **Systém A**, ale do UI (`PostSlidingSidebar`) je zapojený
  **Systém B** — a zároveň se do stejného sidebaru importuje i `CommentEditor` (Systém A).
  → zmatek, duplicita, rozbité kontrakty.

**E) pg_net webhook závisí na nenastavených proměnných**
- `20260123_notification_webhook.sql` čte `current_setting('app.settings.supabase_url')`
  a `...service_role_key` — tyto custom GUC nikde nenastavujeme → URL je `null`, webhook tiše selže.
- Navíc pokud by fungoval, došlo by k **dvojímu odeslání** (webhook + klientské `invoke`).

### 🟡 P2 — Střední

**F) Natvrdo zadané a nekonzistentní URL/identifikátory**
- Odkazy v e-mailu míří na `https://drumdrone.github.io/social-canvas-calendar/...`
  (`index.ts`, ř. 118 a 128), ale app se deployuje jako Netlify SPA (`netlify.toml`).
- `RESEND_SETUP.md` používá project ref `gaqhdjhhkzqbkqknrndx`, reálný projekt je
  `ejcjdhtgdjyuucknefvp` (`src/integrations/supabase/client.ts`). Docs míří na jiný/starý projekt.

**G) RLS „allow all" a natvrdo hodnoty**
- Politiky `USING (true) WITH CHECK (true)` na všech tabulkách — OK pro vývoj, riziko pro produkci.
- `from` adresa a odkazy nejsou konfigurovatelné přes proměnné prostředí.

### 🟢 P3 — Nízká / úklid
- Chybí idempotence u Systému B (žádný příznak „už odesláno" — riziko duplicit při editaci komentáře).
- Ladicí `console.log` v produkčním kódu (`detectMentionsAndSendEmails`, edge funkce).
- Dokumentace neodpovídá aktuálnímu kódu (payload, `from`, project ref).

---

## 4. Doporučený směr

**Sjednotit na Systému B** (autoři + iniciály + inline komentáře), protože ten je reálně
zapojený do živého UI a využívá stejnou `authors` tabulku jako zbytek aplikace. Systém A
(tabulky + webhook) buď odstranit, nebo ponechat jako budoucí „in-app notifikace",
ale **nespoléhat na něj** pro e-maily.

Edge funkci udělat **bezstavovou**: přijme přímo příjemce a obsah, ověří a odešle přes Resend.
Žádná závislost na `notifications` tabulce ani na pg_net.

---

## 5. Plán implementace

### Fáze 0 — Předpoklady (Resend)
- [ ] Účet na resend.com, vytvořit API klíč (`re_...`).
- [ ] `supabase secrets set RESEND_API_KEY=re_...` pro projekt `ejcjdhtgdjyuucknefvp`.
- [ ] (Produkce) Ověřit vlastní doménu v Resend (SPF/DKIM/DMARC).

### Fáze 1 — Oprava edge funkce (P0 + P1) — *jádro opravy* ✅ HOTOVO
- [x] Přepsat `send-mention-email/index.ts` tak, aby přijímal payload Systému B:
      `{ mentionedAuthorEmail, mentionedAuthorName, postTitle, commentText, commenterName, postId? }`.
- [x] Přidat CORS hlavičky + obsluhu `OPTIONS` (preflight).
- [x] `from` číst z env `RESEND_FROM` (fallback `onboarding@resend.dev` pro test režim).
- [x] Validace vstupů + čitelné chybové hlášky (Resend zpráva se propíše do klienta → rozliší „test mode/doména").
- [x] Odkazy v e-mailu z env `APP_URL` (fallback na produkční URL) + HTML-escape uživatelského obsahu.
- [x] Odstranění závislosti na `notifications` tabulce a service-role klientovi (funkce je bezstavová).

### Fáze 2 — Konfigurace prostředí
- [ ] `supabase secrets set RESEND_FROM="Social Canvas Calendar <notifications@ověřená-doména>"`.
- [ ] `supabase secrets set APP_URL="https://<netlify-url>"`.
- [ ] Redeploy: `supabase functions deploy send-mention-email`.

### Fáze 3 — Vyčištění duplicit (P1/P2)
- [ ] Rozhodnout o Systému A: odstranit `CommentEditor`/`CommentList` ze `PostSlidingSidebar`,
      nebo ho jasně oddělit. Deaktivovat pg_net webhook (`20260123_notification_webhook.sql`),
      aby nedocházelo k dvojímu odesílání.
- [ ] Odstranit natvrdo `drumdrone.github.io` odkazy.

### Fáze 4 — Robustnost (P3)
- [ ] Idempotence u editace komentáře (neposílat znovu pro nezměněné zmínky).
- [ ] Odstranit produkční `console.log`.
- [ ] Zúžit RLS před produkčním nasazením.

### Fáze 5 — Test
- [ ] `curl` test edge funkce s payloadem Systému B (viz níže).
- [ ] E2E: v příspěvku napsat komentář se `@INI`, ověřit doručení (vč. spamu).
- [ ] `supabase functions logs send-mention-email` pro kontrolu.

**Testovací curl (nový payload):**
```bash
curl -X POST "https://ejcjdhtgdjyuucknefvp.supabase.co/functions/v1/send-mention-email" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "mentionedAuthorEmail": "honza.hrodek@gmail.com",
    "mentionedAuthorName": "Honza Hrodek",
    "postTitle": "Test Post",
    "commentText": "Ahoj @HH, koukni na tohle",
    "commenterName": "Admin"
  }'
```

---

## 6. Odhad rozsahu

| Fáze | Náročnost | Odblokuje odesílání? |
|------|-----------|----------------------|
| 1 — edge funkce | ~1–2 h | **Ano (P0+P1)** |
| 2 — env + deploy | ~30 min (+ čas na ověření domény) | Ano |
| 3 — úklid duplicit | ~1–2 h | Ne (kvalita) |
| 4 — robustnost | ~1–2 h | Ne (kvalita) |
| 5 — test | ~30 min | Ověření |

Minimální cesta k funkčnímu e-mailu = **Fáze 1 + 2**.
