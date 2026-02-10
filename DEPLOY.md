# Production Deployment — Transformation Pulse Global

## Quick deploy (Vercel)

1. **Check env:** Run `npm run check-env` to see which required/optional vars are set in `.env`.
2. Push your repo to GitHub (or GitLab/Bitbucket).
3. In [Vercel](https://vercel.com): **Add New Project** → import the repo → framework **Next.js** (auto-detected).
4. Add **Environment Variables** from the table below (at least Supabase URL + anon key for auth; add the rest as you enable features).
5. **Deploy:** Use the Vercel dashboard **Deploy** button, or from CLI: `npm run deploy` (requires `npm i -g vercel` and `vercel link`). Cron runs automatically at 08:00 SGT (`vercel.json`).

---

## Host: Vercel (recommended)

1. **Connect repo** to Vercel; framework preset: Next.js.
2. **Environment variables** (Production): set all from `.env.example` plus:
   - `CRON_SECRET` — random secret for securing cron (e.g. `openssl rand -hex 32`).
   - `ENCRYPTION_KEY` — 32-byte hex key for cookie encryption (e.g. `openssl rand -hex 32`).
3. **Cron:** Vercel runs `GET /api/cron/refresh-hubs` at **00:00 UTC** (= 08:00 SGT). No extra config if using Vercel Cron.
4. **Supabase:** Create project; run full `supabase/schema.sql` in SQL Editor; enable Email auth (and optional Magic Link). Add redirect URL: `https://your-domain.com/auth/callback`.

## Environment checklist (production)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for auth) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for auth) | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (cron + scrapers) | Server-only; cron inserts signals |
| `CRON_SECRET` | Yes (if using external cron) | Bearer token for `GET /api/cron/refresh-hubs` |
| `ENCRYPTION_KEY` | Recommended | 32-byte hex for cookie encryption |
| `OPENAI_API_KEY` | For draft/healing | Draft pitch + self-healing |
| `APIFY_TOKEN` | For job sourcing | Cron job sourcing pipeline |
| `APOLLO_API_KEY` | For people discovery | Hiring manager lookup |
| `PHOENIX_COLLECTOR_URL` | Optional | OTLP traces endpoint (e.g. `https://your-phoenix-host/v1/traces`) |
| `ZYTE_PROXY` / `ZYTE_API_KEY` | Optional | Proxy for scrapers |
| `FINGERPRINT_API_KEY` | Optional | Bot score; rotate proxy if > 10% |
| `PHANTOMBUSTER_API_KEY` | Optional | LinkedIn Partner discovery |

## Cron (08:00 SGT)

- **Vercel:** `vercel.json` already defines `0 0 * * *` (midnight UTC = 08:00 SGT). No action.
- **External:** Call `GET https://your-domain.com/api/cron/refresh-hubs` with header `Authorization: Bearer <CRON_SECRET>` at 00:00 UTC daily.

## Auth

- Enable **Email** (and optionally **Magic Link**) in Supabase Dashboard → Authentication → Providers.
- Add site URL and redirect URLs: `https://your-domain.com`, `https://your-domain.com/auth/callback`.
- Without Supabase URL/keys, the app runs without auth (mock mode).

## Scraper (optional)

- Run from CI or a worker: `npm run scrape Riyadh bayt` (requires Node, `tsx`, `playwright`).
- Or call a dedicated API route that runs the same logic server-side.
