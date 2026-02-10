# Step 3: Setting Up Scraping Workers

Guide for setting up external scraping workers that can run independently from Vercel.

---

## Overview

Scraping workers should run **outside Vercel** because:
- Playwright/Camoufox require a full Node.js runtime (not serverless)
- Long-running operations (scraping can take minutes)
- Human-mimicry logic (jitter, mouse, business hours) stays with the scraper

**Two Options:**
1. **Option A:** Use existing `scripts/scrape-hub.ts` locally or on a server
2. **Option B:** Set up a dedicated worker service (Docker, VM, or cloud function)

---

## Option A: Using Existing Scraper Script (Simplest)

### Prerequisites

```bash
# Install dependencies (if not already installed)
npm install playwright playwright-extra puppeteer-extra-plugin-stealth tsx

# Install Playwright browsers
npx playwright install chromium
```

### Environment Variables

Create a `.env` file in the project root (or set in your environment):

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Proxies
ZYTE_PROXY=http://your-proxy.zyte.com:8011
ZYTE_API_KEY=your_zyte_key

# Optional: Camoufox
USE_CAMOUFOX=true
CAMOUFOX_EXECUTABLE_PATH=/path/to/camoufox

# Optional: Fingerprint.com
FINGERPRINT_API_KEY=your_key
FINGERPRINT_LAST_REQUEST_ID=request_id_from_frontend

# Optional: Scraping URLs
SCRAPE_HOME_URL=https://www.bayt.com/en/saudi-arabia/
SCRAPE_JOB_URL=https://www.bayt.com/en/saudi-arabia/jobs/...
```

### Running the Scraper

```bash
# Basic usage
npx tsx scripts/scrape-hub.ts Riyadh bayt

# With custom URLs
SCRAPE_HOME_URL=https://www.bayt.com/en/saudi-arabia/ \
SCRAPE_JOB_URL=https://www.bayt.com/en/saudi-arabia/jobs/12345 \
npx tsx scripts/scrape-hub.ts Riyadh bayt

# For different hubs/sources
npx tsx scripts/scrape-hub.ts Singapore mycareersfuture
npx tsx scripts/scrape-hub.ts Dubai gulftalent
```

### What It Does

1. ✅ Checks business hours (aborts if outside 9 AM–6 PM hub time)
2. ✅ Loads proxy config for hub
3. ✅ Launches browser with stealth (Playwright-Stealth or Camoufox)
4. ✅ Runs human-flow protocol (home → scroll → hover → job URL)
5. ✅ Checks for blocking (CAPTCHA, Access Denied)
6. ✅ Checks bot score (Fingerprint.com) and rotates if needed
7. ✅ Saves signal to Supabase

### Scheduling (Cron)

On Linux/Mac, add to crontab:

```bash
# Edit crontab
crontab -e

# Run Riyadh scraper at 10 AM AST (7 AM UTC) on weekdays
0 7 * * 1-5 cd /path/to/project && npx tsx scripts/scrape-hub.ts Riyadh bayt

# Run Singapore scraper at 10 AM SGT (2 AM UTC) on weekdays
0 2 * * 1-5 cd /path/to/project && npx tsx scripts/scrape-hub.ts Singapore mycareersfuture
```

---

## Option B: External Worker Service (Production)

### Architecture

```
┌─────────────────────────────────────┐
│   Worker Service (Node.js/TS)       │
│   - Playwright/Camoufox            │
│   - Human-mimicry logic             │
│   - Self-healing                    │
│   - Reads regional_profiles        │
│   - Writes to Supabase              │
└──────────────┬──────────────────────┘
               │
               │ (service_role key)
               ▼
┌─────────────────────────────────────┐
│         Supabase                    │
│   - regional_profiles (config)      │
│   - scraper_selectors (healing)      │
│   - signals, stakeholders (data)   │
└─────────────────────────────────────┘
```

### Step 1: Create Worker Service Structure

Create a new directory for your worker service:

```bash
mkdir scraping-worker
cd scraping-worker
npm init -y
npm install playwright playwright-extra puppeteer-extra-plugin-stealth @supabase/supabase-js dotenv
npm install -D typescript @types/node tsx
```

### Step 2: Worker Service Code

Create `src/worker.ts`:

```typescript
/**
 * Scraping Worker Service
 * Reads config from Supabase regional_profiles, scrapes jobs, writes signals.
 */

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { config } from "./config";

