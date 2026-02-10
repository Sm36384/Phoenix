# Master Project Specification: Transformation Pulse Global

This document is the Master Project Specification for building Transformation Pulse Global. It contains the comprehensive architectural logic, regional data parameters, and functional requirements.

## 1. SYSTEM ARCHITECTURE & GOALS

- **Objective:** Build a private, signal-driven intelligence platform to track $1B+ digital transformation mandates across 7 global hubs: Singapore, Hong Kong, Dubai, Riyadh, Abu Dhabi, India, and Vietnam.
- **Core Engine:** A "Stakeholder Graph" that maps every job mandate to its specific Hiring Manager, Recruiter, and the candidate's Mutual Connections (The Bridge).

## 2. DATA INGESTION: REGIONAL SCRAPER FACTORY

Multi-region scraping service with high resilience.

| Region      | Hubs                    | Target Portals (Priority)              | Signal Trigger Keywords                                    |
|------------|-------------------------|----------------------------------------|------------------------------------------------------------|
| SEA        | Singapore, Vietnam      | MyCareersFuture, VietnamWorks, TechInAsia | "Decoupling", "Agile Scale", "Legacy Migration"           |
| Middle East| UAE, Saudi Arabia       | Bayt, GulfTalent, NEOM, FAB/ADCB Portals | "Vision 2030", "Digital Core", "Cloud Native"             |
| India      | Mumbai, Bangalore       | Naukri, Hirist, IIMJobs                | "GCC Setup", "Platform Re-engineering", "Scale"           |
| East Asia  | Hong Kong               | JobsDB, HKEX News                      | "Transformation Lead", "Modernization"                    |

**Scraping logic:** Stealth (Playwright + stealth plugin, residential proxies). Self-healing: LLM-based visual analysis if CSS selectors fail.

## 3. INTELLIGENCE LOGIC: THE "BRIDGE" ALGORITHM

Relationship Strength Score (RSS) for every mutual connection:

**RSS = (Tenure × 1.5) + (Recency × 2.0) + (Context × 1.0)**

- **Tenure:** Years of overlap at the same company.
- **Recency:** 100 / (Years since last overlap + 1).
- **Context:** +20 if same Business Unit; +15 if direct reporting line.

## 4. THE "POWER TRIANGLE" STAKEHOLDER MAPPING

For every detected signal:

- **Recruiter:** Internal (HR) or External (Headhunter), tag with firm name.
- **Hiring Manager:** Cross-reference role title with Apollo.io API (likely CIO/CTO).
- **The Bridges:** Top 3 LinkedIn connections ranked by RSS.

## 5. UI SPECIFICATION (EXECUTIVE MINIMALIST)

- **Palette:** Background #F2F4F8, Primary Text #1A1C1E, Accents #005FB8 (Bank Blue).
- **Main Dashboard:** High-density table. Columns: [Signal Pulse], [Region], [Company], [Headline], [Complexity Match %], [Stakeholders].
- **War Room Drawer:** Slide-out with AI Summary, Stakeholder Map, [Send Blueprint Pitch], [Ask for Intro].

## 6. TECH STACK

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS + Lucide Icons.
- **Backend/Database:** Supabase (Postgres, Auth, RLS).
- **AI:** Claude 3.5 Sonnet for JD parsing and pitch drafting.
- **Connectivity:** Apollo.io API for contact discovery.

## 7. DEPLOYMENT & OPERATION

- **Cron:** Refresh all 7 regional hubs at 08:00 SGT daily.
- **Privacy:** All contact data in private Supabase tables with RLS enabled.

---

## 8. HYBRID DATA STRATEGY (2026)

Official APIs (e.g. LinkedIn) are restrictive; combine **Official Endpoints**, **Aggregator APIs**, and **Headless Browser Agents**.

### 8.1 Job Board Integration (Signal Sourcing)

- **Primary tool:** TheirStack API or **Apify LinkedIn Jobs Scraper** (aggregator handles deduplication and normalization).
- **Poll:** Every 4 hours; query for roles in SG, UAE, KSA, HK, VN.
- **Technographic filter:** Only ingest roles mentioning **Core Banking**, **Microservices**, or **API-led connectivity**.
- **Normalization:** Map the raw job object to the **Generic Signal Schema** (region, hub, company, headline, complexity_match_pct, signal_keywords, etc.).

