/**
 * Core job sourcing pipeline: refresh hubs with signals and stakeholders.
 * This is the domain logic extracted from the cron route handler.
 * 
 * Flow:
 * 1. Pull job postings from Apify per hub
 * 2. Filter for "transformation-grade" roles
 * 3. Resolve Hiring Managers via Apollo
 * 4. Batch insert signals + stakeholders with service_role
 * 5. Emit OTLP traces
 */

import { config } from "@/lib/config";
import { createClient } from "@supabase/supabase-js";
import type { Signal, Stakeholder } from "@/types";
import { findHiringManagerForCompany } from "../people-discovery";
import { phoenixFlush } from "@/lib/observability/phoenix-trace";

export interface RefreshHubsOptions {
  hubs?: string[]; // If not provided, uses all configured hubs
  apifyActor?: string;
  apolloLimit?: number;
}

export interface RefreshHubsResult {
  hubsProcessed: string[];
  signalsCreated: number;
  stakeholdersCreated: number;
  errors: Array<{ hub: string; error: string }>;
}

/**
 * Filter function: only keep "transformation-grade" roles.
 * Keywords: Core Banking, Microservices, API-led connectivity, Legacy Migration, etc.
 */
function isTransformationRole(headline: string, description?: string): boolean {
  const text = `${headline} ${description ?? ""}`.toLowerCase();
  const keywords = [
    "core banking",
    "microservices",
    "api-led",
    "legacy migration",
    "digital transformation",
    "platform re-engineering",
    "decoupling",
    "agile scale",
    "vision 2030",
    "digital core",
    "cloud native",
    "gcc setup",
  ];
  return keywords.some((kw) => text.includes(kw));
}

/**
 * Pull jobs from Apify actor for a hub.
 */
async function fetchJobsFromApify(
  hub: string,
  actor: string
): Promise<Array<{ title: string; company: string; location: string; description?: string; url?: string }>> {
  const token = config.apify.token;
  if (!token) {
    throw new Error("APIFY_TOKEN not configured");
  }

  // Placeholder: actual Apify API call
  // This should call the Apify actor with hub-specific parameters
    const res = await fetch(`https://api.apify.com/v2/acts/${actor}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        startUrls: [],
        // Add hub-specific search params
      }),
    });

    if (!res.ok) {
      throw new Error(`Apify API error: ${res.status}`);
    }

    // Fetch dataset results
    // Placeholder: return mock for now
    // TODO: Implement actual Apify actor run and dataset fetch
    return [];
}

/**
 * Main refresh pipeline.
 */
export async function refreshHubs(options: RefreshHubsOptions = {}): Promise<RefreshHubsResult> {
  const hubs = options.hubs ?? ["Singapore", "Riyadh", "Dubai", "Mumbai", "Hong Kong"];
  const actor = options.apifyActor ?? config.apify.linkedinJobsActor ?? "bebity/linkedin-jobs-scraper";
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.serviceRoleKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase not configured (service role key required)");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const result: RefreshHubsResult = {
    hubsProcessed: [],
    signalsCreated: 0,
    stakeholdersCreated: 0,
    errors: [],
  };

  for (const hub of hubs) {
    try {
      // Step 1: Fetch jobs from Apify
      const jobs = await fetchJobsFromApify(hub, actor);

      // Step 2: Filter for transformation roles
      const filteredJobs = jobs.filter((job) => isTransformationRole(job.title, job.description));

      // Step 3: Build signals + stakeholders in memory
      const signalsToInsert: Array<Omit<Signal, "id" | "created_at" | "updated_at">> = [];
      const stakeholdersToInsert: Array<Omit<Stakeholder, "id" | "created_at">> = [];

      for (const job of filteredJobs) {
        // Determine region from hub
        const region = hub === "Singapore" || hub === "Hong Kong" ? "SEA" : hub === "Riyadh" || hub === "Dubai" ? "Middle East" : "India";

        signalsToInsert.push({
          region: region as Signal["region"],
          hub,
          company: job.company,
          headline: job.title,
          source_portal: "LinkedIn (Apify)",
          source_url: job.url,
          complexity_match_pct: 0, // TODO: Calculate match %
          signal_keywords: [], // TODO: Extract keywords
          raw_description: job.description,
        });

        // Step 4: Resolve Hiring Manager
        try {
          const hm = await findHiringManagerForCompany(job.company);
          if (hm) {
            // Will link to signal_id after insert
            stakeholdersToInsert.push({
              signal_id: "", // Placeholder, will update after signal insert
              type: "hiring_manager",
              name: hm.name ?? "Unknown",
              title: hm.title,
              company: hm.organization?.name,
              linkedin_url: hm.linkedin_url,
              email: hm.email,
            });
          }
        } catch {
          // Ignore HM lookup failures
        }
      }

      // Step 5: Batch insert signals
      if (signalsToInsert.length > 0) {
        const { data: insertedSignals, error: signalsError } = await supabase
          .from("signals")
          .insert(signalsToInsert as Record<string, unknown>[])
          .select("id");

        if (signalsError) {
          result.errors.push({ hub, error: `Failed to insert signals: ${signalsError.message}` });
          continue;
        }

        result.signalsCreated += insertedSignals?.length ?? 0;

        // Step 6: Link stakeholders to signals and batch insert
        if (insertedSignals && stakeholdersToInsert.length > 0) {
          const linkedStakeholders = stakeholdersToInsert.map((stakeholder, idx) => {
            const signalId = insertedSignals[idx % insertedSignals.length]?.id;
            return signalId ? { ...stakeholder, signal_id: signalId } : null;
          }).filter((s): s is NonNullable<typeof s> => s !== null);

          if (linkedStakeholders.length > 0) {
            const { error: stakeholdersError } = await supabase
              .from("stakeholders")
              .insert(linkedStakeholders as Record<string, unknown>[]);

            if (!stakeholdersError) {
              result.stakeholdersCreated += linkedStakeholders.length;
            }
          }
        }
      }

      result.hubsProcessed.push(hub);
    } catch (error) {
      result.errors.push({
        hub,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Emit OTLP trace
  await phoenixFlush();

  return result;
}
