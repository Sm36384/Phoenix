/**
 * Scraper bootstrap: launch browser with stealth evasions and optional cookie injection.
 * Use Playwright-Stealth in runtime (npm install playwright playwright-extra puppeteer-extra-plugin-stealth).
 * This module provides the logic; actual Playwright is optional dependency for scraper scripts.
 *
 * Evasions applied (when run in Node with Playwright):
 * - Override navigator.webdriver
 * - Override plugins/languages
 * - Optional: inject saved session cookies for paywall bypass
 */

import { injectSavedSessionIntoPage } from "@/lib/stealth-governor/session-persistence";

export interface StealthBrowserOptions {
  hubId: string;
  sourceId: string;
  injectSavedCookies?: boolean;
  userAgent?: string;
}

/**
 * Script to run inside page.evaluate() to override webdriver and reduce automation signals.
 * Apply after page load.
 */
export const STEALTH_EVAL_SCRIPT = `
(function() {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  if (window.chrome) {
    window.chrome.runtime = {};
  }
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: Notification.permission }) :
      originalQuery(parameters)
  );
})();
`;

/**
 * Apply stealth evasions to a page (run in Node with Playwright).
 * Usage: const page = await context.newPage(); await applyStealthEvasions(page);
 */
export interface PageWithEvaluate {
  evaluate: (fn: string | ((() => void)) ) => Promise<unknown>;
  context: () => { addCookies: (cookies: unknown[]) => Promise<void> };
}

export async function applyStealthEvasions(page: PageWithEvaluate): Promise<void> {
  await page.evaluate(STEALTH_EVAL_SCRIPT);
}

/**
 * Full bootstrap: apply stealth and optionally inject saved session.
 * Call after creating page, before navigating.
 */
export async function bootstrapStealthPage(
  page: PageWithEvaluate,
  options: StealthBrowserOptions
): Promise<void> {
  await applyStealthEvasions(page);

  if (options.injectSavedCookies !== false) {
    await injectSavedSessionIntoPage(
      page as unknown as Parameters<typeof injectSavedSessionIntoPage>[0],
      options.hubId,
      options.sourceId
    );
  }
}
