import { NextRequest, NextResponse } from "next/server";
import {
  parseExecutiveJDFromImage,
  shouldTriggerPartnerBridgeLogic,
} from "@/lib/hidden-market/parse-executive-jd";
import {
  resolveExecutivePartnerAndBridgeTarget,
  runBridgeForExecutivePartner,
} from "@/lib/hidden-market/executive-bridge-trigger";
import { createClient } from "@/lib/supabase/server";
import { getUserHistory } from "@/lib/history/get-user-history";

export const maxDuration = 60;

/**
 * POST: body { imageBase64: string }
 * Returns extracted entities and, if executive/$500k+, the resolved Bridge target + RSS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { imageBase64?: string };
    const imageBase64 = body.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { error: "imageBase64 required" },
        { status: 400 }
      );
    }

    const entities = await parseExecutiveJDFromImage(imageBase64);
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
