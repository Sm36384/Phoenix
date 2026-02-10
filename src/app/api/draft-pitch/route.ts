/**
 * Thin adapter route handler for draft pitch.
 * Delegates to lib/ai/draftPitch.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPersonaForStakeholder } from "@/lib/ghost-write/personas";
import type { StakeholderType } from "@/types";
import { anonymizedHistoryToPromptSummary } from "@/lib/privacy/anonymize-history";
import { createClient } from "@/lib/supabase/server";
import { draftPitch } from "@/lib/ai";
import historyData from "@/data/my_history.json";
import type { MyHistory } from "@/types/integrations";
import { withSpan } from "@/lib/observability/otlp-wrapper";

export const maxDuration = 30;

async function getHistoryForDraft(): Promise<MyHistory> {
  const supabase = await createClient();
  if (!supabase) return historyData as MyHistory;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return historyData as MyHistory;
  const { data } = await supabase
    .from("user_professional_history")
    .select("positions, person")
    .eq("user_id", user.id)
    .single();
  if (data?.positions?.length) {
    return { person: (data.person as MyHistory["person"]) ?? {}, positions: data.positions as MyHistory["positions"] };
  }
  return historyData as MyHistory;
}

interface DraftBody {
  stakeholderType: StakeholderType;
  origin?: string;
  headline: string;
  company: string;
  hub?: string;
  region?: string;
  bridgeName?: string;
  recruiterFirm?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate request body
    const body = (await request.json()) as DraftBody;
    const {
      stakeholderType,
      origin,
      headline,
      company,
      hub,
      region,
      bridgeName,
      recruiterFirm,
    } = body;

    if (!headline || !company) {
      return NextResponse.json(
        { error: "headline and company required" },
        { status: 400 }
      );
    }

    // Step 2: Get user history
    const history = await getHistoryForDraft();
    const historySummary = anonymizedHistoryToPromptSummary(history);

    // Step 3: Determine persona
    const persona = getPersonaForStakeholder(stakeholderType, origin);

    // Step 4: Build role summary
    const roleSummary = `${headline} at ${company}${hub ? ` (${hub}${region ? `, ${region}` : ""})` : ""}${bridgeName ? ` - Contact: ${bridgeName}` : ""}${recruiterFirm ? ` via ${recruiterFirm}` : ""}`;

    // Step 5: Delegate to AI module with tracing
    const draft = await withSpan(
      {
        name: "draft_pitch",
        attributes: {
          persona,
          stakeholderType,
          company,
        },
      },
      async () => {
        return draftPitch({
          persona,
          roleSummary,
          anonymizedHistory: historySummary,
          stakeholderName: bridgeName,
        });
      }
    );

    return NextResponse.json({ draft, persona });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
