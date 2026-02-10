/**
 * Bridge Discovery: Resolve mutual connections (Bridges) for a target stakeholder.
 * Takes user history, target stakeholder(s), graph edges from Apollo/PhantomBuster,
 * and returns a ranked list annotated with RSS scores and "warm lead" flags.
 */

import { computeRSS, rankBridgesByRSS } from "../bridge-algorithm";
import type { MyHistory } from "@/types/integrations";

export interface BridgeCandidate {
  id: string;
  name: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  email?: string;
  pastCompanies: Array<{ company: string; company_normalized?: string; startYear?: number; endYear?: number }>;
}

export interface DiscoveredBridge {
  id: string;
  name: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  email?: string;
  rss_score: number;
  rank_order: number;
  tenure_years: number;
  recency_years: number;
  context_bonus: number;
  isWarmLead: boolean;
  overlapCompany?: string;
  overlapYears?: number;
}

/**
 * Find mutual overlap between user history and candidate's past companies.
 */
function findOverlap(
  userHistory: MyHistory,
  candidatePastCompanies: BridgeCandidate["pastCompanies"]
): {
  overlapCompany: string | null;
  overlapYears: number;
  yearsSinceLastOverlap: number;
  sameBusinessUnit: boolean;
  directReportingLine: boolean;
} {
  const userCompanies = new Set(
    userHistory.positions?.map((p) => p.company_normalized ?? p.company.toLowerCase().replace(/\s+/g, "_")) ?? []
  );

  let bestOverlap: {
    company: string;
    overlapYears: number;
    userEndYear?: number;
    candidateEndYear?: number;
  } | null = null;

  for (const candidateCompany of candidatePastCompanies) {
    const normalized = candidateCompany.company_normalized ?? candidateCompany.company.toLowerCase().replace(/\s+/g, "_");
    if (userCompanies.has(normalized)) {
      // Found overlap - calculate tenure
      const userPosition = userHistory.positions?.find(
        (p) => (p.company_normalized ?? p.company.toLowerCase().replace(/\s+/g, "_")) === normalized
      );
      if (userPosition) {
        const userStart = userPosition.start_date ? parseInt(userPosition.start_date.slice(0, 4), 10) : null;
        const userEnd = userPosition.end_date ? parseInt(userPosition.end_date.slice(0, 4), 10) : new Date().getFullYear();
        const candidateStart = candidateCompany.startYear;
        const candidateEnd = candidateCompany.endYear ?? new Date().getFullYear();

        if (userStart && candidateStart) {
          const overlapStart = Math.max(userStart, candidateStart);
          const overlapEnd = Math.min(userEnd, candidateEnd);
          const overlapYears = Math.max(0, overlapEnd - overlapStart);

          if (!bestOverlap || overlapYears > bestOverlap.overlapYears) {
            bestOverlap = {
              company: candidateCompany.company,
              overlapYears,
              userEndYear: userEnd,
              candidateEndYear: candidateEnd,
            };
          }
        }
      }
    }
  }

  if (!bestOverlap) {
    return {
      overlapCompany: null,
      overlapYears: 0,
      yearsSinceLastOverlap: 999,
      sameBusinessUnit: false,
      directReportingLine: false,
    };
  }

  const now = new Date().getFullYear();
  const yearsSinceLastOverlap = Math.max(0, now - Math.max(bestOverlap.userEndYear ?? now, bestOverlap.candidateEndYear ?? now));

  return {
    overlapCompany: bestOverlap.company,
    overlapYears: bestOverlap.overlapYears,
    yearsSinceLastOverlap,
    sameBusinessUnit: false, // TODO: Determine from titles/context
    directReportingLine: false, // TODO: Determine from org structure
  };
}

/**
 * Discover Bridges for a target stakeholder.
 * Returns ranked list with RSS scores and warm lead flags.
 */
export function discoverBridges(
  targetStakeholder: {
    id: string;
    name: string;
    pastCompanies: BridgeCandidate["pastCompanies"];
  },
  candidates: BridgeCandidate[],
  userHistory: MyHistory,
  options?: { maxBridges?: number }
): DiscoveredBridge[] {
  const maxBridges = options?.maxBridges ?? 3;

  // Step 1: Find overlap for each candidate
  const candidatesWithOverlap = candidates.map((candidate) => {
    const overlap = findOverlap(userHistory, candidate.pastCompanies);
    return {
      ...candidate,
      overlap,
    };
  });

  // Step 2: Filter to only candidates with overlap
  const candidatesWithOverlapOnly = candidatesWithOverlap.filter((c) => c.overlap.overlapYears > 0);

  // Step 3: Compute RSS for each and rank
  const candidatesForRanking = candidatesWithOverlapOnly.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    tenureYears: candidate.overlap.overlapYears,
    yearsSinceLastOverlap: candidate.overlap.yearsSinceLastOverlap,
    sameBusinessUnit: candidate.overlap.sameBusinessUnit,
    directReportingLine: candidate.overlap.directReportingLine,
  }));

  // Step 4: Rank by RSS (rankBridgesByRSS computes RSS internally)
  const ranked = rankBridgesByRSS(candidatesForRanking);

  // Step 5: Map to DiscoveredBridge format
  return ranked.slice(0, maxBridges).map((rankedBridge) => {
    const candidate = candidatesWithOverlapOnly.find((c) => c.id === rankedBridge.id);
    if (!candidate) throw new Error(`Candidate ${rankedBridge.id} not found`);

    return {
      id: candidate.id,
      name: candidate.name,
      title: candidate.title,
      company: candidate.company,
      linkedinUrl: candidate.linkedinUrl,
      email: candidate.email,
      rss_score: rankedBridge.rss_score,
      rank_order: rankedBridge.rank_order,
      tenure_years: candidate.overlap.overlapYears,
      recency_years: candidate.overlap.yearsSinceLastOverlap,
      context_bonus: candidate.overlap.sameBusinessUnit ? 20 : candidate.overlap.directReportingLine ? 15 : 0,
      isWarmLead: candidate.overlap.overlapYears >= 2 || candidate.overlap.yearsSinceLastOverlap < 2,
      overlapCompany: candidate.overlap.overlapCompany ?? undefined,
      overlapYears: candidate.overlap.overlapYears,
    };
  });
}
