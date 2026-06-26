# Supabase — setup voor het team

Onze database draait op Supabase. Project ref: **`olwftiuxzjdhsnvllzif`**
(URL: `https://olwftiuxzjdhsnvllzif.supabase.co`).

Iedereen in de repo kan met de DB werken via de **Supabase CLI** én de **MCP-server**
(zodat de AI/agent de DB kan aansturen). Secrets staan **nooit** in git — alleen in je
eigen lokale `.env`.

## Eenmalige setup (elke teammate)

1. **Persoonlijke access token** aanmaken:
   https://supabase.com/dashboard/account/tokens → kopieer de token.

2. **`.env` aanmaken** vanuit het sjabloon en je waarden invullen:
   ```bash
   cp .env.example .env
   ```
   Vul minimaal `SUPABASE_ACCESS_TOKEN` in (de rest vind je in
   Dashboard → Project Settings → API).

3. **CLI inloggen + linken** aan het project:
   ```bash
   supabase login            # plak je token wanneer gevraagd
   supabase link --project-ref olwftiuxzjdhsnvllzif
   ```
   `supabase link` vraagt om het database-wachtwoord — dat staat in
   Dashboard → Project Settings → Database.

4. **MCP-server** (voor de agent in Cursor): staat al ingesteld in
   [`.cursor/mcp.json`](../.cursor/mcp.json). Hij gebruikt je
   `SUPABASE_ACCESS_TOKEN` uit de omgeving. Zet die in je shell-profiel of laat
   Cursor 'm uit `.env` lezen, herstart Cursor, en autoriseer de server als die
   erom vraagt.

## Werkstroom voor schema-wijzigingen

Schema-changes gaan via **migrations** (zo blijft iedereens DB gelijk en zit het in git):

```bash
supabase migration new <naam>      # maakt een leeg SQL-bestand in supabase/migrations/
# ... schrijf je SQL ...
supabase db push                   # voert de migration uit op het remote project
```

- `supabase/` (config + migrations) zit **wel** in git.
- `.env` met echte keys zit er **niet** in. Deel keys nooit via git of chat.
