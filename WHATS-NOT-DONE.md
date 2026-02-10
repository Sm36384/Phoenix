# What’s Not Done — Transformation Pulse Global

Gaps between the **Product Spec** and current implementation (as of Phase 2 complete).

---

## 1. **Scheduled cron (08:00 SGT daily)**

- **Spec:** Refresh all 7 regional hubs at **08:00 SGT** daily.
- **Status:** ✅ Implemented. `GET /api/cron/refresh-hubs` (Vercel cron `0 0 * * *` = 08:00 SGT); secured by `CRON_SECRET` or `x-vercel-cron`.
- **Needed:** (was) A scheduled job that runs at 08:00 SGT and calls your job-sourcing + people-discovery + bridge logic for each hub (e.g. Vercel Cron, GitHub Actions, or external scheduler hitting an API route like `POST /api/cron/refresh-hubs`).

---

## 2. **Real Arize Phoenix integration**

- **Spec:** Log every reasoning step and heal event to **Arize Phoenix** for audit.
- **Status:** Placeholder only: in-memory trace buffer in `phoenix-trace.ts`; no SDK or OTLP export.
- **Needed:** Integrate `@arize-ai/phoenix` (or OTLP) and send spans/traces from heal loop, fail-safe, and key decisions (e.g. why a manager was picked).

---

## 3. **Playwright-Stealth plugin (full)**

- **Spec:** Use **Playwright-Stealth** for fingerprint evasion (e.g. `navigator.webdriver`, WebGL/Canvas).
- **Status:** Custom evasion script in `launch-browser.ts` only; no `playwright-extra` or official stealth plugin.
- **Needed:** Add and use a proper stealth plugin (e.g. `playwright-extra` + stealth) in the scraper runtime for stronger anti-detection.

---

## 4. **Camoufox for KSA/SG bank portals**

- **Spec:** Use **Camoufox** for Saudi/Singapore bank portals to bypass TLS/JA3 fingerprinting.
- **Status:** ✅ Config in `proxy-config.ts`: `useCamoufoxForHub(hubId)`; set `USE_CAMOUFOX=1` or auto for Riyadh/Singapore.
- **Needed:** (was) Optional “use Camoufox” path in scraper bootstrap for those hubs (separate browser engine).

---

## 5. **Fingerprint.com API (exact)**

- **Spec:** If **Bot Score > 10%**, auto-rotate proxy and headers.
- **Status:** Stub in `bot-score.ts` that calls an assumed endpoint; real Fingerprint.com server API may differ.
- **Needed:** Wire to Fingerprint.com’s real Server API / bot product and implement “rotate proxy + headers” when `shouldRotate` is true.

---

## 6. **Cookie encryption at rest**

- **Spec:** Session persistence with “stealth browser contexts” and secure storage.
- **Status:** Cookies are stored in Supabase as **base64** only, not encrypted.
- **Needed:** Encrypt cookies with a server-side secret (e.g. AES) before writing to `browser_sessions` and decrypt when loading.

---

## 7. **Supabase Auth in the app**

- **Spec:** Private access; RLS for authenticated users.
- **Status:** RLS policies assume `authenticated` and `service_role`, but the app has **no login/signup** or Supabase Auth client.
- **Needed:** Add Supabase Auth (e.g. magic link or email/password), protect dashboard so only signed-in users can read signals/stakeholders, and use the same auth for any cron that uses anon/key.

---

## 8. **End-to-end scraper runner**

- **Spec:** Scraper that uses human-flow, fail-safe, jitter, Bézier mouse, session inject, and writes to Supabase.
- **Status:** All building blocks exist (human-flow, fail-safe, jitter, human-mouse, session persistence, bootstrap), but there is **no single script** that runs a full scrape for one hub (e.g. “run for Riyadh”) from URL list → Playwright + stealth → human-flow → extract → save signals/stakeholders).
- **Needed:** One or more runnable scripts (e.g. `scripts/scrape-hub.ts`) that orchestrate the above and persist to Supabase.

---

## 9. **Proxy configuration in code**

- **Spec:** Zyte / Bright Data (e.g. Riyadh proxy for Saudi portals); regional profiles (Singapore = StarHub/Singtel, Riyadh = STC/Mobily).
- **Status:** Regional profiles exist in DB/schema; **no code** that actually sets proxy on Playwright/browser (e.g. `proxy: { server, username, password }`).
- **Needed:** When launching the browser for a hub, read proxy from config/DB and pass it into the browser/context.

---

## 10. **Production deployment**

- **Spec:** Deploy for production use.
- **Status:** No deploy config or docs (no Vercel/Railway/etc. or env checklist for production).
- **Needed:** Choose a host, add deploy config, document production env vars and any cron setup.

---

## 11. **LinkedIn/PhantomBuster for “find Partner”**

- **Spec:** For $500k+ roles, “find the Partner on LinkedIn” and run Bridge logic for them.
- **Status:** We use **Apollo** to find the person by name/company; we do **not** call PhantomBuster or a LinkedIn graph scraper to get “Partner” from LinkedIn.
- **Needed:** Optional integration to PhantomBuster (or similar) to resolve “Partner” from LinkedIn when Apollo doesn’t have them.

---

## 12. **Editable my_history (local-first UI)**

- **Spec:** Local-first storage for `my_history.json`; never send raw contact list to a public LLM.
- **Status:** History is a **static JSON file**; anonymization for LLM is done. No UI to view/edit history.
- **Needed (optional):** Settings page or similar to view/edit professional history (and optionally store in Supabase or localStorage) while still only sending anonymized data to the LLM.

---

## Quick reference

| Item                         | Priority | Effort (rough) |
|-----------------------------|----------|-----------------|
| Cron 08:00 SGT              | High     | Small           |
| Arize Phoenix               | High     | Medium          |
| Auth (Supabase)              | High     | Medium          |
| E2E scraper script           | High     | Medium          |
| Proxy in browser launch      | High     | Small           |
| Cookie encryption           | Medium   | Small           |
| Playwright-Stealth plugin    | Medium   | Small           |
| Fingerprint.com real API     | Medium   | Small           |
| Camoufox                     | Low      | Medium          |
| PhantomBuster / LinkedIn     | Low      | Medium          |
| Production deploy            | High     | Small–medium    |
| Editable my_history UI       | Low      | Medium          |
