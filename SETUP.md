# Transformation Pulse Global — Setup Checklist

Do these steps **after** Node.js/npm is installed to run the app.

---

## 1. Install dependencies

From the project folder in Terminal:

```bash
cd "/Users/Srinivas/Library/Mobile Documents/com~apple~CloudDocs/Code - Kodai site/Project Phoenix"
npm install
```

Wait until it finishes without errors.

---

## 2. Run the app (minimal — no APIs)

You can run with **mock data** without any keys:

```bash
npm run dev
```

- Open **http://localhost:3000** in your browser.
- You should see: header, source status bar (Green/Orange/Blue), signals table, and War Room drawer when you click a row.

**No .env or Supabase needed for this.**

---

## 3. (Optional) Environment variables for live integrations

To use **real** job sourcing (Apify), people discovery (Apollo), and self-healing (OpenAI):

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your keys (get them from each service’s dashboard):
   - **Supabase:** Create a project at [supabase.com](https://supabase.com) → Project Settings → API. Copy URL and anon key (and service role if you run cron/backend).
   - **Apify:** [apify.com](https://apify.com) → Settings → Integrations → API token.
   - **Apollo:** [apollo.io](https://apollo.io) → Settings → API.
   - **OpenAI:** [platform.openai.com](https://platform.openai.com) → API keys.

Leave any key blank if you don’t use that feature; the app will still run with mocks.

---

## 4. (Optional) Supabase database

If you use Supabase for signals, stakeholders, and self-healing:

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard: **SQL Editor** → New query.
3. Open the file **`supabase/schema.sql`** in this project and **copy its full contents**.
4. Paste into the SQL Editor and click **Run**.
5. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (only if you run server/cron that writes data)

Put these in your `.env` (see step 3).

---

## 5. (Optional) Auth — login and DB-backed history

To use **login** and **Settings → History** (so draft/Bridge use your saved history):

1. In Supabase Dashboard: **Authentication → Providers** → enable **Email** (and optionally **Magic Link**).
2. **Authentication → URL Configuration:**
   - **Site URL:** `http://localhost:3000` (local) or your production URL.
   - **Redirect URLs:** add `http://localhost:3000/auth/callback` and `https://your-domain.com/auth/callback` when you deploy.
3. Restart the app; open **http://localhost:3000** → **Sign in** (or **History** in header to go to Settings → History).
4. Add positions in **Settings → History**; draft pitch and executive JD Bridge will use this when you’re logged in.

---

## 6. Build for production

When you want to deploy or run a production build locally:

```bash
npm run build
npm start
```

---

## Quick reference

| Goal                         | What to do                                      |
|-----------------------------|-------------------------------------------------|
| Just run the app with mocks | Steps 1 + 2                                    |
| Use real APIs (Apify, etc.) | Steps 1 + 2 + 3                                |
| Use Supabase for data       | Steps 1 + 2 + 3 + 4                            |
| Login + History (draft/Bridge) | Steps 1–4 + 5 (Auth)                         |
| Deploy / production run    | Steps 1 + 3 (and 4 if using DB) + 6; see DEPLOY.md |

---

## If something fails

- **Port 3000 in use:** Run `npm run dev -- -p 3001` and open http://localhost:3001.
- **Module not found:** Delete `node_modules` and run `npm install` again.
- **npm not found:** Install Node.js from [nodejs.org](https://nodejs.org) (LTS), then restart Terminal/Cursor.
