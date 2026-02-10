import { NextRequest, NextResponse } from "next/server";
import {
  shouldTriggerPartnerBridgeLogic,
} from "@/lib/hidden-market/parse-executive-jd";
import { parseExecutiveJDWithConfidence } from "@/lib/hidden-market/parse-executive-jd-with-confidence";
import { logLowConfidenceParse } from "@/lib/hidden-market/log-low-confidence-parse";
import {
  resolveExecutivePartnerAndBridgeTarget,
  runBridgeForExecutivePartner,
} from "@/lib/hidden-market/executive-bridge-trigger";
import { createClient } from "@/lib/supabase/server";
import { getUserHistory } from "@/lib/history/get-user-history";

export const maxDuration = 60;

/**
 * POST: body { imageBase64: string, jdTextPreview?: string, sourceId?: string }
 * Returns extracted entities with confidence scores and, if executive/$500k+, the resolved Bridge target + RSS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { imageBase64?: string; jdTextPreview?: string; sourceId?: string };
    const imageBase64 = body.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { error: "imageBase64 required" },
        { status: 400 }
      );
    }

    // Use confidence-based parsing with fallback
    const entitiesWithConfidence = await parseExecutiveJDWithConfidence(
      imageBase64,
      body.jdTextPreview,
      { confidenceThreshold: 0.6 }
    );

    // Log low-confidence parses for manual review
    if (entitiesWithConfidence.confidence < 0.5) {
      await logLowConfidenceParse(entitiesWithConfidence, {
        jdTextPreview: body.jdTextPreview,
        sourceId: body.sourceId,
      });
    }

    const entities = {
      partnerName: entitiesWithConfidence.partnerName,
      partnerTitle: entitiesWithConfidence.partnerTitle,
      company: entitiesWithConfidence.company,
      roleTitle: entitiesWithConfidence.roleTitle,
      salaryRange: entitiesWithConfidence.salaryRange,
      salaryMinUsd: entitiesWithConfidence.salaryMinUsd,
      isExecutive: entitiesWithConfidence.isExecutive,
      contactNote: entitiesWithConfidence.contactNote,
    };

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
      confidence: entitiesWithConfidence.confidence,
      fieldConfidences: entitiesWithConfidence.fieldConfidences,
      parseMethod: entitiesWithConfidence.parseMethod,
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
