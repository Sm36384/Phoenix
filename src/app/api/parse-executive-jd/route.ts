/**
 * Thin adapter route handler for executive JD parsing.
 * Delegates to lib/ai/parseExecutiveJD and lib/hidden-market modules.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseExecutiveJD } from "@/lib/ai";
import { shouldTriggerPartnerBridgeLogic } from "@/lib/hidden-market/parse-executive-jd";
import {
  resolveExecutivePartnerAndBridgeTarget,
  runBridgeForExecutivePartner,
} from "@/lib/hidden-market/executive-bridge-trigger";
import { createClient } from "@/lib/supabase/server";
import { getUserHistory } from "@/lib/history/get-user-history";
import { validateParseJDBody } from "@/lib/validation/schemas";
import { withSpan } from "@/lib/observability/otlp-wrapper";

export const maxDuration = 60;

/**
 * POST: body { imageBase64?: string, jdTextPreview?: string, sourceId?: string }
 * Returns extracted entities and, if executive/$500k+, the resolved Bridge target + RSS.
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate request body
    const body = await request.json();
    const validation = validateParseJDBody(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.errors },
        { status: 400 }
      );
    }

    const { imageBase64, jdTextPreview, sourceId } = validation.data!;

    // Step 2: Parse JD using AI wrapper (with tracing)
    const entities = await withSpan(
      {
        name: "parse_executive_jd",
        attributes: {
          hasImage: !!imageBase64,
          hasText: !!jdTextPreview,
          sourceId: sourceId ?? "unknown",
        },
      },
      async () => {
        return parseExecutiveJD({
          imageBase64,
          jdTextPreview,
          useVision: !!imageBase64,
        });
      }
    );

    // Step 3: Check if Bridge logic should trigger
    const triggerBridge = shouldTriggerPartnerBridgeLogic(entities);

    let bridgeTarget = null;
    let bridgeOverlap = null;

    if (triggerBridge) {
      bridgeTarget = await resolveExecutivePartnerAndBridgeTarget(entities);
      if (bridgeTarget?.bridgeTargetPastCompanies?.length) {
        const supabase = await createClient();
        const user = supabase ? (await supabase.auth.getUser()).data.user : null;
        const myHistory = user ? await getUserHistory(user.id) : undefined;
        bridgeOverlap = runBridgeForExecutivePartner(bridgeTarget, { myHistoryOverride: myHistory ?? undefined });
      }
    }

    return NextResponse.json({
      entities,
      triggerBridge,
      bridgeTarget: bridgeTarget
        ? {
            partnerName: bridgeTarget.partnerName,
            company: bridgeTarget.company,
            linkedinUrl: bridgeTarget.linkedinUrl,
            email: bridgeTarget.email,
          }
        : null,
      bridgeOverlap: bridgeOverlap ?? null,
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
