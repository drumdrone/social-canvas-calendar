# Komentáře: @označení osob + emaily z info@socka.site

Kompletní návod k nastavení notifikací u komentářů. Emaily z komentářů chodí
**vždy z adresy `info@socka.site`** (jiné funkce, např. odesílání PDF, se tímto nemění).

## Jak to funguje

1. V detailu příspěvku (pravý sloupec **Comments & Discussion**) napíšeš `@`.
2. Vyskočí seznam autorů z **Nastavení → Autoři**. Vybíráš podle jména i iniciál,
   diakritika a velikost písmen nehrají roli (`@jan novak` = `@Jan Novák`).
3. Po výběru se do textu vloží `@Jméno Příjmení`.
4. Po odeslání (nebo úpravě) komentáře frontend zavolá edge funkci
   `send-mention-email` pro každou označenou osobu, která má vyplněný email.
5. Funkce odešle email přes Resend z `info@socka.site`.

Zdroj lidí pro označování je tabulka `authors` (jméno, iniciály, email, barva).
**Kdo nemá v Nastavení → Autoři vyplněný email, tomu notifikace nedorazí** –
aplikace na to upozorní hláškou hned po odeslání komentáře.

## 1. Ověření domény socka.site v Resendu

1. Přihlas se na [resend.com](https://resend.com) → **Domains** → **Add Domain**.
2. Zadej `socka.site` a vyber region (EU pro evropské zákazníky).
3. Resend vypíše DNS záznamy – přidej je u registrátora/DNS providera domény
   `socka.site`:
   - **MX** + **TXT (SPF)** pro subdoménu `send` (např. `send.socka.site`)
   - **TXT (DKIM)** – typicky `resend._domainkey.socka.site`
   - doporučeně **TXT (DMARC)** na `_dmarc.socka.site`, např.
     `v=DMARC1; p=none; rua=mailto:info@socka.site`
4. V Resendu klikni na **Verify DNS Records** a počkej na stav `Verified`
   (obvykle pár minut, propagace může trvat i hodiny).

Bez ověřené domény umí Resend v testovacím režimu doručit email jen na adresu
vlastníka účtu – ostatní členové týmu žádný email nedostanou.

## 2. API klíč z Resendu

1. Resend → **API Keys** → **Create API Key** (práva *Sending access*).
2. Zkopíruj klíč `re_...` (zobrazí se jen jednou).

## 3. Nastavení Supabase secrets

```bash
npm install -g supabase          # pokud ještě nemáš CLI
supabase login
supabase link --project-ref ejcjdhtgdjyuucknefvp

supabase secrets set RESEND_API_KEY=re_tvuj_klic
```

Volitelné proměnné (mají rozumné výchozí hodnoty, nastavuj jen když chceš změnu):

| Secret | Výchozí hodnota | Popis |
| --- | --- | --- |
| `RESEND_API_KEY` | – | **povinné**, klíč z Resendu |
| `MENTION_FROM_EMAIL` | `info@socka.site` | odesílatel notifikací z komentářů |
| `MENTION_FROM_NAME` | `Socka – Social Canvas Calendar` | jméno odesílatele |
| `MENTION_REPLY_TO` | stejné jako `MENTION_FROM_EMAIL` | adresa pro Reply-To |
| `APP_URL` | `https://drumdrone.github.io/social-canvas-calendar` | základ odkazu „Otevřít příspěvek" |

```bash
# příklad, když aplikace poběží na vlastní doméně
supabase secrets set APP_URL=https://socka.site
```

## 4. Nasazení edge funkce

```bash
supabase functions deploy send-mention-email
supabase functions list          # kontrola
```

Funkce má v `supabase/config.toml` `verify_jwt = false`, aby ji šlo volat
z prohlížeče přes `supabase.functions.invoke()`.

## 5. Test

Přes příkazovou řádku:

```bash
curl -X POST "https://ejcjdhtgdjyuucknefvp.supabase.co/functions/v1/send-mention-email" \
  -H "Content-Type: application/json" \
  -d '{
    "mentionedAuthorEmail": "tvuj@email.cz",
    "mentionedAuthorName": "Test Uživatel",
    "postTitle": "Testovací příspěvek",
    "commentText": "Ahoj @Test Uživatel, tohle je test.",
    "commenterName": "Admin"
  }'
```

Očekávaná odpověď: `{"success":true,"message":"Email odeslán","email_id":"...","from":"info@socka.site"}`

V aplikaci:

1. Otevři libovolný příspěvek v kalendáři.
2. V pravém sloupci vyber autora komentáře, napiš `@` a vyber osobu s emailem.
3. Klikni **Add Comment** – objeví se toast „Notifikace odeslána".

## Řešení problémů

| Hláška | Příčina / řešení |
| --- | --- |
| `RESEND_API_KEY není nastavený` | chybí secret, viz krok 3 |
| `Doména odesílatele (info@socka.site) není v Resendu ověřená` | dokonči krok 1 |
| `Chybí email` (toast v aplikaci) | autor nemá email v Nastavení → Autoři |
| Nic se neděje / CORS chyba v konzoli | funkce není nasazená, viz krok 4 |
| `Failed to send request to the Edge Function` | špatný `project-ref` při deployi – aplikace používá `ejcjdhtgdjyuucknefvp` |

Logy funkce:

```bash
supabase functions logs send-mention-email
```

## Poznámky

- Komentáře se ukládají do sloupce `social_media_posts.comments` ve formátu
  `[čas] Jméno (INI): text`. Označení jsou součástí textu komentáře.
- Migrace `20260123_comments_system.sql` a `20260123_notification_webhook.sql`
  patří ke staršímu, nepoužívanému systému komentářů (tabulky `comments`,
  `user_profiles`, `notifications`). Aplikace je už nevolá; zůstávají jen
  kvůli historii migrací.
