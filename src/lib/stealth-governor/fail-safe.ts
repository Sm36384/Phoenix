/**
 * Fail-Safe: If CAPTCHA or "Access Denied" is detected, immediately halt
 * all scraping for that hub and alert Arize Phoenix for manual review.
 */

import { phoenixTraceFailure } from "@/lib/observability/phoenix-trace";

const BLOCK_INDICATORS = [
  "captcha",
  "recaptcha",
  "hcaptcha",
  "access denied",
  "blocked",
  "suspicious activity",
  "unusual traffic",
  "verify you are human",
  "please complete the security check",
  "403 forbidden",
  "rate limit",
];

export interface PageWithContent {
  content: () => Promise<string>;
  url: () => string;
}

/**
 * Check page HTML/content for block indicators. Run after navigation.
 */
export async function detectBlockPage(page: PageWithContent): Promise<{
  blocked: boolean;
  reason: string | null;
}> {
  const html = (await page.content()).toLowerCase();
  for (const phrase of BLOCK_INDICATORS) {
    if (html.includes(phrase)) {
      return { blocked: true, reason: phrase };
    }
  }
  return { blocked: false, reason: null };
}

/**
 * Halt and alert: log to Phoenix and throw so scraper stops.
 */
export function haltAndAlert(hubId: string, reason: string, details?: Record<string, unknown>): never {
  phoenixTraceFailure(hubId, "fail_safe_halt", {
    reason,
    ...details,
  } as Record<string, string | number | boolean>);
  throw new Error(
    `[FAIL-SAFE] Halt all scraping for hub ${hubId}. Reason: ${reason}. Alert logged to Arize Phoenix for manual review.`
  );
}

/**
 * If block detected, call haltAndAlert. Use after each major navigation.
 */
export async function assertNotBlocked(
  page: PageWithContent,
  hubId: string
): Promise<void> {
  const { blocked, reason } = await detectBlockPage(page);
  if (blocked && reason) {
    haltAndAlert(hubId, reason, { url: page.url() });
  }
}
