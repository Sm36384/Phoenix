/**
 * The Bridge Algorithm: Relationship Strength Score (RSS)
 * RSS = (Tenure × 1.5) + (Recency × 2.0) + (Context × 1.0)
 *
 * - Tenure: Years of overlap at the same company
 * - Recency: 100 / (Years since last overlap + 1)
 * - Context: +20 if same Business Unit; +15 if direct reporting line
 */

export interface BridgeInput {
  tenureYears: number;
  yearsSinceLastOverlap: number;
  sameBusinessUnit?: boolean;
  directReportingLine?: boolean;
}

export interface BridgeScore {
  rss: number;
  tenureComponent: number;
  recencyComponent: number;
  contextComponent: number;
}

const TENURE_WEIGHT = 1.5;
const RECENCY_WEIGHT = 2.0;
const CONTEXT_WEIGHT = 1.0;
const SAME_BU_BONUS = 20;
const DIRECT_REPORT_BONUS = 15;

/**
 * Compute Relationship Strength Score for a mutual connection (Bridge).
 */
export function computeRSS(input: BridgeInput): BridgeScore {
  const tenureComponent = input.tenureYears * TENURE_WEIGHT;
  const recencyRaw = 100 / (input.yearsSinceLastOverlap + 1);
  const recencyComponent = recencyRaw * RECENCY_WEIGHT;

  let contextComponent = 0;
  if (input.sameBusinessUnit) contextComponent += SAME_BU_BONUS;
  if (input.directReportingLine) contextComponent += DIRECT_REPORT_BONUS;
  contextComponent *= CONTEXT_WEIGHT;

  const rss =
    tenureComponent + recencyComponent + contextComponent;

  return {
    rss: Math.round(rss * 100) / 100,
    tenureComponent: Math.round(tenureComponent * 100) / 100,
    recencyComponent: Math.round(recencyComponent * 100) / 100,
    contextComponent: Math.round(contextComponent * 100) / 100,
  };
}

/**
 * Rank an array of bridge candidates by RSS (descending) and assign rank_order.
 */
export function rankBridgesByRSS<T extends BridgeInput & { id?: string; name: string }>(
  candidates: T[],
  scoreFn: (c: T) => BridgeScore = (c) => computeRSS(c)
): (T & { rss_score: number; rank_order: number })[] {
  const withScores = candidates.map((c) => ({
    ...c,
    bridgeScore: scoreFn(c),
  }));
  withScores.sort((a, b) => b.bridgeScore.rss - a.bridgeScore.rss);
  return withScores.map(({ bridgeScore, ...c }, i) => ({
    ...c,
    rss_score: bridgeScore.rss,
    rank_order: i + 1,
  })) as unknown as (T & { rss_score: number; rank_order: number })[];
}

/**
 * Return top N bridges by RSS.
 */
export function topBridges<T extends BridgeInput & { id?: string; name: string }>(
  candidates: T[],
  n: number = 3,
  scoreFn?: (c: T) => BridgeScore
): (T & { rss_score: number; rank_order: number })[] {
  return rankBridgesByRSS(candidates, scoreFn).slice(0, n);
}