### 8.2 LinkedIn Intelligence (People Discovery)

Avoid direct scraping (account ban risk). Use **Hidden API / proxy** services that mimic browser behavior without your credentials.

**Triangulation:**

- **Node A (Company):** From the job signal, extract Company ID.
- **Node B (Hiring Manager):** Use **Apollo.io** or **Proxycurl** to find person with title "CTO," "CIO," or "Head of Digital" at that company.
- **Node C (Recruiter):** Use **Apify LinkedIn Poster Scraper** to identify who posted the job.

### 8.3 Networking / Bridge Logic (Warm Outreach)

Turn cold data into warm outreach via mutual overlap.

**Overlap engine:**

1. **Input:** Hiring Manager LinkedIn profile URL.
2. **Step 1:** Use a LinkedIn graph scraper (e.g. **PhantomBuster**) to get "Mutual Connections."
3. **Step 2 (Filter):** Compare mutual connections against **Professional History** in `my_history.json`.
4. **Step 3 (Ranking):** Rank by tenure overlap (e.g. "Worked at Citi with you for 4 years" = high priority). Compute RSS and flag "Warm Lead."

### 8.4 Resilience

Use **Zyte** or **Bright Data** (residential proxies, geo-targeted e.g. Riyadh for Saudi portals) for all web-scraping tasks to prevent IP blocking.

---

## 9. SELF-HEALING MODULE: "PHOENIX REBIRTH"

When a job board or bank portal changes HTML (e.g. `.apply-btn` → `.x78jk9`), the system enters a **Healing Mode** instead of failing.

### 9.1 The Loop

1. **Trigger:** If any core field (Title, Company, Stakeholder) is missing from a scrape, or 403/404/SelectorNotFound → enter **Healing Mode**.
2. **Analysis:**
   - Capture full DOM and a high-res screenshot of the page.
   - Send to LLM: *"The previous selector failed. Based on this visual and HTML, find the new path for [Field Name]. Return only the valid CSS selector."*
3. **Verification:** Run the new selector once. If it returns data, update the **Selectors** table in Supabase.
4. **Reporting:** Log the **Heal** event (e.g. in Arize Phoenix) so you can see which sites change frequently.

### 9.2 Causal Loop (Root Cause)

- **Failure capture:** 403, SelectorNotFound, or null for required field.
- **Phoenix trace:** Log failure into Arize Phoenix.
- **Visual/causal analysis:** Screenshot + full DOM → LLM (GPT-4o-vision or Gemini 1.5 Pro with 1M+ token window for large bank portals).
- **Re-instrumentation:** AI outputs new CSS selector → test on one page → if success, update Supabase Config/Selectors table.

### 9.3 Healing Modes

- **Text-based (fast/cheap):** AI reads HTML only. Good for ~90% of changes.
- **Vision-based (gold standard):** AI "looks" at the page. Use for high-stakes Middle East / Singapore bank portals with heavy JS or security.

### 9.4 Dashboard Status per Source

- **Green:** Standard scraping OK.
- **Orange:** Site structure changed; Phoenix is currently healing.
- **Blue:** Successfully healed (selector updated).

---

## 10. INTEGRATION LOGIC COMMAND (Copy-Paste for Devin/Cursor)

```markdown
1. **Job Sourcing:** Connect to the Apify "LinkedIn Jobs Scraper" Actor.
   - Input: Search keywords ["Core Banking Transformation", "Legacy Modernization"].
   - Locations: ["Singapore", "Riyadh", "Dubai", "Mumbai", "Vietnam"].
2. **People Discovery:** For every job found, call the Apollo.io "People Search" API.
   - Search: [Company Name] + Seniority: C-Level, VP + Department: IT, Engineering.
3. **Bridge Logic:** Create a function `find_mutual_overlap(manager_id)`.
   - Cross-reference manager_id's past companies with my_history.json.
   - If match found, flag as "Warm Lead" and calculate Relationship Strength Score (RSS).
4. **Resilience:** Use Zyte or Bright Data proxies for all web-scraping tasks to prevent IP blocking.
```

