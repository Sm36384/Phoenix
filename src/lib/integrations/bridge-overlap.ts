/**
 * Bridge Logic: find_mutual_overlap(manager_id)
 * Cross-references the hiring manager's past companies with my_history (static or DB).
 * If match found: flag "Warm Lead" and compute Relationship Strength Score (RSS).
 */

import { computeRSS } from "@/lib/bridge-algorithm";
import type { MyHistory, MutualOverlapResult } from "@/types/integrations";
import historyData from "@/data/my_history.json";

const defaultHistory = historyData as MyHistory;

/** Normalize company name for matching (lowercase, trim, collapse spaces) */
function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Find mutual overlap between the current user and a hiring manager.
 * Uses myHistoryOverride when provided (e.g. from user_professional_history); else static my_history.json.
 */
export function find_mutual_overlap(
  manager_id: string,
  managerPastCompanies: { company: string; company_normalized?: string }[],
  options?: {
    managerTenureYears?: number;
    yearsSinceOverlap?: number;
    sameBusinessUnit?: boolean;
    directReportingLine?: boolean;
    /** When set (e.g. from DB), use this instead of static my_history.json. */
    myHistoryOverride?: MyHistory;
  }
): MutualOverlapResult {
  const myHistory = options?.myHistoryOverride ?? defaultHistory;
  const myCompanies = new Map(
    myHistory.positions.map((p) => [normalizeCompany(p.company_normalized ?? p.company), p])
  );

  let matchedCompany: string | null = null;
  let tenureYears = 0;
  let yearsSinceLastOverlap = 99;
  let sameBusinessUnit = false;
  let directReportingLine = false;

  for (const mp of managerPastCompanies) {
    const key = normalizeCompany(mp.company_normalized ?? mp.company);
    const myPos = myCompanies.get(key);
    if (!myPos) continue;

    matchedCompany = myPos.company;
    tenureYears = myPos.overlap_years ?? 0;
    if (myPos.end_date) {
      const end = new Date(myPos.end_date);
      yearsSinceLastOverlap = (Date.now() - end.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    }
    sameBusinessUnit = options?.sameBusinessUnit ?? false;
    directReportingLine = options?.directReportingLine ?? false;
    break;
  }

  const isWarmLead = matchedCompany !== null;
  const score = computeRSS({
    tenureYears,
    yearsSinceLastOverlap: Math.max(0, yearsSinceLastOverlap),
    sameBusinessUnit,
    directReportingLine,
  });

  return {
    isWarmLead,
    matchedCompany,
    tenureYears,
    yearsSinceLastOverlap: Math.max(0, yearsSinceLastOverlap),
    sameBusinessUnit,
    directReportingLine,
    rssScore: score.rss,
    managerId: manager_id,
    managerPastCompanies: managerPastCompanies.map((c) => c.company),
  };
}

/**
 * Filter a list of mutual connections (from PhantomBuster / LinkedIn graph scraper)
 * against my_history and rank by tenure overlap (RSS).
 */
export function filterAndRankMutualConnections(
  mutualConnections: Array<{
    id: string;
    name: string;
    past_companies: { company: string; company_normalized?: string }[];
    same_bu?: boolean;
    direct_report?: boolean;
  }>,
  myHistoryOverride?: MyHistory
): MutualOverlapResult[] {
  const results: MutualOverlapResult[] = mutualConnections.map((mc) => {
    const r = find_mutual_overlap(mc.id, mc.past_companies, {
      sameBusinessUnit: mc.same_bu,
      directReportingLine: mc.direct_report,
      myHistoryOverride,
    });
    return r;
  });

  return results
    .filter((r) => r.isWarmLead)
    .sort((a, b) => b.rssScore - a.rssScore);
}
