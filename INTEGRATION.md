# Moving from Mock to Actual Integration

Checklist to switch the app from mock data to live Supabase, job sourcing, and people discovery.

**Note:** Creating the Supabase project, enabling Auth, and setting redirect URLs must be done by you in the [Supabase Dashboard](https://supabase.com/dashboard). The schema can be applied either via the SQL Editor (paste `supabase/schema.sql`) or via the CLI (below).

---

## 1. Supabase (required for real signals and auth)

| Step | Action |
|------|--------|
| 1.1 | **You:** Create a project at [supabase.com](https://supabase.com) → New project. |
| 1.2 | **Apply schema** — choose one: |
|     | **A) SQL Editor:** Dashboard → SQL Editor → New query → paste **`supabase/schema.sql`** → Run. |
|     | **B) CLI:** `npx supabase login` then `npx supabase link --project-ref YOUR_REF` (Ref = Project Settings → General → Reference ID), then `npm run db:push`. |
| 1.3 | **Project Settings → API**: copy **Project URL**, **anon (public) key**, and **service_role key**. |
| 1.4 | In project root ensure `.env` exists (e.g. from `.env.example`). Set in `.env`: |
|     | `NEXT_PUBLIC_SUPABASE_URL=<Project URL>` |
|     | `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>` |
|     | `SUPABASE_SERVICE_ROLE_KEY=<service_role key>` |
| 1.5 | **You:** **Authentication → Providers**: enable **Email** (and optionally **Magic Link**). |
| 1.6 | **You:** **Authentication → URL Configuration**: **Site URL** = `http://localhost:3000`, **Redirect URLs** = `http://localhost:3000/auth/callback` (add production URL when you deploy). |

**Result:** The app can use Supabase for auth and for reading/writing signals and stakeholders. The dashboard will still show **mock** data until you are **logged in** and/or until real data is in the DB.

**Optional — seed test data without cron:** After the schema is run and keys are in `.env`, open the dashboard and click **Seed test data** (blue banner when no signals). Or run: `curl -X POST http://localhost:3000/api/seed`. Then sign in to see the seeded signals.

---

## 2. Populate real signals (job sourcing + cron)

Signals are written by the **cron** job (or by running the job manually). The cron uses **Apify** for job sourcing and **Apollo** for hiring-manager lookup.

| Step | Action |
|------|--------|
| 2.1 | **Apify** ([apify.com](https://apify.com)) → Settings → Integrations → copy **API token**. Add to `.env`: `APIFY_TOKEN=<token>`. Optional: set `APIFY_LINKEDIN_JOBS_ACTOR=bebity/linkedin-jobs-scraper` (default). |
| 2.2 | **Apollo** ([apollo.io](https://apollo.io)) → Settings → API → copy key. Add to `.env`: `APOLLO_API_KEY=<key>`. |
| 2.3 | **Cron** runs at **08:00 SGT** daily (Vercel cron). To run it once manually: |
|     | `curl -X GET "http://localhost:3000/api/cron/refresh-hubs" -H "Authorization: Bearer YOUR_CRON_SECRET"` |
|     | Add to `.env`: `CRON_SECRET=<random secret>` (e.g. `openssl rand -hex 32`). |
| 2.4 | Ensure **SUPABASE_SERVICE_ROLE_KEY** is set (cron uses it to insert into `signals` and `stakeholders`). |

**Result:** When cron runs (or you call the endpoint), it fetches jobs from Apify, filters by technographic keywords, and inserts signals + hiring managers into Supabase. The dashboard will show these once you are **logged in** (RLS allows only authenticated users to read signals).

---

## 3. Optional: draft pitch and self-healing

| Step | Action |
|------|--------|
| 3.1 | **OpenAI** ([platform.openai.com](https://platform.openai.com)) → API keys → create key. Add to `.env`: `OPENAI_API_KEY=<key>`. |
| 3.2 | Used for: **Send Blueprint Pitch** in War Room (draft message) and **self-healing** (LLM-based selector recovery when a site’s HTML changes). |

---

## 4. Optional: source status (Green / Orange / Blue)

The **Source status** bar reads from the **`scrape_sources`** table. If the table is empty, the **sources** API falls back to mock sources. To show real status:

- Populate **`scrape_sources`** (e.g. via a migration or after running the self-healing/scraper flow), or
- Leave as-is to keep using the mock source list in the UI.

---

## 5. Optional: scraper, proxies, observability

- **Proxies (Zyte):** `ZYTE_PROXY`, `ZYTE_API_KEY` in `.env` for the Playwright scraper (`npm run scrape Riyadh bayt`).
- **Phoenix (OTLP):** `PHOENIX_COLLECTOR_URL` for trace export (e.g. `https://your-collector/v1/traces`).
- **PhantomBuster:** `PHANTOMBUSTER_API_KEY`, `PHANTOMBUSTER_LINKEDIN_SEARCH_AGENT_ID` for Partner discovery when Apollo doesn’t have the person.

---

## Quick reference: minimum for “real” dashboard

| Requirement | Env / action |
|-------------|----------------------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; run `supabase/schema.sql`; enable Email auth and redirect URL. |
| **Real signals in UI** | Log in (so RLS allows read). Then either **Seed test data** (dashboard button or `POST /api/seed`), or run cron once (with `APIFY_TOKEN`, `APOLLO_API_KEY`, `CRON_SECRET`). |
| **Cron to fill DB** | `APIFY_TOKEN`, `APOLLO_API_KEY`, `CRON_SECRET`; call `GET /api/cron/refresh-hubs` with `Authorization: Bearer <CRON_SECRET>` or wait for Vercel cron. |

**API helpers:** `GET /api/integration-status` — which env vars are set. `POST /api/seed` — inserts test signals + stakeholders (skips if DB already has signals).

---

## Data flow summary

- **Dashboard** → `GET /api/signals` → if Supabase configured and user **authenticated** → read from **signals** + **stakeholders**; else if no Supabase → **mock**; else (Supabase but no user) → `[]`.
- **Cron** → Apify (jobs) → technographic filter → insert **signals**; for each signal, Apollo (Hiring Manager) → insert **stakeholders**. Uses **service_role** so it bypasses RLS.
- **Sources bar** → `GET /api/sources` → if Supabase and table has rows → **scrape_sources**; else **mock** sources.
