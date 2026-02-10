/**
 * Centralized AI/LLM wrapper with prompt contracts.
 * All LLM calls go through this module for consistency and observability.
 */

import { config } from "../config";

export interface DraftPitchOptions {
  persona: "peer" | "partner" | "bridge";
  roleSummary: string; // JD headline + company + key requirements
  anonymizedHistory: string; // Textual summary from anonymizeHistoryToPromptSummary
  stakeholderName?: string;
  stakeholderTitle?: string;
}

export interface ParseExecutiveJDOptions {
  jdText?: string;
  jdTextPreview?: string; // Alias for jdText
  imageBase64?: string;
  useVision?: boolean; // If true, use GPT-4o-vision for image
}

export interface ParsedJD {
  partnerName: string | null;
  partnerTitle: string | null;
  company: string | null;
  roleTitle: string | null;
  salaryRange: string | null;
  salaryMinUsd: number | null;
  isExecutive: boolean;
  contactNote: string | null;
}

const DEFAULT_TEMPERATURE_PITCH = 0.5; // Balanced creativity for pitch writing
const DEFAULT_TEMPERATURE_PARSE = 0.2; // Low temperature for deterministic parsing

/**
 * Draft a pitch using persona-based prompting.
 * Temperature: 0.5 for balanced creativity.
 */
export async function draftPitch(options: DraftPitchOptions): Promise<string> {
  const apiKey = config.openai.apiKey;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const personaPrompts: Record<DraftPitchOptions["persona"], string> = {
    peer: `You are drafting a message to a Hiring Manager (CTO/CIO). Tone: Strategic, problem-focused, Citi-veteran. Focus on "Pain Relief": mention specific legacy core migration bottlenecks you solved at Citi. Do not be salesy; be a peer who has done the same transformation. Keep it to 3-4 short paragraphs.`,
    partner: `You are drafting a message to an External Recruiter / Headhunter. Tone: Concise, high-value. Focus on "Placement Ease": emphasize $2B scale experience and immediate availability for the Middle East / Asia market. Make it easy for them to place you. 2-3 short paragraphs.`,
    bridge: `You are drafting a message to a mutual connection (The Bridge) to ask for an intro. Tone: Low-friction, "catch-up" style. Focus on "Nostalgia & Value": e.g. "Hey [Name], saw you're at [Company] now—I'm looking at their digital decoupling role. Remember that mess we fixed back in 2019? Would love a warm intro if you're open to it." Keep it casual, one short paragraph.`,
  };

  const systemPrompt = personaPrompts[options.persona];
  const userPrompt = `Role: ${options.roleSummary}\n\nMy background (anonymized): ${options.anonymizedHistory}\n\n${options.stakeholderName ? `Recipient: ${options.stakeholderName}${options.stakeholderTitle ? `, ${options.stakeholderTitle}` : ""}` : ""}\n\nDraft the pitch message:`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: DEFAULT_TEMPERATURE_PITCH,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${err}`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? "Failed to generate pitch.";
  } catch (error) {
    throw new Error(`Failed to draft pitch: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse executive JD from text or image.
 * Uses deterministic JSON schema for consistent output.
 * Temperature: 0.2 for deterministic parsing.
 */
export async function parseExecutiveJD(options: ParseExecutiveJDOptions): Promise<ParsedJD> {
  const apiKey = config.openai.apiKey;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const prompt = `You are parsing an executive job description (often from a headhunter site like Korn Ferry or Aquis). Extract:
1. Partner/Contact name (the person to contact, e.g. "Contact Sarah Chen" -> Sarah Chen)
2. Partner title if visible
3. Company name
4. Role/Job title
5. Salary range if mentioned (e.g. "$500k-$700k", "£200k")
6. Any explicit "Contact [Name]" or similar note

Return valid JSON matching the schema. Use null for missing fields. If salary is in GBP or other currency, estimate salaryMinUsd (number) for USD. Set isExecutive to true if role is C-level, MD, or comp suggests $500k+.`;

  const messages: Array<{ role: string; content: unknown }> = [{ role: "user", content: prompt }];

  if (options.imageBase64 && options.useVision) {
    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${options.imageBase64}` },
        },
      ],
    });
  } else if (options.jdText || options.jdTextPreview) {
    const jdText = options.jdText ?? options.jdTextPreview ?? "";
    messages[0].content = `${prompt}\n\nJD Text:\n${jdText}`;
  } else {
    throw new Error("Either jdText/jdTextPreview or imageBase64 required");
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.useVision ? "gpt-4o" : "gpt-4o",
        messages,
        temperature: DEFAULT_TEMPERATURE_PARSE,
        // Note: response_format requires model support; using prompt instruction for JSON instead
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${err}`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty OpenAI response");

    const parsed = JSON.parse(content) as Record<string, unknown>;

    // Normalize salary
    const salaryRange = (parsed.salaryRange as string) ?? null;
    let salaryMinUsd = (parsed.salaryMinUsd as number) ?? null;
    if (salaryRange && salaryMinUsd == null) {
      const match = salaryRange.match(/\$?(\d+(?:\.\d+)?)\s*k/i);
      if (match) salaryMinUsd = parseFloat(match[1]) * 1000;
    }

    return {
      partnerName: (parsed.partnerName as string) ?? null,
      partnerTitle: (parsed.partnerTitle as string) ?? null,
      company: (parsed.company as string) ?? null,
      roleTitle: (parsed.roleTitle as string) ?? null,
      salaryRange,
      salaryMinUsd,
      isExecutive: ((parsed.isExecutive as boolean) ?? false) || (salaryMinUsd != null && salaryMinUsd >= 500_000),
      contactNote: (parsed.contactNote as string) ?? null,
    };
  } catch (error) {
    throw new Error(`Failed to parse JD: ${error instanceof Error ? error.message : String(error)}`);
  }
}
