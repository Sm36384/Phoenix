import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/seed — insert test signals + stakeholders into Supabase (dev only).
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 * Idempotent: skips if signals already exist (count > 0).
 */
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }

  const supabase = createClient(url, key);

  const { count, error: countErr } = await supabase
    .from("signals")
    .select("*", { count: "exact", head: true });
  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }
  if (count && count > 0) {
    const sourcesUpserted = await upsertScrapeSources(supabase);
    return NextResponse.json({
      ok: true,
      message: "Signals already exist; skip seed. Source status rows upserted.",
      count,
      sourcesUpserted,
    });
  }

  const signalsToInsert = [
    {
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
      region: "Middle East",
      hub: "Dubai",
      company: "Emirates NBD",
      headline: "Director — Legacy Migration & Agile Scale",
      source_portal: "GulfTalent",
      complexity_match_pct: 82,
      signal_keywords: ["Legacy Migration", "Agile Scale"],
    },
    {
      region: "SEA",
      hub: "Singapore",
      company: "DBS",
      headline: "Head of Platform Re-engineering",
      source_portal: "MyCareersFuture",
      complexity_match_pct: 91,
      signal_keywords: ["Decoupling", "Platform Re-engineering"],
    },
  ];

  const { data: insertedSignals, error: insertSigErr } = await supabase
    .from("signals")
    .insert(signalsToInsert)
    .select("id");
  if (insertSigErr) {
    return NextResponse.json({ error: insertSigErr.message }, { status: 500 });
  }
  const firstSignalId = insertedSignals?.[0]?.id;
  if (!firstSignalId) {
    return NextResponse.json({ ok: true, message: "Signals inserted; no stakeholders." });
  }

  const stakeholdersToInsert = [
    { signal_id: firstSignalId, type: "recruiter", name: "Sarah Al-Rashid", title: "Senior Talent Partner", company: "Korn Ferry", origin: "external", firm_name: "Korn Ferry" },
    { signal_id: firstSignalId, type: "hiring_manager", name: "Omar Al-Harbi", title: "CIO", company: "Saudi National Bank" },
    { signal_id: firstSignalId, type: "bridge", name: "James Chen", title: "Managing Director, Technology", company: "Citi", rss_score: 72.5, tenure_years: 4, recency_years: 0.5, context_bonus: 20, rank_order: 1 },
    { signal_id: firstSignalId, type: "bridge", name: "Priya Sharma", title: "Director, Digital", company: "Citi", rss_score: 58, tenure_years: 2, recency_years: 1, context_bonus: 15, rank_order: 2 },
    { signal_id: firstSignalId, type: "bridge", name: "David Okonkwo", title: "VP, Platform Engineering", company: "Saudi National Bank", rss_score: 45.2, tenure_years: 1.5, recency_years: 2, context_bonus: 0, rank_order: 3 },
  ];

  const { error: insertStakeErr } = await supabase.from("stakeholders").insert(stakeholdersToInsert);
  if (insertStakeErr) {
    return NextResponse.json({ error: insertStakeErr.message, signalsInserted: insertedSignals?.length }, { status: 500 });
  }

  const sourcesUpserted = await upsertScrapeSources(supabase);

  return NextResponse.json({
    ok: true,
    message: "Seed complete. Sign in to see signals on the dashboard.",
    signalsInserted: insertedSignals?.length ?? 0,
    stakeholdersInserted: stakeholdersToInsert.length,
    sourcesUpserted,
  });
}

/** Idempotent upsert of default scrape_sources for dashboard status bar (Green/Orange/Blue). */
async function upsertScrapeSources(supabase: ReturnType<typeof createClient>): Promise<number> {
  const defaults = [
    { id: "linkedin-apify", display_name: "LinkedIn (Apify)", region: "Global", status: "ok" },
    { id: "bayt", display_name: "Bayt", region: "Middle East", status: "ok" },
    { id: "gulftalent", display_name: "GulfTalent", region: "Middle East", status: "healed" },
    { id: "mycareersfuture", display_name: "MyCareersFuture", region: "SEA", status: "healing" },
    { id: "naukri", display_name: "Naukri", region: "India", status: "ok" },
    { id: "jobsdb", display_name: "JobsDB", region: "East Asia", status: "ok" },
  ];
  let n = 0;
  for (const row of defaults) {
    const { error } = await supabase.from("scrape_sources").upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (!error) n++;
  }
  return n;
}
