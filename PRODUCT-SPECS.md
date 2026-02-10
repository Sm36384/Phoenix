# Transformation Pulse Global — Product Specification

**Version:** 1.0  
**Platform:** Private, signal-driven intelligence for $1B+ digital transformation mandates.

---

## 1. Product vision

- **Objective:** Track high-value digital transformation job mandates across **7 global hubs**: Singapore, Hong Kong, Dubai, Riyadh, Abu Dhabi, India, Vietnam.
- **Core engine:** A **Stakeholder Graph** that maps every job to:
  - **Hiring Manager** (e.g. CIO/CTO)
  - **Recruiter** (internal HR or external headhunter)
  - **The Bridge** — your top mutual connections, ranked by relationship strength.

---

## 2. Regions and signal sources

| Region      | Hubs                    | Target portals              | Signal keywords (examples)                    |
|-------------|-------------------------|-----------------------------|-----------------------------------------------|
| SEA         | Singapore, Vietnam      | MyCareersFuture, VietnamWorks, TechInAsia | Decoupling, Agile Scale, Legacy Migration     |
| Middle East | UAE, Saudi Arabia       | Bayt, GulfTalent, NEOM, bank portals      | Vision 2030, Digital Core, Cloud Native      |
| India       | Mumbai, Bangalore       | Naukri, Hirist, IIMJobs     | GCC Setup, Platform Re-engineering, Scale    |
| East Asia   | Hong Kong               | JobsDB, HKEX News           | Transformation Lead, Modernization            |

---

## 3. Data strategy (hybrid)

- **Job signals:** Aggregator API (e.g. Apify LinkedIn Jobs Scraper or TheirStack). Poll every **4 hours**; locations: SG, UAE, KSA, HK, VN.
- **Technographic filter:** Ingest only roles mentioning **Core Banking**, **Microservices**, or **API-led connectivity** (plus legacy/modernization keywords).
- **People discovery:** Apollo.io or Proxycurl for Hiring Manager (CTO, CIO, Head of Digital); Apify for job poster (Recruiter).
- **Bridge (warm intros):** LinkedIn graph / PhantomBuster → mutual connections → filter against your **professional history** (`my_history.json`) → rank by tenure overlap and compute **RSS**; flag **Warm Lead**.
- **Resilience:** Zyte or Bright Data (residential, geo-targeted) for scraping; no direct LinkedIn scraping with personal accounts.

---

## 4. Bridge algorithm (RSS)

**Relationship Strength Score** for each mutual connection:

**RSS = (Tenure × 1.5) + (Recency × 2.0) + (Context × 1.0)**

- **Tenure:** Years of overlap at the same company.
- **Recency:** 100 / (Years since last overlap + 1).
- **Context:** +20 if same Business Unit; +15 if direct reporting line.

**Output:** Top 3 Bridges per signal, ranked by RSS.

---

## 5. Power Triangle (per signal)

For every job signal the system resolves:

1. **Recruiter** — Internal (HR) or External (headhunter), with firm name (e.g. Korn Ferry).
2. **Hiring Manager** — Likely CIO/CTO/Head of Digital at the company (Apollo.io).
3. **The Bridges** — Top 3 mutual connections ranked by RSS; cross-referenced with your history for “Warm Lead” flag.

---

## 6. User interface

- **Theme:** Executive minimalist. Background **#F2F4F8**, primary text **#1A1C1E**, accents **#005FB8** (Bank Blue).
- **Main dashboard:** Single high-density table.
  - Columns: **Signal Pulse** (keywords), **Region**, **Company**, **Headline**, **Complexity Match %**, **Stakeholders**, **Actions**.
- **War Room (drawer):** Slide-out per signal with:
  - **AI Summary** — “Why this role matches your profile” (e.g. Citi $2B experience).
  - **Stakeholder map** — Recruiter, Hiring Manager, Bridges with RSS.
  - **Actions:** [Send Blueprint Pitch], [Ask for Intro].
- **Source status:** Per-source indicator — **Green** (OK), **Orange** (healing), **Blue** (healed after selector fix).

---

## 7. Self-healing (Phoenix Rebirth)

When a site changes (e.g. CSS/HTML) and a selector fails:

1. **Trigger:** Missing core field (Title, Company, etc.) or 403/404/SelectorNotFound.
2. **Analysis:** Capture DOM + screenshot → send to LLM (GPT-4o-vision or Gemini 1.5 Pro).
3. **LLM task:** “Previous selector failed. Find the new path for [Field]. Return only the CSS selector.”
4. **Verification:** Run new selector once; if it works, update **Selectors** table in Supabase.
5. **Reporting:** Log heal event (e.g. Arize Phoenix) for audit.

Modes: **Text-based** (HTML only, fast) and **Vision-based** (screenshot, for complex/bank portals).

---

## 8. Tech stack

| Layer         | Technology                          |
|---------------|--------------------------------------|
| Frontend      | Next.js 15 (App Router), Tailwind, Lucide Icons |
| Backend / DB  | Supabase (Postgres, Auth, RLS)       |
| Job sourcing  | Apify (LinkedIn Jobs Scraper) or TheirStack |
| People        | Apollo.io, Proxycurl                 |
| Bridge / intros | PhantomBuster, `my_history.json`   |
| AI / healing  | Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro |
| Proxies       | Zyte, Bright Data                    |
| Observability | Arize Phoenix (tracing, audit)       |

