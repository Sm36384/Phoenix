/**
 * If role is $500k+ or executive, find the Partner on LinkedIn (via Apollo) and
 * trigger Bridge logic for that person specifically.
 */

import type { ApolloPerson } from "@/lib/integrations/people-discovery";
import { findHiringManagerForCompany, apolloPeopleSearch } from "@/lib/integrations/people-discovery";
import { discoverPartnerWithFallback } from "@/lib/integrations/partner-discovery-with-fallback";
import { find_mutual_overlap } from "@/lib/integrations/bridge-overlap";
import type { ExecutiveJDEntities } from "./parse-executive-jd";
import { shouldTriggerPartnerBridgeLogic } from "./parse-executive-jd";

export interface ExecutiveBridgeTarget {
  partnerName: string;
  partnerTitle?: string;
  company: string;
  apolloPerson: ApolloPerson | null;
  linkedinUrl?: string;
  email?: string;
  /** Run Bridge (mutual overlap) for this person as the "manager". */
  bridgeTargetId: string;
  bridgeTargetPastCompanies: { company: string; company_normalized?: string }[];
}

/**
 * For an executive JD (or $500k+), resolve the Partner and return a Bridge target.
 * 1. If we have partner name + company, search Apollo for that person.
 * 2. Otherwise search for C-level at company.
 * 3. Return target so caller can run find_mutual_overlap(manager_id, pastCompanies).
 */
export async function resolveExecutivePartnerAndBridgeTarget(
  entities: ExecutiveJDEntities,
  options?: { apolloLimit?: number }
): Promise<ExecutiveBridgeTarget | null> {
  if (!shouldTriggerPartnerBridgeLogic(entities)) return null;

  const company = entities.company ?? "Unknown";
  const partnerName = entities.partnerName;

  let apolloPerson: ApolloPerson | null = null;

  if (partnerName && company) {
    const people = await apolloPeopleSearch(company, {
      limit: options?.apolloLimit ?? 20,
    });
    const match = people.find(
      (p) =>
        p.name?.toLowerCase().includes(partnerName.toLowerCase()) ||
        partnerName.toLowerCase().includes(p.name?.toLowerCase() ?? "")
    );
    apolloPerson = match ?? people[0] ?? null;
  }

  if (!apolloPerson) {
    apolloPerson = await findHiringManagerForCompany(company);
  }

  // When Apollo doesn't have the person, try fallback chain (PhantomBuster → Proxycurl → cache)
  let linkedinUrlFromFallback: string | undefined;
  if (partnerName && company && !apolloPerson?.linkedin_url) {
    const fallback = await discoverPartnerWithFallback(partnerName, company);
    linkedinUrlFromFallback = fallback.linkedinUrl;
  }

  if (!apolloPerson) {
    return {
      partnerName: partnerName ?? "Partner",
      partnerTitle: entities.partnerTitle ?? undefined,
      company,
      apolloPerson: null,
      linkedinUrl: linkedinUrlFromFallback,
      bridgeTargetId: linkedinUrlFromFallback
        ? `linkedin-${encodeURIComponent(linkedinUrlFromFallback)}`
        : `exec-${company}-${partnerName ?? "unknown"}`,
      bridgeTargetPastCompanies: [],
    };
  }

  const pastCompanies = (apolloPerson.organization?.name
    ? [{ company: apolloPerson.organization.name, company_normalized: apolloPerson.organization.name.toLowerCase().replace(/\s+/g, "_") }]
    : []) as { company: string; company_normalized?: string }[];

  return {
    partnerName: apolloPerson.name ?? partnerName ?? "Partner",
    partnerTitle: apolloPerson.title ?? entities.partnerTitle ?? undefined,
    company,
    apolloPerson,
    linkedinUrl: apolloPerson.linkedin_url ?? linkedinUrlFromFallback,
    email: apolloPerson.email,
    bridgeTargetId: apolloPerson.id,
    bridgeTargetPastCompanies: pastCompanies,
  };
}

/**
 * Run Bridge logic for the executive partner: overlap with my_history and RSS.
 * Pass myHistoryOverride when using DB-backed user history (e.g. logged-in user).
 */
export function runBridgeForExecutivePartner(
  target: ExecutiveBridgeTarget,
  options?: { myHistoryOverride?: import("@/types/integrations").MyHistory }
): ReturnType<typeof find_mutual_overlap> {
  return find_mutual_overlap(
    target.bridgeTargetId,
    target.bridgeTargetPastCompanies,
    { myHistoryOverride: options?.myHistoryOverride }
  );
}
