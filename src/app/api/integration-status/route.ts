import { NextResponse } from "next/server";

/**
 * GET /api/integration-status — which integrations are configured (for UI or debugging).
 * Does not expose secret values; only whether env vars are set.
 */
export async function GET() {
  return NextResponse.json({
    supabase:
      !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    apify: !!process.env.APIFY_TOKEN,
    apollo: !!process.env.APOLLO_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    cronSecret: !!process.env.CRON_SECRET,
  });
}
