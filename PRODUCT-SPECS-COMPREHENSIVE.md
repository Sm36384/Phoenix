# Transformation Pulse Global — Comprehensive Product Specification

**Version:** 1.0  
**Platform:** Private, signal-driven intelligence for $1B+ digital transformation mandates.

---

## Table of Contents

1. [Product Vision & Features](#1-product-vision--features)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Integrations & Capabilities](#4-integrations--capabilities)
5. [UI Capabilities & Features](#5-ui-capabilities--features)
6. [Data Model & Schema](#6-data-model--schema)
7. [Algorithms & Logic](#7-algorithms--logic)
8. [Security, Privacy & Anti-Ban](#8-security-privacy--anti-ban)
9. [Deployment & Operations](#9-deployment--operations)

---

## 1. Product Vision & Features

### 1.1 Objective

Track high-value digital transformation job mandates across **7 global hubs**: Singapore, Hong Kong, Dubai, Riyadh, Abu Dhabi, India, Vietnam.

### 1.2 Core Engine: Stakeholder Graph (Power Triangle)

For every job signal the system resolves:

| Role | Description |
|------|-------------|
| **Recruiter** | Internal (HR) or External (headhunter), with firm name (e.g. Korn Ferry). |
| **Hiring Manager** | Likely CIO/CTO/Head of Digital at the company (Apollo.io). |
| **The Bridges** | Top 3 mutual connections ranked by **Relationship Strength Score (RSS)**; cross-referenced with your professional history for “Warm Lead” flag. |

### 1.3 Feature Summary

| Feature | Description |
|---------|-------------|
| **Signal Dashboard** | High-density table of job mandates with region, company, headline, complexity match %, stakeholders. |
| **War Room Drawer** | Per-signal slide-out with AI summary, stakeholder map, persona-based draft pitch, Live Trace bar. |
| **Source Status Bar** | Per-source indicator: Green (OK), Orange (healing), Blue (healed). |
| **Professional History** | User-editable career history (positions, companies, tenure) for Bridge overlap and anonymized LLM prompts. |
| **Ghost-Write Personas** | Three AI voices: Peer (HM), Partner (Recruiter), Bridge (connection). |
| **Live Trace** | Status bar showing “Identifying target…”, “Found connection…”, “Drafting pitch…”, “Ready to send.” |
| **Self-Healing (Phoenix Rebirth)** | When a site’s HTML changes, LLM finds new selectors and updates Supabase. |
| **Human-Mimicry Governor** | Jitter, business hours, human-flow, Bézier mouse, session persistence, fail-safe on CAPTCHA. |
| **Hidden Market Discovery** | Executive JDs ($500k+): parse Partner name, find on LinkedIn, run Bridge logic. |
| **Authentication** | Supabase Auth (Email, Magic Link, Password). RLS for private data. |
| **Seed & Cron** | Seed test data; cron at 08:00 SGT daily to refresh hubs (Apify + Apollo). |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
│  Next.js 15 App Router · React 19 · Tailwind · Lucide Icons              │
│  Pages: / (Dashboard), /login, /settings/history                         │
│  Components: AuthHeader, SignalTable, WarRoomDrawer, SourceStatusBar,    │
│              LiveTraceBar                                                │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS API ROUTES                                │
│  /api/signals, /api/sources, /api/seed, /api/history, /api/draft-pitch,  │
│  /api/parse-executive-jd, /api/integration-status, /api/cron/refresh-hubs│
│  /auth/callback                                                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────────┐
│   Supabase    │         │  External APIs  │         │  Scraper / Scripts  │
│ Postgres, Auth│         │ Apify, Apollo,  │         │ Playwright, Stealth,│
│ RLS, Realtime │         │ OpenAI, Phantom-│         │ Camoufox, Phoenix   │
│               │         │ Buster, Zyte    │         │ OTLP                │
└───────────────┘         └─────────────────┘         └─────────────────────┘
```

### 2.2 Data Flow

| Flow | Path |
|------|------|
| **Dashboard load** | Browser → `GET /api/signals` → Supabase (signals + stakeholders) or mock; `GET /api/sources` → scrape_sources or mock; `GET /api/integration-status` → env flags. |
| **Auth** | Login page → Supabase Auth (Email/Magic Link/Password) → `/auth/callback` → session cookie → redirect to `/`. |
| **Seed** | Dashboard “Seed test data” → `POST /api/seed` → service_role → insert signals, stakeholders, scrape_sources. |
| **Cron** | Vercel cron (08:00 SGT) → `GET /api/cron/refresh-hubs` (Bearer CRON_SECRET) → Apify jobs → filter → Apollo people → insert signals/stakeholders. |
| **Draft pitch** | War Room “Send Blueprint Pitch” → `POST /api/draft-pitch` → get user history (anon) → OpenAI → persona-based draft. |
| **Executive JD** | Paste JD → `POST /api/parse-executive-jd` → LLM parse → if $500k+ / executive → resolve Partner → Bridge logic. |

### 2.3 Application Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Dashboard
│   ├── login/page.tsx      # Login / Sign up / Magic link
│   ├── settings/history/   # Professional history (positions, person)
│   ├── auth/callback/      # Supabase auth redirect
│   └── api/                # API routes (signals, sources, seed, history, draft-pitch, etc.)
├── components/             # UI components
│   ├── AuthHeader.tsx      # User email, History link, Sign out
│   ├── SignalTable.tsx     # Signals table with columns + row click
│   ├── WarRoomDrawer.tsx   # Slide-out: role, AI summary, stakeholders, draft pitch
│   ├── SourceStatusBar.tsx  # Green/Orange/Blue per source
│   └── LiveTraceBar.tsx    # Live Trace steps (demo or custom)
├── lib/                    # Business logic & integrations
│   ├── bridge-algorithm.ts # RSS computation, rankBridgesByRSS
│   ├── ghost-write/        # Personas (peer, partner, bridge)
│   ├── hidden-market/      # Executive JD parse, Bridge trigger
│   ├── integrations/      # Job sourcing, people discovery, PhantomBuster
│   ├── privacy/            # Anonymize history for LLM
│   ├── scraper/            # Launch (Playwright, stealth, Camoufox), proxy
│   ├── self-healing/       # Heal loop, LLM heal
│   ├── stealth-governor/   # Jitter, human-flow, human-mouse, cookie cipher, fail-safe
│   ├── observability/      # Phoenix OTLP export
│   └── supabase/           # Client, server, middleware
├── data/                   # Mock signals, my_history.json
└── types/                  # Signal, Stakeholder, Bridge, integrations
```

---

## 3. Tech Stack

### 3.1 Frontend

| Technology | Purpose |
|------------|--------|
| **Next.js 15** | App Router, server components, API routes. |
| **React 19** | UI components, hooks. |
| **Tailwind CSS** | Styling (surface #F2F4F8, primary #1A1C1E, accent #005FB8). |
| **Lucide React** | Icons (Activity, MapPin, Building2, Briefcase, User, Send, etc.). |

### 3.2 Backend & Data

| Technology | Purpose |
|------------|--------|
| **Supabase** | Postgres database, Auth (Email, Magic Link, Password), RLS. |
| **@supabase/supabase-js** | Client-side and server-side Supabase client. |
| **@supabase/ssr** | Cookie-based session for Next.js (middleware, server client). |

### 3.3 Job Sourcing & People

| Technology | Purpose |
|------------|--------|
| **Apify** | LinkedIn Jobs Scraper (or configurable actor); job feed. |
| **Apollo.io** | People Search API — Hiring Manager (CTO/CIO) by company. |
| **PhantomBuster** | Partner discovery when Apollo doesn’t have LinkedIn URL; mutual connections. |

### 3.4 AI & Healing

| Technology | Purpose |
|------------|--------|
| **OpenAI** | Draft pitch (persona-based), self-healing (selector recovery from HTML/screenshot). |
| **LLM (GPT-4o / Gemini 1.5 Pro)** | Vision-based healing for complex portals; JD parsing. |

### 3.5 Scraping & Anti-Detection

| Technology | Purpose |
|------------|--------|
| **Playwright** | Browser automation for job portals. |
| **playwright-extra + puppeteer-extra-plugin-stealth** | Fingerprint evasion (navigator.webdriver, WebGL/Canvas). |
| **Camoufox** | Anti-detect browser for TLS/JA3 (e.g. KSA/SG bank portals). |
| **Fingerprint.com API** | Bot score; rotate proxy/headers if > threshold. |
| **Zyte / Bright Data** | Residential proxies, geo-targeted. |

### 3.6 Observability & DevOps

| Technology | Purpose |
|------------|--------|
| **Arize Phoenix (OTLP)** | Trace export (heal events, scraper runs). |
| **Vercel** | Hosting, serverless functions, cron. |
| **TypeScript** | Full codebase. |
| **ESLint** | Linting (Next.js config). |

---

## 4. Integrations & Capabilities

### 4.1 Required for “Real” Dashboard

| Integration | Env Vars | Purpose |
|-------------|----------|---------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth, signals, stakeholders, RLS. |
| **Schema** | Run `supabase/schema.sql` or `npm run db:push` | Tables, RLS, indexes. |
| **Auth** | Dashboard: Email/Magic Link enabled; Redirect URLs | Login, callback. |

### 4.2 Job Sourcing & Cron

| Integration | Env Vars | Purpose |
|-------------|----------|---------|
| **Apify** | `APIFY_TOKEN`, optional `APIFY_LINKEDIN_JOBS_ACTOR` | Job feed for hubs. |
| **Apollo** | `APOLLO_API_KEY` | Hiring Manager lookup per signal. |
| **Cron** | `CRON_SECRET` | Secure trigger for `GET /api/cron/refresh-hubs`. |

### 4.3 Optional

| Integration | Env Vars | Purpose |
|-------------|----------|---------|
| **OpenAI** | `OPENAI_API_KEY` | Draft pitch, self-healing LLM. |
| **PhantomBuster** | `PHANTOMBUSTER_API_KEY`, `PHANTOMBUSTER_LINKEDIN_SEARCH_AGENT_ID` | Partner discovery when Apollo has no LinkedIn URL. |
| **Zyte** | `ZYTE_PROXY`, `ZYTE_API_KEY` | Proxies for Playwright scraper. |
| **Phoenix** | `PHOENIX_COLLECTOR_URL` | OTLP trace export (e.g. `/v1/traces`). |
| **Camoufox** | `CAMOUFOX_EXECUTABLE_PATH`, `USE_CAMOUFOX` | Anti-detect browser. |
| **Fingerprint** | `FINGERPRINT_LAST_REQUEST_ID` (rotation) | Bot score checks. |

### 4.4 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/signals` | List signals with stakeholders (Supabase or mock). |
| GET | `/api/sources` | List scrape_sources (Green/Orange/Blue). |
| POST | `/api/seed` | Insert test signals + stakeholders + scrape_sources (idempotent). |
| GET | `/api/integration-status` | Which env vars are set (no secrets). |
| GET | `/api/history` | User professional history (auth). |
| POST | `/api/history` | Save professional history (auth). |
| POST | `/api/draft-pitch` | Generate persona-based draft (body: stakeholderType, headline, company, etc.). |
| POST | `/api/parse-executive-jd` | Parse JD text → entities; trigger Bridge if executive. |
| GET | `/api/cron/refresh-hubs` | Cron: Apify → filter → Apollo → insert (Bearer CRON_SECRET). |

---

## 5. UI Capabilities & Features

### 5.1 Global Layout & Theme

- **Background:** #F2F4F8 (surface).
- **Primary text:** #1A1C1E.
- **Accent (Bank Blue):** #005FB8 (buttons, links, badges).
- **Layout:** Max width 1600px, sticky header, main content area.

### 5.2 Auth Header

| Element | Behavior |
|---------|----------|
| **Logo + title** | “Transformation Pulse Global” with Activity icon. |
| **History link** | Navigate to `/settings/history`. |
| **User email** | Shown when authenticated. |
| **Sign out** | Sign out → redirect to `/login`. |

Visible only when Supabase is configured; gracefully hides auth UI when not.

### 5.3 Dashboard Page (`/`)

| Element | Description |
|---------|-------------|
| **Subtitle** | “Signal-driven intelligence for $1B+ digital transformation mandates · 7 hubs”. |
| **Amber banner** | When Supabase not configured: “Using mock data. Add NEXT_PUBLIC_SUPABASE_URL…” |
| **Blue banner** | When Supabase configured but no signals: “No signals in DB. Sign in to see live data.” + **Seed test data** button. |
| **Source Status Bar** | List of sources with status pills (Green = OK, Orange = Healing, Blue = Healed). |
| **Signals table** | Columns: Signal Pulse (keywords), Region, Company, Headline, Complexity Match %, Stakeholders, Actions. Row click opens War Room drawer. |
| **War Room Drawer** | Slide-out from right (see below). |

### 5.4 Signal Table

| Column | Content |
|--------|---------|
| **Signal Pulse** | Keyword tags (e.g. Vision 2030, Digital Core). |
| **Region** | SEA, Middle East, India, East Asia. |
| **Company** | Company name. |
| **Headline** | Role headline. |
| **Complexity Match %** | Numeric match score. |
| **Stakeholders** | Count or summary (e.g. “1 Recruiter, 1 HM, 3 Bridges”). |
| **Actions** | “Open” or similar (row click also opens drawer). |

- **Interaction:** Click row → open War Room drawer with that signal.
- **Responsive:** Horizontal scroll on small screens; min width ~900px.

### 5.5 War Room Drawer

| Section | Content |
|---------|---------|
| **Header** | “War Room” + close button. |
| **Live Trace Bar** | Steps: “Identifying target…” → “Found connection: [Name] (92% overlap)” → “Drafting ‘Peer’ pitch…” → “Ready to send.” (demo or custom from signal). |
| **Role** | Headline, company, hub, region. |
| **AI Summary** | Parsed JD summary + “Why this role matches” narrative. |
| **Stakeholder map** | Recruiter (name, title, firm), Hiring Manager (name, title, company), Bridges (name, title, company, RSS score, rank). Icons: User, Briefcase, Link2. |
| **Drafting logic note** | “Drafting logic: Hiring Manager → Peer… Recruiter → Partner… Bridge → Nostalgia & value.” |
| **Send Blueprint Pitch** | Button → calls `/api/draft-pitch` → shows generated draft in text area (persona-based). |
| **Ask for Intro** | Placeholder / future: request intro via Bridge. |

Backdrop click or close button closes drawer.

### 5.6 Source Status Bar

- **Label:** “Sources” with Wifi icon.
- **Pills per source:** Display name + status.
  - **Green (Standard):** CheckCircle2, `ok`.
  - **Orange (Healing):** Loader2 (spinning), `healing`.
  - **Blue (Healed):** RefreshCw, `healed`.
- **Legend:** “Green = OK · Orange = Healing · Blue = Healed”.

### 5.7 Live Trace Bar

- **Icon:** Radio (accent color).
- **Label:** “Live Trace:”
- **Steps (demo or from signal):** Identifying target → Found connection (optional name/overlap) → Drafting pitch (optional persona) → Ready to send.
- **Demo mode:** Auto-advances steps on interval; optional custom steps from War Room props.

### 5.8 Login Page (`/login`)

| Element | Description |
|---------|-------------|
| **Title** | “Transformation Pulse Global”. |
| **Subtitle** | “Sign in to access the dashboard.” |
| **Amber block** | When Supabase not configured: “Auth is not configured…” |
| **Form** | Email (required), Password. |
| **Sign in** | Submit → password auth (Supabase). |
| **Sign up** | Button → sign up with email/password. |
| **Magic link** | Button → signInWithOtp (email). |

Redirect after success to `/`; errors shown inline.

### 5.9 Settings → History (`/settings/history`)

| Element | Description |
|---------|-------------|
| **Person** | Name, LinkedIn URL (optional). |
| **Positions** | List of positions: company, title, start_date, end_date, overlap_years. Add / remove rows. |
| **Save History** | POST `/api/history` → “Saved.” or “Save failed.” |
| **Loading** | Fetch GET `/api/history` when authenticated; show “Auth not configured” when Supabase missing. |

Used for Bridge overlap and anonymized prompt context (never raw PII to LLM).

### 5.10 Integration Status (API Only)

- **GET /api/integration-status** returns: `supabase`, `supabaseServiceRole`, `apify`, `apollo`, `openai`, `cronSecret` (booleans). Consumed by dashboard for banners.

---

## 6. Data Model & Schema

### 6.1 Core Tables

| Table | Purpose |
|-------|---------|
| **signals** | One row per job mandate: region, hub, company, headline, source_portal, source_url, complexity_match_pct, signal_keywords, parsed_summary. |
| **stakeholders** | Recruiter/Hiring Manager/Bridge per signal: type, name, title, company, linkedin_url, email; for recruiters: origin, firm_name; for bridges: rss_score, tenure_years, recency_years, context_bonus, rank_order. |
| **user_professional_history** | Per user: positions (JSONB), person (JSONB); RLS: user owns own row. |

### 6.2 Self-Healing & Sources

| Table | Purpose |
|-------|---------|
| **scraper_selectors** | source_id, field_name, selector_type, selector_value, selector_previous, last_verified_at. |
| **scrape_sources** | id, display_name, region, status (ok/healing/healed), last_scraped_at, last_heal_at. |
| **heal_events** | source_id, field_name, trigger_reason, selector_before, selector_after, success, trace_id. |

### 6.3 Stealth & Sessions

| Table | Purpose |
|-------|---------|
| **browser_sessions** | hub_id, source_id, cookies_encrypted, user_agent, expires_at. |
| **regional_profiles** | hub_id, timezone_iana, proxy_provider, proxy_region, business_start_hour, business_end_hour. |

### 6.4 RLS Summary

- **signals, stakeholders:** Authenticated read/insert/update; service_role for cron/seed.
- **user_professional_history:** User can only access own row.
- **scraper_selectors, scrape_sources, heal_events:** Authenticated read; service_role write.
- **browser_sessions:** service_role only.
- **regional_profiles:** Authenticated read.

---

## 7. Algorithms & Logic

### 7.1 Bridge Algorithm (RSS)

**Relationship Strength Score:**

`RSS = (Tenure × 1.5) + (Recency × 2.0) + (Context × 1.0)`

- **Tenure:** Years of overlap at same company.
- **Recency:** `100 / (years_since_last_overlap + 1)` × 2.0.
- **Context:** +20 same Business Unit, +15 direct reporting line.

**Output:** Top N bridges per signal, ranked by RSS; `rankBridgesByRSS`, `topBridges`.

### 7.2 Ghost-Write Personas

| Audience | Persona | Focus |
|----------|---------|--------|
| Hiring Manager (CTO/CIO) | **Peer** | Pain relief, Citi-veteran, legacy core migration. |
| External Recruiter | **Partner** | Placement ease, $2B scale, immediate availability. |
| Bridge (connection) | **Bridge** | Nostalgia & value, catch-up, warm intro ask. |

Mapping: `getPersonaForStakeholder(type, origin)` → peer | partner | bridge.

### 7.3 Self-Healing Loop

1. **Trigger:** Missing core field, 403/404, SelectorNotFound.
2. **Capture:** DOM + optional screenshot.
3. **LLM:** “Previous selector failed. Find new path for [Field]. Return only CSS selector.”
4. **Verify:** Run new selector once; if success, update `scraper_selectors`.
5. **Log:** `heal_events` + optional Phoenix trace.

Modes: text-based (HTML only), vision-based (screenshot for complex portals).

### 7.4 Hidden Market (Executive JD)

- Parse JD (LLM): partnerName, partnerTitle, company, roleTitle, salaryRange, salaryMinUsd, isExecutive, contactNote.
- **$500k+ rule:** If salaryMinUsd ≥ 500k or isExecutive → find Partner on LinkedIn (Apollo → PhantomBuster fallback) → run Bridge logic for that person.

### 7.5 Privacy Sandbox

- **Anonymize for LLM:** Strip PII from professional history; send only companies, tenure ranges, total years (`anonymizeHistoryForLLM`, `anonymizedHistoryToPromptSummary`).
- **Local-first:** History can be stored in Supabase per user; never send raw contact list to public LLM.

---

## 8. Security, Privacy & Anti-Ban

### 8.1 Human-Mimicry Governor

| Control | Implementation |
|---------|----------------|
| **Jitter** | Gaussian delay ~1200–4500ms per action (click, scroll, navigate). |
| **Business hours** | Scrape only 09:00–18:00 in hub timezone (e.g. Asia/Riyadh, Asia/Singapore). |
| **Human-flow** | Land on home → scroll ~30% variable speed → hover random menu ~1.2s → navigate to job URL. |
| **Mouse** | Cubic Bézier path; variable velocity; random click within element. |
| **Session persistence** | Cookies stored encrypted in Supabase; reuse sessions (no re-login every run). |
| **Fail-safe** | On CAPTCHA or “Access Denied” → halt hub, log to Phoenix. |

### 8.2 Anti-Detection Stack

| Tool | Role |
|------|------|
| **Playwright-Stealth** | Override navigator.webdriver; WebGL/Canvas fingerprinting. |
| **Camoufox** | TLS/JA3 fingerprint bypass for strict portals. |
| **Fingerprint.com** | Bot score; if > threshold, rotate proxy/headers. |

### 8.3 Cookie & Session

- **Cookie cipher:** AES-256-GCM for browser_sessions cookies.
- **Middleware:** Supabase session refresh; redirect unauthenticated to `/login` except public paths (`/login`, `/auth/callback`).

---

## 9. Deployment & Operations

### 9.1 Build & Deploy

- **Framework:** Next.js 15 (App Router).
- **Build:** `npm run build` (TypeScript, ESLint).
- **Deploy:** Vercel (Git push → auto deploy); env vars in Vercel dashboard.

### 9.2 Cron

- **Schedule:** 08:00 SGT daily (Vercel cron).
- **Endpoint:** `GET /api/cron/refresh-hubs` with `Authorization: Bearer CRON_SECRET`.
- **Actions:** Apify jobs → technographic filter → Apollo people → insert signals/stakeholders (service_role).

### 9.3 Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local dev server. |
| `npm run build` | Production build. |
| `npm run scrape Riyadh bayt` | Playwright scraper for hub + source (with proxy/stealth if configured). |
| `npm run db:push` | Supabase migrations. |
| `npm run check-env` | Check required/optional env vars. |
| `npm run deploy` | `vercel --prod`. |

### 9.4 Regions & Hubs (Reference)

| Region | Hubs | Portals (examples) | Keywords (examples) |
|--------|------|--------------------|----------------------|
| SEA | Singapore, Vietnam | MyCareersFuture, VietnamWorks, TechInAsia | Decoupling, Agile Scale, Legacy Migration |
| Middle East | UAE, Saudi Arabia | Bayt, GulfTalent, NEOM | Vision 2030, Digital Core, Cloud Native |
| India | Mumbai, Bangalore | Naukri, Hirist, IIMJobs | GCC Setup, Platform Re-engineering, Scale |
| East Asia | Hong Kong | JobsDB, HKEX News | Transformation Lead, Modernization |

---

## 10. Risks & Considerations

### 10.1 JD Quality & Parsing Accuracy

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Messy/vague postings** | JD parsing assumes well-structured text; unstructured or ambiguous content may degrade summary accuracy. | Use fallback heuristics: if LLM parse fails or returns low confidence, fall back to keyword extraction, company name detection, and basic field mapping. Consider multi-pass parsing (first pass: structure detection, second pass: entity extraction). |

**Recommendations:**
- Add confidence scores to parsed entities (0–1).
- Implement fallback keyword-based extraction when LLM confidence < threshold.
- Log low-confidence parses for manual review.

### 10.2 PhantomBuster Dependency Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Partner resolution failure** | If PhantomBuster API is unavailable or rate-limited, executive Partner discovery may fail, blocking Bridge logic for high-value roles. | Consider optional LinkedIn API proxy layer (e.g. Proxycurl, ScraperAPI) as fallback. Implement retry logic with exponential backoff. Cache successful Partner resolutions in Supabase to reduce API calls. |

**Recommendations:**
- Add multiple fallback providers (PhantomBuster → Proxycurl → manual entry).
- Cache Partner LinkedIn URLs in `stakeholders` table to avoid repeated lookups.
- Implement circuit breaker pattern: if PhantomBuster fails N times, switch to fallback.

### 10.3 Legal Gray Zones & ToS Compliance

| Risk | Impact | Mitigation |
|------|--------|------------|
| **ToS violations** | Some scraping/anti-detection tactics may violate terms of service of job portals or LinkedIn. Legal exposure if detected. | Ensure IP & legal safeguards: bot score checks (Fingerprint.com), dynamic pause on detection, respect robots.txt, use official APIs where available (Apify, Apollo). Implement rate limiting and business-hours-only scraping. Document all data sources and usage. |

**Recommendations:**
- **Legal review:** Consult legal counsel on scraping practices per jurisdiction (SG, UAE, KSA, etc.).
- **Bot score monitoring:** If Fingerprint.com score > threshold, pause scraping for that source and alert.
- **Rate limiting:** Implement per-source rate limits (e.g. max 1 request per 5 seconds).
- **Data retention:** Clear old signals/stakeholders per retention policy (e.g. 90 days).
- **Terms compliance:** Prefer official APIs (Apify, Apollo) over direct scraping where possible.

### 10.4 Scaling Load & Performance

| Risk | Impact | Mitigation |
|------|--------|------------|
| **50+ signals/day** | Once tracking 50+ signals/day across 7 hubs, load from healing + session storage may rise steeply. Database queries, LLM healing calls, and cookie encryption/decryption may bottleneck. | Explore queue-based execution (e.g. BullMQ, Vercel Queue, or Supabase Edge Functions with queues). Batch healing operations. Optimize database queries (indexes, pagination). Consider caching parsed summaries. |

**Recommendations:**
- **Queue system:** Implement job queue for cron runs (Apify fetch → filter → Apollo → insert) to avoid timeouts.
- **Batch processing:** Group healing events by source; process in batches rather than per-signal.
- **Database optimization:** Add composite indexes on `signals(region, created_at)`, `stakeholders(signal_id, type)`. Implement pagination for dashboard (e.g. 20 signals per page).
- **Caching:** Cache parsed summaries in `signals.parsed_summary` to avoid re-parsing.
- **Session storage:** Consider Redis or Supabase Edge Functions KV for browser_sessions if Postgres becomes slow.
- **Monitoring:** Set up alerts for slow queries (>500ms), high error rates, or queue backlog.

### 10.5 Additional Considerations

| Area | Consideration |
|------|--------------|
| **Data privacy** | Ensure GDPR/CCPA compliance for EU/US users. Anonymize PII before LLM calls. Implement data export/deletion per user request. |
| **Cost management** | Monitor API costs (OpenAI, Apollo, Apify, PhantomBuster). Set monthly budgets and alerts. Consider caching to reduce redundant calls. |
| **Reliability** | Implement health checks for external APIs. Use retries with exponential backoff. Log failures to Phoenix for observability. |
| **User experience** | Add loading states for long-running operations (cron, healing). Show progress indicators. Handle errors gracefully with user-friendly messages. |

---

*End of Comprehensive Product Specification*
