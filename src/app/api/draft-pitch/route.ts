import { NextRequest, NextResponse } from "next/server";
import {
  getPersonaForStakeholder,
  PERSONA_SYSTEM_PROMPTS,
  type PersonaRole,
} from "@/lib/ghost-write/personas";
import type { StakeholderType } from "@/types";
import { anonymizedHistoryToPromptSummary } from "@/lib/privacy/anonymize-history";
import { createClient } from "@/lib/supabase/server";
import historyData from "@/data/my_history.json";
import type { MyHistory } from "@/types/integrations";

export const maxDuration = 30;

async function getHistoryForDraft(): Promise<MyHistory> {
  const supabase = createClient();
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

    const persona: PersonaRole = getPersonaForStakeholder(stakeholderType, origin);
    const systemPrompt = PERSONA_SYSTEM_PROMPTS[persona];
    const history = await getHistoryForDraft();
    const historySummary = anonymizedHistoryToPromptSummary(history);

    const userPrompt = `Draft a message with the following context. Use the persona and focus for this audience. Return only the draft text, no labels.

Role: ${headline}
Company: ${company}${hub ? ` (${hub}${region ? `, ${region}` : ""})` : ""}
${bridgeName ? `Bridge/Contact name: ${bridgeName}` : ""}
${recruiterFirm ? `Recruiter firm: ${recruiterFirm}` : ""}

${historySummary}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { draft: "[Draft disabled: OPENAI_API_KEY not set.]", persona },
        { status: 200 }
      );
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `OpenAI: ${res.status} ${err}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const draft = data.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ draft, persona });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