interface RegionalProfile {
  id: string;
  hub_id: string;
  timezone_iana: string;
  proxy_provider?: string;
  proxy_region?: string;
  business_start_hour: number;
  business_end_hour: number;
}

async function getRegionalProfile(hubId: string): Promise<RegionalProfile | null> {
  const supabase = createClient(
    config.supabase.url!,
    config.supabase.serviceRoleKey!
  );

  const { data } = await supabase
    .from("regional_profiles")
    .select("*")
    .eq("hub_id", hubId)
    .single();

  return data as RegionalProfile | null;
}

async function scrapeHub(hubId: string, sourceId: string) {
  // Step 1: Get regional profile (timezone, proxy config)
  const profile = await getRegionalProfile(hubId);
  if (!profile) {
    throw new Error(`No regional profile for hub: ${hubId}`);
  }

  // Step 2: Check business hours
  const now = new Date();
  const tzHour = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.timezone_iana,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const hour = parseInt(tzHour, 10);

  if (hour < profile.business_start_hour || hour >= profile.business_end_hour) {
    console.log(`Outside business hours for ${hubId} (${profile.timezone_iana})`);
    return;
  }

  // Step 3: Get selectors from Supabase
  const supabase = createClient(
    config.supabase.url!,
    config.supabase.serviceRoleKey!
  );

  const { data: selectors } = await supabase
    .from("scraper_selectors")
    .select("*")
    .eq("source_id", sourceId);

  // Step 4: Launch browser with proxy (if configured)
  const proxy = getProxyForHub(hubId, profile);
  const browser = await chromium.launch({
    headless: true,
    proxy: proxy ?? undefined,
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  });

  const page = await context.newPage();

  // Step 5: Scrape jobs (implement your scraping logic here)
  // ... scraping code ...

  // Step 6: Save signals to Supabase
  const signals = []; // Your scraped signals
  if (signals.length > 0) {
    await supabase.from("signals").insert(signals);
  }

  await browser.close();
}

function getProxyForHub(hubId: string, profile: RegionalProfile) {
  // Read proxy from env or profile
  const proxyServer = process.env[`PROXY_${hubId.toUpperCase()}`] ?? process.env.ZYTE_PROXY;
  if (!proxyServer) return undefined;

  return {
    server: proxyServer,
    username: process.env.ZYTE_API_KEY,
    password: process.env.ZYTE_API_KEY, // Or separate password
  };
}

// Main entry point
async function main() {
  const hubId = process.argv[2] ?? "Riyadh";
  const sourceId = process.argv[3] ?? "bayt";

  try {
    await scrapeHub(hubId, sourceId);
    console.log(`Scrape complete: ${hubId} / ${sourceId}`);
  } catch (error) {
    console.error("Scrape failed:", error);
    process.exit(1);
  }
}

main();
```

### Step 3: Config File

Create `src/config.ts`:

```typescript
import dotenv from "dotenv";
dotenv.config();

export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
};
```

### Step 4: Package.json Scripts

```json
{
  "scripts": {
    "scrape": "tsx src/worker.ts",
    "scrape:riyadh": "tsx src/worker.ts Riyadh bayt",
    "scrape:singapore": "tsx src/worker.ts Singapore mycareersfuture"
  }
}
```

### Step 5: Deploy Worker Service

**Option B1: Docker**

Create `Dockerfile`:

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx playwright install chromium

CMD ["npm", "run", "scrape"]
```

Build and run:

```bash
docker build -t scraping-worker .
docker run --env-file .env scraping-worker Riyadh bayt
```

**Option B2: Cloud VM (AWS EC2, DigitalOcean, etc.)**

1. Set up a VM with Node.js 20+
2. Clone your repo (or copy worker code)
3. Install dependencies: `npm install`
4. Install Playwright browsers: `npx playwright install chromium`
5. Set environment variables
6. Run via cron or systemd service

**Option B3: Cloud Functions (AWS Lambda, Google Cloud Functions)**

Note: Playwright on Lambda requires special setup (layers, headless Chrome). Consider using Apify or a dedicated VM instead.

---

## Reading Regional Profiles from Supabase

Workers should read `regional_profiles` to know:
- Timezone for business hours check
- Proxy provider/region
- Business hours (start/end)

