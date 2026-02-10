/**
 * Types for Hybrid Data Strategy: Job Sourcing, People Discovery, Bridge, Self-Healing
 */

export type SourceStatus = "ok" | "healing" | "healed";

/** Raw job object from Apify LinkedIn Jobs Scraper (or similar aggregator) */
export interface RawJobObject {
  title?: string | null;
  company?: string | null;
  companyUrl?: string | null;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  postedAt?: string | null;
  [key: string]: unknown;
}

/** One scrape source for dashboard status */
export interface ScrapeSource {
  id: string;
  display_name: string;
  region?: string;
  status: SourceStatus;
  last_scraped_at?: string | null;
  last_heal_at?: string | null;
  updated_at?: string;
}

/** Selector row: AI-updatable when site structure changes */
export interface ScraperSelectorRow {
  id: string;
  source_id: string;
  field_name: string;
  selector_type: string;
  selector_value: string;
  selector_previous?: string | null;
  last_verified_at?: string | null;
}

/** Heal event for audit / Arize Phoenix */
export interface HealEventRow {
  id: string;
  created_at: string;
  source_id: string;
  field_name: string;
  trigger_reason?: string | null;
  selector_before?: string | null;
  selector_after?: string | null;
  success: boolean;
  trace_id?: string | null;
  raw_error?: string | null;
}

/** Professional history entry (my_history.json) */
export interface ProfessionalHistoryPosition {
  company: string;
  company_normalized: string;
  title?: string;
  business_unit?: string;
  start_date: string;
  end_date: string;
  overlap_years?: number;
}

export interface MyHistory {
  person?: { name?: string; linkedin_url?: string | null };
  positions: ProfessionalHistoryPosition[];
}

/** Result of find_mutual_overlap: warm lead + RSS inputs */
export interface MutualOverlapResult {
  isWarmLead: boolean;
  matchedCompany: string | null;
  tenureYears: number;
  yearsSinceLastOverlap: number;
  sameBusinessUnit: boolean;
  directReportingLine: boolean;
  rssScore: number;
  managerId: string;
  managerPastCompanies: string[];
}
