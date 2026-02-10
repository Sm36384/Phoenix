import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SignalWithStakeholders, Signal, Stakeholder } from "@/types";
import { getSignalsWithStakeholders } from "@/data/mock-signals";

/**
 * GET /api/signals — returns signals with stakeholders for the dashboard.
 * Supports pagination: ?page=1&limit=20
 * When Supabase is configured and user is authenticated: reads from DB (RLS).
 * When Supabase is not configured or user not logged in: returns mock data (or [] if Supabase configured but no user).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))); // Max 100, default 20
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  if (!supabase) {
    const mock = getSignalsWithStakeholders();
    // Paginate mock data
    const paginated = mock.slice(offset, offset + limit);
    return NextResponse.json({
      signals: paginated,
      pagination: {
        page,
        limit,
        total: mock.length,
        totalPages: Math.ceil(mock.length / limit),
      },
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({
      signals: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  // Get total count for pagination
  const { count, error: countError } = await supabase
    .from("signals")
    .select("*", { count: "exact", head: true });

  const { data: signalsRows, error: signalsError } = await supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (signalsError) {
    return NextResponse.json({ error: signalsError.message }, { status: 500 });
  }

  if (!signalsRows?.length) {
    return NextResponse.json([]);
  }

  const { data: stakeholdersRows, error: stakeholdersError } = await supabase
    .from("stakeholders")
    .select("*")
    .in(
      "signal_id",
      signalsRows.map((s) => s.id)
    );

  if (stakeholdersError) {
    return NextResponse.json({ error: stakeholdersError.message }, { status: 500 });
  }

  const stakeholdersBySignal = new Map<string, Stakeholder[]>();
  for (const row of stakeholdersRows ?? []) {
    const sid = row.signal_id as string;
    if (!stakeholdersBySignal.has(sid)) {
      stakeholdersBySignal.set(sid, []);
    }
    stakeholdersBySignal.get(sid)!.push(rowToStakeholder(row));
  }

  const result: SignalWithStakeholders[] = signalsRows.map((row) => {
    const signal = rowToSignal(row);
    const stakeholders = stakeholdersBySignal.get(row.id) ?? [];
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

  const total = count ?? 0;
  return NextResponse.json({
    signals: result,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

function rowToSignal(row: Record<string, unknown>): Signal {
  return {
    id: String(row.id),
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
    region: row.region as Signal["region"],
    hub: String(row.hub),
    company: String(row.company),
    headline: String(row.headline),
    source_portal: row.source_portal as string | undefined,
    source_url: row.source_url as string | undefined,
    complexity_match_pct: Number(row.complexity_match_pct ?? 0),
    signal_keywords: (row.signal_keywords as string[]) ?? undefined,
    raw_description: row.raw_description as string | undefined,
    parsed_summary: row.parsed_summary as string | undefined,
  };
}

function rowToStakeholder(row: Record<string, unknown>): Stakeholder {
  return {
    id: String(row.id),
    signal_id: String(row.signal_id),
    type: row.type as Stakeholder["type"],
    name: String(row.name),
    title: row.title as string | undefined,
    company: row.company as string | undefined,
    linkedin_url: row.linkedin_url as string | undefined,
    email: row.email as string | undefined,
    origin: row.origin as Stakeholder["origin"],
    firm_name: row.firm_name as string | undefined,
    rss_score: row.rss_score != null ? Number(row.rss_score) : undefined,
    tenure_years: row.tenure_years != null ? Number(row.tenure_years) : undefined,
    recency_years: row.recency_years != null ? Number(row.recency_years) : undefined,
    context_bonus: row.context_bonus != null ? Number(row.context_bonus) : undefined,
    rank_order: row.rank_order != null ? Number(row.rank_order) : undefined,
  };
}
