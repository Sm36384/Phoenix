/**
 * Transformation Pulse Global — shared types for Signals and Stakeholders
 */

export type Region = "SEA" | "Middle East" | "India" | "East Asia";

export type StakeholderType = "recruiter" | "hiring_manager" | "bridge";

export type RecruiterOrigin = "internal" | "external";

export interface Signal {
  id: string;
  created_at?: string;
  updated_at?: string;
  region: Region;
  hub: string;
  company: string;
  headline: string;
  source_portal?: string;
  source_url?: string;
  complexity_match_pct: number;
  signal_keywords?: string[];
  raw_description?: string;
  parsed_summary?: string;
}

export interface Stakeholder {
  id: string;
  signal_id: string;
  type: StakeholderType;
  name: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  email?: string;
  origin?: RecruiterOrigin;
  firm_name?: string;
  rss_score?: number;
  tenure_years?: number;
  recency_years?: number;
  context_bonus?: number;
  rank_order?: number;
}

/** Bridge (mutual connection) with computed RSS for ranking */
export interface Bridge extends Stakeholder {
  type: "bridge";
  rss_score: number;
  tenure_years: number;
  recency_years: number;
  context_bonus: number;
  rank_order: number;
}

/** Signal with hydrated stakeholders for UI */
export interface SignalWithStakeholders extends Signal {
  stakeholders: Stakeholder[];
  recruiter?: Stakeholder;
  hiring_manager?: Stakeholder;
  bridges?: Bridge[];
}