**Example:**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get profile for a hub
const { data: profile } = await supabase
  .from("regional_profiles")
  .select("*")
  .eq("hub_id", "Riyadh")
  .single();

// Use profile.timezone_iana for business hours
// Use profile.proxy_region for proxy selection
```

**Or use the helper:**

```typescript
import { getRegionalProfile, isHubInBusinessHours } from "@/lib/scraper/read-regional-profile";

const profile = await getRegionalProfile("Riyadh");
if (!isHubInBusinessHours(profile)) {
  console.log("Outside business hours");
  return;
}
```

---

## Reading Selectors from Supabase

Before scraping, read selectors:

**Using helper:**

```typescript
import { getSelectorsForSource, getSelector } from "@/lib/scraper/read-selectors";

// Get all selectors for a source
const selectors = await getSelectorsForSource("bayt");
const titleSelector = selectors.get("title") ?? ".job-title";
const companySelector = selectors.get("company") ?? ".company-name";

// Or get single selector with fallback
const titleSelector2 = await getSelector("bayt", "title", ".job-title");
```

**Direct Supabase:**

```typescript
const { data: selectors } = await supabase
  .from("scraper_selectors")
  .select("*")
  .eq("source_id", "bayt");

// Use selectors in your scraping code
const titleSelector = selectors?.find(s => s.field_name === "title")?.selector_value ?? ".job-title";
const companySelector = selectors?.find(s => s.field_name === "company")?.selector_value ?? ".company-name";

// Scrape using selectors
const title = await page.textContent(titleSelector);
const company = await page.textContent(companySelector);
```

---

## Updating Scraper Selectors (Self-Healing)

When healing succeeds, update `scraper_selectors`:

**Example:**

```typescript
import { updateSelector, setSourceStatus } from "@/lib/self-healing/heal-loop";

// After LLM finds new selector
const newSelector = ".new-job-title"; // From LLM
const oldSelector = ".old-job-title"; // Previous selector

// Update selector in Supabase
await updateSelector("bayt", "title", newSelector, oldSelector);

// Mark source as healed
await setSourceStatus("bayt", "healed", {
  last_heal_at: new Date().toISOString(),
});
```

**From worker script:**

```typescript
// In your worker, after detecting selector failure:
const { updateSelector, setSourceStatus } = await import("./lib/self-healing/heal-loop");

// Trigger healing
await setSourceStatus(sourceId, "healing");

// Call LLM heal (implement or import)
const healedSelector = await llmHeal(html, screenshot, fieldName);

if (healedSelector) {
  await updateSelector(sourceId, fieldName, healedSelector, oldSelector);
  await setSourceStatus(sourceId, "healed", {
    last_heal_at: new Date().toISOString(),
  });
}
```

---

## Integration with Cron Endpoint

Workers can **call** the cron endpoint instead of writing directly:

```typescript
// Option: Call cron endpoint
const cronSecret = process.env.CRON_SECRET;
const response = await fetch("https://your-app.vercel.app/api/cron/refresh-hubs", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
  },
});

const result = await response.json();
console.log("Cron result:", result);
```

**Note:** This is less efficient than writing directly to Supabase, but useful if you want centralized logic.

---

## Complete Worker Example

See `scripts/scrape-hub.ts` in the repo for a complete example that:
- ✅ Checks business hours
- ✅ Loads proxy config
- ✅ Launches with stealth
- ✅ Runs human-flow
- ✅ Checks bot score
- ✅ Saves to Supabase

---

## Quick Start (Option A - Recommended)

1. **Set environment variables** in `.env`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   ZYTE_PROXY=your_proxy  # Optional
   ```

2. **Run scraper**:
   ```bash
   npx tsx scripts/scrape-hub.ts Riyadh bayt
   ```

3. **Schedule with cron** (optional):
   ```bash
   crontab -e
   # Add: 0 10 * * 1-5 cd /path/to/project && npx tsx scripts/scrape-hub.ts Riyadh bayt
   ```

---

## Troubleshooting

### "Outside business hours"
- Check hub timezone in `regional_profiles` table
- Verify system time matches hub timezone

### "Proxy connection failed"
- Check `ZYTE_PROXY` or hub-specific proxy env vars
- Verify proxy credentials

### "Selector not found"
- Check `scraper_selectors` table for source
- Trigger healing: update status to "healing", run LLM heal, update selector

### "Supabase connection failed"
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check network access from worker

---

*Last updated: 2026-02-10*
