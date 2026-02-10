/**
 * Human-Mimicry Governor: Jitter & Rhythm
 * Actions use randomized delay (Gaussian) so scrapers don't look robotic.
 * LinkedIn 2026 detection flags perfect intervals (e.g. every 2.0s).
 */

const JITTER_MS_MIN = 1200;
const JITTER_MS_MAX = 4500;

/**
 * Box-Muller transform: returns a sample from standard normal distribution.
 */
function gaussian(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Random delay using Gaussian (bell curve) so most waits cluster around the mean.
 * Clamped to [minMs, maxMs]. Mimics human hesitation.
 */
export function jitterDelay(options?: { minMs?: number; maxMs?: number; meanMs?: number }): number {
  const minMs = options?.minMs ?? JITTER_MS_MIN;
  const maxMs = options?.maxMs ?? JITTER_MS_MAX;
  const meanMs = options?.meanMs ?? (minMs + maxMs) / 2;
  const stdDev = (maxMs - minMs) / 4;

  let ms = meanMs + gaussian() * stdDev;
  ms = Math.max(minMs, Math.min(maxMs, Math.round(ms)));
  return ms;
}

/**
 * Async: wait for a jittered duration. Use before/after clicks, scrolls, navigates.
 */
export function waitJitter(options?: { minMs?: number; maxMs?: number }): Promise<void> {
  const ms = jitterDelay(options);
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Human-flow protocol: delay to mimic "reading" before acting.
 * Use after landing on a page or before clicking (hover/hesitate).
 */
export function hesitateDelay(): number {
  return Math.round(Math.random() * 800 + 200);
}

/**
 * Wait for hesitate (200–1000ms). Use before click after hover.
 */
export function waitHesitate(): Promise<void> {
  return new Promise((r) => setTimeout(r, hesitateDelay()));
}

/**
 * Click down/up gap to mimic human press (80–150ms).
 */
export function clickGapMs(): number {
  return Math.round(Math.random() * 70 + 80);
}
