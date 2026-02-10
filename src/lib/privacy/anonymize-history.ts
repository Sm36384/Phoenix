/**
 * Privacy Sandbox: Local-First my_history.
 * Never send raw contact list or PII to a public LLM.
 * Only anonymized metadata (company names, tenure ranges) for prompts or APIs.
 */

import type { MyHistory, ProfessionalHistoryPosition } from "@/types/integrations";

export interface AnonymizedHistory {
  companies: string[];
  company_normalized: string[];
  tenureRanges: string[];
  totalYearsExperience: number;
}

/**
 * Strip PII from professional history. Safe to send to external LLM or API.
 * Returns only company names and tenure ranges (e.g. "2016–2024"), no names or titles.
 */
export function anonymizeHistoryForLLM(history: MyHistory): AnonymizedHistory {
  const positions = history.positions ?? [];
  const companies: string[] = [];
  const company_normalized: string[] = [];
  const tenureRanges: string[] = [];
  let totalYears = 0;

  for (const p of positions) {
    companies.push(p.company);
    company_normalized.push(p.company_normalized ?? p.company.toLowerCase().replace(/\s+/g, "_"));
    const start = p.start_date ? p.start_date.slice(0, 4) : "?";
    const end = p.end_date ? p.end_date.slice(0, 4) : "?";
    tenureRanges.push(`${start}–${end}`);
    if (p.overlap_years != null) totalYears += p.overlap_years;
  }

  return {
    companies,
    company_normalized,
    tenureRanges,
    totalYearsExperience: totalYears,
  };
}

/**
 * Return a short text summary for use in prompts (no PII).
 */
export function anonymizedHistoryToPromptSummary(history: MyHistory): string {
  const a = anonymizeHistoryForLLM(history);
  const parts = a.companies.map((c, i) => `${c} (${a.tenureRanges[i]})`);
  return `Professional background (anonymized): ${parts.join("; ")}. Total experience: ${a.totalYearsExperience} years.`;
}
