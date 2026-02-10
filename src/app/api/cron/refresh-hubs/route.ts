import { NextRequest, NextResponse } from "next/server";
import { getHubsInBusinessHours } from "@/lib/stealth-governor/business-hours";
import { runJobSourcingPipeline } from "@/lib/integrations/job-sourcing";
import { findHiringManagerForCompany } from "@/lib/integrations/people-discovery";
import { phoenixFlush } from "@/lib/observability/phoenix-trace";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET ?? process.env.VERCEL_CRON_SECRET;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * POST /api/cron/refresh-hubs
 * Called daily at 08:00 SGT (0:00 UTC). Runs job sourcing for hubs currently in business hours.
 * Secured by CRON_SECRET or Vercel Cron header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isAuthorized =
    isVercelCron ||
    (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hubs = getHubsInBusinessHours();
  if (hubs.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No hubs in business hours; skip refresh",
      hubs: [],
    });
  }

  const supabase = getSupabase();
  const results: { hub: string; signalsCreated: number; error?: string }[] = [];

  try {
    const signals = await runJobSourcingPipeline("LinkedIn (Apify)");
    let signalsCreated = 0;

    if (supabase && signals.length > 0) {
      for (const signal of signals) {
        const { data: inserted, error: insertErr } = await supabase
          .from("signals")
          .insert({
            region: signal.region,
            hub: signal.hub,
            company: signal.company,
            headline: signal.headline,
            source_portal: signal.source_portal,
            source_url: signal.source_url,
            complexity_match_pct: signal.complexity_match_pct,
            signal_keywords: signal.signal_keywords,
            raw_description: signal.raw_description,
          } as Record<string, unknown>)
          .select("id")
          .single();

        if (insertErr) continue;
        if (inserted?.id) {
          signalsCreated++;
          try {
            const hm = await findHiringManagerForCompany(signal.company);
            if (hm) {
              await supabase.from("stakeholders").insert({
                signal_id: inserted.id,
                type: "hiring_manager",
                name: hm.name,
                title: hm.title,
                company: hm.organization?.name,
                linkedin_url: hm.linkedin_url,
                email: hm.email,
              });
            }
          } catch {
            // ignore HM lookup failure
          }
        }
      }
    }

    results.push({ hub: "all", signalsCreated });
    await phoenixFlush();
    return NextResponse.json({
      ok: true,
      hubsInWindow: hubs,
      results,
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: err, results },
      { status: 500 }
    );
  }
}