---

## 11. SELF-HEALING BUILD COMMAND (Copy-Paste)

```markdown
Implement a Self-Healing Scraper Module using Arize Phoenix for tracing. If any data field returns null, trigger an "LLM-Heal" event: capture a screenshot of the page, use GPT-4o-vision to find the new data path, and update the selector in our Supabase "Config" (or "Selectors") table. Ensure this is fully autonomous and logs the "before and after" logic in the dashboard.
```

---

## 12. TECH LAYER SUMMARY

| Layer        | Technology        | Instruction |
|-------------|--------------------|-------------|
| Observability | Arize Phoenix    | Log every reasoning step for audit (why a certain manager was picked). |
| Bypass      | Zyte / Bright Data | Use residential proxies located in Riyadh for Saudi portals. |
| Database    | Supabase          | Maintain a **Selectors** (or Config) table that the AI can update when site structure changes. |
| Healing     | Gemini 1.5 Pro / GPT-4o | Use vision + large context to analyze full bank portals for structural changes. |

---

**Phase 1 (DONE):** Scaffold Next.js, Supabase schema, Bridge algorithm, mock Riyadh scraper, UI grid + War Room drawer.

**Phase 2 (DONE):** Hybrid Data Strategy (job sourcing, people discovery, bridge overlap), Self-Healing module, Selectors table, source status UI.

**Phase 3:** Live Apify/Apollo/cron, Arize Phoenix integration, production deploy.

---

## 13. HUMAN-MIMICRY GOVERNOR (ANTI-BAN / SHADOW PILLAR)

- **Jitter:** Gaussian delay 1200–4500ms for every action (click, scroll, navigate).
- **Business hours:** Scrape only 09:00–18:00 in the **target hub’s local timezone** (e.g. GST Riyadh, SGT Singapore).
- **Human-flow:** Land on home → scroll 30% variable speed → hover random menu ~1.2s → then go to job URL.
- **Mouse:** Cubic Bézier path; variable velocity; random point inside button (not center).
- **Session persistence:** Store cookies in Supabase; reuse sessions (no re-login every run).
- **Fail-safe:** On CAPTCHA or Access Denied → **halt** that hub and log to Arize Phoenix.

**Security layer:** Playwright-Stealth (fingerprint evasion), Camoufox (KSA/SG bank TLS/JA3), Fingerprint.com (if Bot Score > 10% → rotate proxy/headers).

---

## 14. HIDDEN MARKET & GHOST-WRITE

- **Executive discovery:** For boutique headhunter pages (PDF/image JD), use GPT-4o-Vision to extract **Partner name**. If role $500k+, find Partner on LinkedIn and run Bridge logic for them.
- **Ghost-Write personas:** Peer (HM: pain relief), Partner (Recruiter: placement ease), Bridge (connection: nostalgia & value). War Room applies drafting logic by stakeholder type.

---

## 15. TECHNICAL ADDENDUM

- **Session persistence:** Stealth browser contexts; cookies in Supabase.
- **Privacy sandbox:** `my_history.json` local-first; never send raw contact list to public LLM; anonymized metadata only.
- **Paywall:** Cookie injection for GulfTalent / LinkedIn Sales Nav using stored sessions.

---

## 16. ANTI-BAN GOVERNOR (COPY-PASTE FOR DEVIN)

```markdown
## ANTI-BAN GOVERNOR (SHADOW PILLAR)
- **Timezone alignment:** Scrapers run only during target hub local business hours (09:00–18:00).
- **Session persistence:** Store browser cookies in Supabase. Do not re-login every scrape; reuse sessions to avoid "Suspicious Login" alerts.
- **Natural interaction:** Use `page.mouse.move()` along Bézier curves, not linear paths. Variable velocity; random click target inside element.
- **Fail-safe:** If CAPTCHA or "Access Denied" is detected, immediately halt all scraping for that hub and alert Arize Phoenix for manual review.
```

---

## 17. REGIONAL PROFILES (SAFE HUB)

- **Singapore:** Residential proxy (StarHub/Singtel) + SGT.
- **Riyadh:** Residential proxy (STC/Mobily) + AST.
