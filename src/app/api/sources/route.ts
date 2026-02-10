import { NextResponse } from "next/server";
import type { ScrapeSource } from "@/types/integrations";

/**
 * GET /api/sources — returns scrape_sources for dashboard status (Green/Orange/Blue).
 * If Supabase is not configured, returns mock sources.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/scrape_sources?select=*&order=id`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as ScrapeSource[];
        return NextResponse.json(data);
      }
    } catch {
      // fall through to mock
    }
  }

  const mockSources: ScrapeSource[] = [
    { id: "linkedin-apify", display_name: "LinkedIn (Apify)", region: "Global", status: "ok", updated_at: new Date().toISOString() },
    { id: "bayt", display_name: "Bayt", region: "Middle East", status: "ok", updated_at: new Date().toISOString() },
    { id: "gulftalent", display_name: "GulfTalent", region: "Middle East", status: "healed", last_heal_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "mycareersfuture", display_name: "MyCareersFuture", region: "SEA", status: "healing", updated_at: new Date().toISOString() },
  ];

  return NextResponse.json(mockSources);
}
