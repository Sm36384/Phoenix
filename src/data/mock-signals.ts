/**
 * Mock scraper output: Riyadh-based bank role + sample signals for UI testing.
 * Simulates what the regional scraper would produce for Middle East / Riyadh.
 */

import type { Signal, Stakeholder, SignalWithStakeholders } from "@/types";
import { computeRSS } from "@/lib/bridge-algorithm";

const RIYADH_BANK_SIGNAL_ID = "sig-riyadh-bank-001";

export const mockSignals: Signal[] = [
  {
    id: RIYADH_BANK_SIGNAL_ID,
    region: "Middle East",
    hub: "Riyadh",
    company: "Saudi National Bank",
    headline: "VP Digital Transformation — Vision 2030 Digital Core",
    source_portal: "Bayt",
    source_url: "https://www.bayt.com/en/saudi-arabia/jobs/",
    complexity_match_pct: 87,
    signal_keywords: ["Vision 2030", "Digital Core", "Cloud Native"],
    parsed_summary:
      "Lead the bank's digital core modernization aligned with Vision 2030. Cloud-native platform re-engineering and legacy decoupling. $1.2B program.",
  },
  {
    id: "sig-dubai-001",
    region: "Middle East",
    hub: "Dubai",
    company: "Emirates NBD",
    headline: "Director — Legacy Migration & Agile Scale",
    source_portal: "GulfTalent",
    complexity_match_pct: 82,
    signal_keywords: ["Legacy Migration", "Agile Scale"],
  },
  {
    id: "sig-sg-001",
    region: "SEA",
    hub: "Singapore",
    company: "DBS",
    headline: "Head of Platform Re-engineering",
    source_portal: "MyCareersFuture",
    complexity_match_pct: 91,
    signal_keywords: ["Decoupling", "Platform Re-engineering"],
  },
];

/** Mock stakeholders for the Riyadh bank role (Power Triangle) */
export const mockStakeholders: Stakeholder[] = [
  {
    id: "sh-rec-001",
    signal_id: RIYADH_BANK_SIGNAL_ID,
    type: "recruiter",
    name: "Sarah Al-Rashid",
    title: "Senior Talent Partner",
    company: "Korn Ferry",
    origin: "external",
    firm_name: "Korn Ferry",
  },
  {
    id: "sh-hm-001",
    signal_id: RIYADH_BANK_SIGNAL_ID,
    type: "hiring_manager",
    name: "Omar Al-Harbi",
    title: "CIO",
    company: "Saudi National Bank",
  },
  {
    id: "sh-bridge-001",
    signal_id: RIYADH_BANK_SIGNAL_ID,
    type: "bridge",
    name: "James Chen",
    title: "Managing Director, Technology",
    company: "Citi",
    rss_score: 72.5,
    tenure_years: 4,
    recency_years: 0.5,
    context_bonus: 20,
    rank_order: 1,
  },
  {
    id: "sh-bridge-002",
    signal_id: RIYADH_BANK_SIGNAL_ID,
    type: "bridge",
    name: "Priya Sharma",
    title: "Director, Digital",
    company: "Citi",
    rss_score: 58.0,
    tenure_years: 2,
    recency_years: 1,
    context_bonus: 15,
    rank_order: 2,
  },
  {
    id: "sh-bridge-003",
    signal_id: RIYADH_BANK_SIGNAL_ID,
    type: "bridge",
    name: "David Okonkwo",
    title: "VP, Platform Engineering",
    company: "Saudi National Bank",
    rss_score: 45.2,
    tenure_years: 1.5,
    recency_years: 2,
    context_bonus: 0,
    rank_order: 3,
  },
];

/** War Room AI summary (mock — would come from Claude in Phase 2) */
export const mockWarRoomSummary =
  "Why this role is a match for your Citi $2B experience: Saudi National Bank's Vision 2030 Digital Core mandate aligns with your large-scale legacy migration and cloud-native platform work at Citi. The VP Digital Transformation scope (platform re-engineering, decoupling) maps directly to your 8+ years leading similar programs. Your GCC and MENA exposure is a strong cultural fit.";

/**
 * Hydrate signals with stakeholders for dashboard and War Room.
 */
export function getSignalsWithStakeholders(): SignalWithStakeholders[] {
  return mockSignals.map((signal) => {
    const stakeholders = mockStakeholders.filter((s) => s.signal_id === signal.id);
    const recruiter = stakeholders.find((s) => s.type === "recruiter");
    const hiring_manager = stakeholders.find((s) => s.type === "hiring_manager");
    const bridges = stakeholders
      .filter((s) => s.type === "bridge")
      .sort((a, b) => (a.rank_order ?? 0) - (b.rank_order ?? 0)) as SignalWithStakeholders["bridges"];
    return {
      ...signal,
      stakeholders,
      recruiter,
      hiring_manager,
      bridges: bridges?.length ? bridges : undefined,
    };
  });
}

/**
 * Mock scraper for Riyadh: returns one Riyadh-based bank signal + stakeholders.
 * In production this would call Playwright + stealth + proxies and parse JDs.
 */
export function mockRiyadhBankScraper(): {
  signal: Signal;
  stakeholders: Stakeholder[];
} {
  const signal = mockSignals[0];
  const stakeholders = mockStakeholders.filter((s) => s.signal_id === signal.id);
  return { signal, stakeholders };
}