---

## 9. Data and privacy

- All contact and stakeholder data in **private Supabase tables** with **Row Level Security (RLS)**.
- Cron: refresh all 7 hubs at **08:00 SGT** daily (when live).
- No storage of LinkedIn credentials; use proxy/API services only.

---

## 10. Human-Mimicry Governor (Anti-Ban / Shadow Pillar)

LinkedIn and Tier-1 bank portals detect bot rhythm. Scrapers must mimic human behavior.

- **Jitter:** Every action (click, scroll, navigate) uses a **randomized delay** with **Gaussian distribution** (bell curve), not fixed intervals. Range: 1200ms–4500ms.
- **Business hours:** Scrapers run only during the **target hub’s local 09:00–18:00** (e.g. 9 AM–6 PM GST for Riyadh) to look like a human researcher.
- **Human-flow protocol:** Before scraping a job URL:
  1. Land on home page.
  2. Scroll down ~30% (variable speed).
  3. Hover over a random menu item ~1.2s.
  4. Then navigate to the job URL.
- **Mouse movement:** Use **cubic Bézier** curves for cursor path (not straight lines); variable velocity (slower at start/end); **target randomization** (click a random pixel within the button padding).
- **Session persistence:** Store **browser cookies in Supabase**; reuse sessions so the agent does not trigger “New Login” alerts.
- **Fail-safe:** On **CAPTCHA** or **“Access Denied”**, **immediately halt** all scraping for that hub and alert Arize Phoenix for manual review.

**Security layer (Phase 2):**

| Tool | Purpose | Instruction |
|------|---------|-------------|
| Playwright-Stealth | Fingerprint evasion | Override `navigator.webdriver`; fix WebGL/Canvas fingerprinting. |
| Camoufox | Anti-detect | Use for KSA/Singapore bank portals to bypass TLS/JA3 fingerprinting. |
| Fingerprint.com API | Testing | If “Bot Score” > 10%, auto-rotate proxy and browser headers. |

---

## 11. Hidden Market Discovery (Executive Search)

Executive mandates often have “Contact [Partner Name]” instead of “Apply Now.”

- **OCR & entity parsing:** On boutique headhunter sites (e.g. Aquis, Korn Ferry), use **GPT-4o-Vision** to “read” the PDF or image of the job description and extract the **Partner’s name**.
- **$500k+ rule:** If a role is $500k+, ignore the generic portal; find the **Partner on LinkedIn** and run **Bridge logic** for that person specifically.

---

## 12. Ghost-Write Blueprint Library (Persona-Based Prompting)

Three distinct AI “voices” in the War Room:

| Audience | Persona | Focus |
|----------|---------|--------|
| **Hiring Manager (CTO/CIO)** | **Peer** | Strategic, problem-focused, “Citi-veteran.” Pain relief: legacy core migration bottlenecks you solved. |
| **External Recruiter** | **Partner** | Concise, high-value. Placement ease: $2B scale, immediate availability for Middle East. |
| **Bridge (connection)** | **Bridge** | Low-friction, catch-up. Nostalgia & value: e.g. “Remember that mess we fixed in 2019?” |

Drafting logic is applied automatically based on stakeholder type when generating pitch or intro text.

---

## 13. War Room UI: Live Trace

The drawer includes a **Live Trace** status bar showing what the AI is doing, e.g.:

- “Identifying target...”
- “Found connection: Vikas P. (92% overlap)...”
- “Drafting ‘Peer’ pitch referencing Riyadh Vision 2030...”
- “Ready to send.”

---

## 14. Technical Addendum (Privacy & Sessions)

| Feature | Implementation |
|---------|----------------|
| **Session persistence** | Stealth browser contexts; store cookies in Supabase; reuse sessions to avoid “New Login” alerts. |
| **Privacy sandbox** | **Local-first** storage for `my_history.json`. Never send raw contact list to a public LLM; only anonymized metadata. |
| **Paywall bypass** | Cookie injection for premium boards (e.g. GulfTalent, LinkedIn Sales Nav) using existing sessions. |

---

## 15. Regional Profiles (Safe Hub)

| Hub | Timezone | Proxy (example) |
|-----|----------|------------------|
| Singapore | SGT (Asia/Singapore) | Residential (StarHub/Singtel) |
| Riyadh | AST (Asia/Riyadh) | Residential (STC/Mobily) |

Scrapers use the correct proxy and timezone per hub so traffic looks local and within business hours.

---

## 16. Deliverables (implemented)

- **Phase 1:** Next.js app, gray theme, Supabase schema (Signals, Stakeholders), Bridge algorithm, mock Riyadh scraper, dashboard table + War Room drawer.
- **Phase 2:** Hybrid data strategy, Self-Healing, Selectors/Heal events/Source status, **Jitter + business-hours**, **Bézier human-mouse**, **Ghost-Write personas**, **Live Trace bar**, **browser_sessions + regional_profiles** schema.
- **Phase 3 (roadmap):** Live Apify/Apollo/cron, Playwright-Stealth/Camoufox, Fingerprint.com, full Arize Phoenix, production deploy.

---

*End of Product Specification*
