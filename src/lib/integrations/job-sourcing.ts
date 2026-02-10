/**
 * Job Board Integration (Signal Sourcing)
 * Primary: Apify LinkedIn Jobs Scraper (or TheirStack). Poll every 4h; technographic filter; normalize to Signal Schema.
 */

import type { Signal, Region } from "@/types";
import type { RawJobObject } from "@/types/integrations";

const TECHNOGraphic_KEYWORDS = [
  "core banking",
  "microservices",
  "api-led",
  "api-led connectivity",
  "legacy migration",
  "legacy modernization",
  "core banking transformation",
  "digital core",
  "cloud native",
  "decoupling",
  "agile scale",
  "platform re-engineering",
  "gcc setup",
  "vision 2030",
];

const LOCATION_TO_REGION_HUB: Record<string, { region: Region; hub: string }> = {
  singapore: { region: "SEA", hub: "Singapore" },
  vietnam: { region: "SEA", hub: "Vietnam" },
  "hong kong": { region: "East Asia", hub: "Hong Kong" },
  riyadh: { region: "Middle East", hub: "Riyadh" },
  dubai: { region: "Middle East", hub: "Dubai" },
  abu dhabi: { region: "Middle East", hub: "Abu Dhabi" },
  uae: { region: "Middle East", hub: "Dubai" },
  saudi: { region: "Middle East", hub: "Riyadh" },
  mumbai: { region: "India", hub: "Mumbai" },
  bangalore: { region: "India", hub: "Bangalore" },
  india: { region: "India", hub: "Mumbai" },
};

/** Technographic filter: only ingest roles mentioning Core Banking, Microservices, or API-led connectivity. */
export function passesTechnographicFilter(raw: RawJobObject): boolean {
  const text = [
    raw.title,
    raw.description,
    raw.company,
    (raw as { location?: string }).location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return TECHNOGraphic_KEYWORDS.some((k) => text.includes(k));
}

/** High-complexity trigger: tag as high match if multiple transformation keywords. */
function complexityMatchPct(raw: RawJobObject): number {
  const text = [raw.title, raw.description].filter(Boolean).join(" ").toLowerCase();
  let score = 0;
  const terms = [
    "legacy",
    "migration",
    "cloud-native",
    "digital core",
    "transformation",
    "microservices",
    "platform",
    "scale",
  ];
  for (const t of terms) {
    if (text.includes(t)) score += 12;
  }
  return Math.min(100, Math.max(0, score));
}

/** Extract detected signal keywords from title + description. */
function extractSignalKeywords(raw: RawJobObject): string[] {
  const text = [raw.title, raw.description].filter(Boolean).join(" ").toLowerCase();
  const found = TECHNOGraphic_KEYWORDS.filter((k) => text.includes(k));
  return [...new Set(found)];
}

function inferRegionAndHub(raw: RawJobObject): { region: Region; hub: string } {
  const loc = ((raw as { location?: string }).location ?? raw.title ?? "")
    .toLowerCase();
  for (const [key, value] of Object.entries(LOCATION_TO_REGION_HUB)) {
    if (loc.includes(key)) return value;
  }
  return { region: "Middle East", hub: "Riyadh" };
}

/**
 * Map Raw Job Object (Apify/aggregator) to Generic Signal Schema.
 */
export function normalizeRawJobToSignal(
  raw: RawJobObject,
  options?: { sourcePortal?: string; signalId?: string }
): Signal {
  const { region, hub } = inferRegionAndHub(raw);
  const headline = raw.title ?? "Unknown Role";
  const company = raw.company ?? "Unknown Company";

  return {
    id: options?.signalId ?? `sig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    region,
    hub,
    company,
    headline,
    source_portal: options?.sourcePortal ?? "LinkedIn (Apify)",
    source_url: raw.url ?? undefined,
    complexity_match_pct: complexityMatchPct(raw),
    signal_keywords: extractSignalKeywords(raw),
    raw_description: raw.description ?? undefined,
  };
}

/**
 * Apify LinkedIn Jobs Scraper: input payload.
 * Run every 4 hours for SG, UAE, KSA, HK, VN.
 */
export const APIFY_LINKEDIN_JOBS_INPUT = {
  searchKeywords: [
    "Core Banking Transformation",
    "Legacy Modernization",
    "Digital Transformation",
    "CIO",
    "CTO",
  ],
  locations: ["Singapore", "Riyadh", "Dubai", "Mumbai", "Vietnam", "Hong Kong"],
  maxItems: 100,
} as const;

/**
 * Fetch jobs from Apify Actor (LinkedIn Jobs Scraper).
 * Requires APIFY_TOKEN. Returns raw job objects; then filter + normalize.
 */
export async function fetchApifyLinkedInJobs(
  input: Record<string, unknown> = APIFY_LINKEDIN_JOBS_INPUT as unknown as Record<string, unknown>
): Promise<RawJobObject[]> {
  const token = process.env.APIFY_TOKEN;
  const actorId = process.env.APIFY_LINKEDIN_JOBS_ACTOR ?? "bebity/linkedin-jobs-scraper";

  if (!token) {
    console.warn("APIFY_TOKEN not set; returning empty job list");
    return [];
  }

  const run = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input }),
    }
  ).then((r) => r.json());

  if (!run?.data?.id) {
    throw new Error("Apify run failed: " + JSON.stringify(run));
  }

  const runId = run.data.id;
  let status = run.data.status;
  let waited = 0;
  const maxWait = 120_000;

  while (status !== "SUCCEEDED" && status !== "FAILED" && waited < maxWait) {
    await new Promise((r) => setTimeout(r, 3000));
    waited += 3000;
    const runStatus = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    ).then((r) => r.json());
    status = runStatus.data?.status ?? "UNKNOWN";
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run ${runId} ended with status: ${status}`);
  }

  const datasetId = run.data.defaultDatasetId;
  const items = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`
  ).then((r) => r.json());

  return Array.isArray(items) ? items : [];
}

/**
 * Full pipeline: fetch → technographic filter → normalize to Signal[].
 */
export async function runJobSourcingPipeline(
  sourcePortal: string = "LinkedIn (Apify)"
): Promise<Signal[]> {
  const rawJobs = await fetchApifyLinkedInJobs();
  const filtered = rawJobs.filter(passesTechnographicFilter);
  return filtered.map((raw, i) =>
    normalizeRawJobToSignal(raw, {
      sourcePortal,
      signalId: `sig-apify-${Date.now()}-${i}`,
    })
  );
}
