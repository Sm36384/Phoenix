/**
 * Thin adapter route handler for cron job.
 * Delegates all logic to lib/integrations/job-sourcing/refresh-hubs.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getHubsInBusinessHours } from "@/lib/stealth-governor/business-hours";
import { refreshHubs } from "@/lib/integrations/job-sourcing/refresh-hubs";
import { config } from "@/lib/config";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/refresh-hubs
 * Called daily at 08:00 SGT (0:00 UTC). Runs job sourcing for hubs currently in business hours.
 * Secured by CRON_SECRET or Vercel Cron header.
 */
export async function GET(request: NextRequest) {
  // Step 1: Validate authorization
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const cronSecret = config.cron.secret;
  const isAuthorized =
    isVercelCron ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 2: Get hubs in business hours
  const hubs = getHubsInBusinessHours();
  if (hubs.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No hubs in business hours; skip refresh",
      hubs: [],
    });
  }

  // Step 3: Delegate to domain logic
  try {
    const result = await refreshHubs({ hubs });
    return NextResponse.json({
      ok: true,
      hubsInWindow: hubs,
      signalsCreated: result.signalsCreated,
      stakeholdersCreated: result.stakeholdersCreated,
      hubsProcessed: result.hubsProcessed,
      errors: result.errors,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: err },
      { status: 500 }
    );
  }
}
