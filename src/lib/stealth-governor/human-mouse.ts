/**
 * HUMAN-LIKE MOUSE MOVEMENT (BÉZIER)
 * Bypass behavioral biometrics on LinkedIn / bank portals.
 * Use with Playwright: replace straight page.mouse.move(x,y) with humanMove.
 *
 * Integration: Hover with humanMove → hesitate → click with down/up gap.
 * Requires Playwright in scraper runtime; this file is type-only here.
 */

export interface HumanMovePage {
  evaluate<T>(fn: () => T): Promise<T>;
  mouse: { move(x: number, y: number): Promise<void> };
}

const STEPS = 60;

/**
 * Cubic Bézier: B(t) = (1-t)³P0 + 3(1-t)²t P1 + 3(1-t)t² P2 + t³ P3
 */
function bezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/**
 * Variable velocity delay: slower at start/end (acceleration/deceleration).
 */
function stepDelay(stepIndex: number, totalSteps: number): number {
  if (stepIndex < 10 || stepIndex > totalSteps - 10) {
    return Math.random() * 15 + 10;
  }
  return Math.random() * 5;
}

/**
 * Move mouse along a randomized cubic Bézier curve from current position to target.
 * Use for hover before click; then hesitate then click with down/up gap.
 */
export async function humanMove(
  page: HumanMovePage,
  targetX: number,
  targetY: number,
  options?: { startX?: number; startY?: number }
): Promise<void> {
  const start = options?.startX != null && options?.startY != null
    ? { x: options.startX, y: options.startY }
    : await page.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));

  const dx = targetX - start.x;
  const dy = targetY - start.y;

  const cp1 = {
    x: start.x + dx * Math.random(),
    y: start.y + dy * Math.random() - 100,
  };
  const cp2 = {
    x: start.x + dx * Math.random(),
    y: start.y + dy * Math.random() + 100,
  };

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const { x, y } = bezierPoint(t, start, cp1, cp2, { x: targetX, y: targetY });
    await page.mouse.move(x, y);
    const delay = stepDelay(i, STEPS);
    await new Promise((r) => setTimeout(r, delay));
  }
}

/**
 * Target randomization: pick a random point inside the element's box (padding).
 * Prevents "always center" detection.
 */
export function randomPointInBox(
  box: { x: number; y: number; width: number; height: number },
  paddingPx: number = 8
): { x: number; y: number } {
  const inner = {
    x: box.x + paddingPx,
    y: box.y + paddingPx,
    width: Math.max(0, box.width - 2 * paddingPx),
    height: Math.max(0, box.height - 2 * paddingPx),
  };
  return {
    x: inner.x + Math.random() * inner.width,
    y: inner.y + Math.random() * inner.height,
  };
}
