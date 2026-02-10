/**
 * E2E scraper for one hub: Playwright + stealth (or custom evasions) + human-flow + fail-safe + optional Camoufox + Fingerprint rotate.
 * Run: npx tsx scripts/scrape-hub.ts [hubId] [sourceId]
 * Example: npx tsx scripts/scrape-hub.ts Riyadh bayt
 *
 * Requires: npm install playwright tsx (and playwright-extra, puppeteer-extra-plugin-stealth for full stealth)
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional ZYTE_PROXY, ENCRYPTION_KEY,
 *      USE_CAMOUFOX, CAMOUFOX_EXECUTABLE_PATH, FINGERPRINT_API_KEY, FINGERPRINT_LAST_REQUEST_ID, PROXY_*_ALT
 */

import { chromium, type LaunchOptions } from "playwright";
import { getProxyForHub, useCamoufoxForHub } from "../src/lib/scraper/proxy-config";
import { applyCamoufoxToLaunchOptions } from "../src/lib/scraper/camoufox-launch";
import { launchWithStealth } from "../src/lib/scraper/launch-with-stealth";
import { bootstrapStealthPage } from "../src/lib/scraper/launch-browser";
import { humanFlowProtocol } from "../src/lib/stealth-governor/human-flow";
import { assertNotBlocked } from "../src/lib/stealth-governor/fail-safe";
import { assertBusinessHours } from "../src/lib/stealth-governor/business-hours";
import { waitJitter } from "../src/lib/stealth-governor/jitter";
import { checkBotScore, shouldRotateProxyAfterCheck, getRotationConfig } from "../src/lib/fingerprint/bot-score";
import { createClient } from "@supabase/supabase-js";

const hubId = process.argv[2] ?? "Riyadh";
const sourceId = process.argv[3] ?? "bayt";
const homeUrl = process.env.SCRAPE_HOME_URL ?? "https://www.bayt.com/en/saudi-arabia/";
const jobUrl = process.env.SCRAPE_JOB_URL ?? homeUrl;

async function main() {
  assertBusinessHours(hubId as "Riyadh");

  let proxy = getProxyForHub(hubId);
  const useCamoufox = useCamoufoxForHub(hubId);
  let launchOptions: LaunchOptions = {
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
    proxy: proxy ?? undefined,
  };
  launchOptions = applyCamoufoxToLaunchOptions(launchOptions, useCamoufox);

  const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  let browser: Awaited<ReturnType<typeof chromium.launch>>;
  let context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>;

  const stealthResult = await launchWithStealth(
    launchOptions,
    { userAgent }
  );

  if (stealthResult) {
    browser = stealthResult.browser as unknown as Awaited<ReturnType<typeof chromium.launch>>;
    context = stealthResult.context as unknown as Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>;
    console.log("Launched with playwright-extra + stealth plugin");
  } else {
    browser = await chromium.launch(launchOptions as Parameters<typeof chromium.launch>[0]);
    context = await browser.newContext({ userAgent });
    const page = await context.newPage();
    await bootstrapStealthPage(
      page as unknown as Parameters<typeof bootstrapStealthPage>[0],
      { hubId, sourceId }
    );
    await humanFlowProtocol(
      page as unknown as Parameters<typeof humanFlowProtocol>[0],
      homeUrl,
      jobUrl
    );
    await assertNotBlocked(
      page as unknown as Parameters<typeof assertNotBlocked>[0],
      hubId
    );
    await waitJitter();
    const title = await page.title();
    await saveSignal(hubId, sourceId, title, jobUrl);
    await browser.close();
    console.log("Scrape done (fallback):", hubId, sourceId);
    return;
  }

  const page = await context.newPage();
  await bootstrapStealthPage(
    page as unknown as Parameters<typeof bootstrapStealthPage>[0],
    { hubId, sourceId }
  );

  const requestId = process.env.FINGERPRINT_LAST_REQUEST_ID;
  if (requestId && process.env.FINGERPRINT_API_KEY) {
    const botResult = await checkBotScore({ requestId });
    if (shouldRotateProxyAfterCheck(botResult)) {
      await browser.close();
      const rotation = getRotationConfig(hubId);
      proxy = rotation.proxy;
      launchOptions = { ...launchOptions, proxy };
      const retry = await launchWithStealth(
        launchOptions as { headless?: boolean; proxy?: { server: string; username?: string; password?: string }; args?: string[]; executablePath?: string },
        { userAgent: rotation.userAgent }
      );
      if (retry) {
        browser = retry.browser as unknown as Awaited<ReturnType<typeof chromium.launch>>;
        context = retry.context as unknown as Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>;
        const newPage = await context.newPage();
        await bootstrapStealthPage(
          newPage as unknown as Parameters<typeof bootstrapStealthPage>[0],
          { hubId, sourceId }
        );
        await humanFlowProtocol(
          newPage as unknown as Parameters<typeof humanFlowProtocol>[0],
          homeUrl,
          jobUrl
        );
        await assertNotBlocked(
          newPage as unknown as Parameters<typeof assertNotBlocked>[0],
          hubId
        );
        await waitJitter();
        const title = await newPage.title();
        await saveSignal(hubId, sourceId, title, jobUrl);
        await browser.close();
        console.log("Scrape done (after rotate):", hubId, sourceId);
        return;
      }
    }
  }

  await humanFlowProtocol(
    page as unknown as Parameters<typeof humanFlowProtocol>[0],
    homeUrl,
    jobUrl
  );
  await assertNotBlocked(
    page as unknown as Parameters<typeof assertNotBlocked>[0],
    hubId
  );
  await waitJitter();

  const title = await page.title();
  await saveSignal(hubId, sourceId, title, jobUrl);

  await browser.close();
  console.log("Scrape done:", hubId, sourceId);
}

async function saveSignal(hub: string, portal: string, headline: string, url: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return;
  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase.from("signals").insert({
    region: "Middle East",
    hub,
    company: "Scrape Test",
    headline: headline || `Scrape ${hub} ${new Date().toISOString()}`,
    source_portal: portal,
    source_url: url,
    complexity_match_pct: 0,
  });
  console.log("Inserted test signal for", hub);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
