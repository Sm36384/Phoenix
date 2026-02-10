/**
 * Human-Flow Protocol: Before scraping a job URL, browse like a human.
 * 1. Land on home page
 * 2. Scroll down ~30% (variable speed)
 * 3. Hover over a random menu item ~1.2s
 * 4. Navigate to the specific job URL
 */

import { waitJitter, waitHesitate } from "./jitter";
import type { HumanMovePage } from "./human-mouse";

export interface HumanFlowPage {
  goto: (url: string) => Promise<unknown>;
  evaluate: {
    <T>(fn: () => T): Promise<T>;
    <T, Arg>(fn: (arg: Arg) => T, arg: Arg): Promise<T>;
  };
  mouse: { move(x: number, y: number): Promise<void> };
  content?: () => Promise<string>;
}

/**
 * Scroll the page by a fraction (0–1) with variable speed.
 */
async function scrollFraction(
  page: HumanFlowPage,
  fraction: number
): Promise<void> {
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const target = Math.round(scrollHeight * fraction);
  const steps = 8 + Math.floor(Math.random() * 6);
  for (let i = 1; i <= steps; i++) {
    const scrollY = Math.round((target * i) / steps);
    await page.evaluate((y: number) => window.scrollTo(0, y), scrollY);
    await waitJitter({ minMs: 80, maxMs: 400 });
  }
}

/**
 * Pick a random point within the viewport (e.g. for "hover over menu").
 */
async function randomViewportPoint(page: HumanFlowPage): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const w = window.innerWidth;
    return {
      x: Math.random() * w * 0.3 + w * 0.1,
      y: Math.random() * 80 + 20,
    };
  });
}

/**
 * Run human-flow protocol: home → scroll 30% → hover ~1.2s → goto job URL.
 */
export async function humanFlowProtocol(
  page: HumanFlowPage,
  homeUrl: string,
  jobUrl: string,
  options?: { useHumanMove?: (page: HumanMovePage, x: number, y: number) => Promise<void> }
): Promise<void> {
  await page.goto(homeUrl);
  await waitJitter();

  await scrollFraction(page, 0.3);
  await waitJitter({ minMs: 500, maxMs: 1500 });

  const { x, y } = await randomViewportPoint(page);
  if (options?.useHumanMove) {
    await options.useHumanMove(page as unknown as HumanMovePage, x, y);
  } else {
    await page.mouse.move(x, y);
  }
  await new Promise((r) => setTimeout(r, 1200));

  await waitHesitate();
  await page.goto(jobUrl);
  await waitJitter();
}
