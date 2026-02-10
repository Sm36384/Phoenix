/**
 * Hidden Market Discovery: OCR & Entity Parsing for executive JDs.
 * Boutique headhunter sites (Aquis, Korn Ferry) often have "Contact [Partner Name]"
 * or PDF/image JDs. Use GPT-4o-Vision to extract Partner name and context.
 */

export interface ExecutiveJDEntities {
  partnerName: string | null;
  partnerTitle: string | null;
  company: string | null;
  roleTitle: string | null;
  salaryRange: string | null;
  salaryMinUsd: number | null;
  isExecutive: boolean;
  contactNote: string | null;
}

const EXECUTIVE_SALARY_THRESHOLD_USD = 500_000;

/**
 * Call GPT-4o-Vision to extract structured entities from an image of a JD (e.g. screenshot or PDF page).
 * Use for boutique headhunter pages where "Apply Now" is replaced by "Contact [Partner Name]".
 */
export async function parseExecutiveJDFromImage(
  imageBase64: string,
  options?: { openaiApiKey?: string }
): Promise<ExecutiveJDEntities> {
  const apiKey = options?.openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      partnerName: null,
      partnerTitle: null,
      company: null,
      roleTitle: null,
      salaryRange: null,
      salaryMinUsd: null,
      isExecutive: false,
      contactNote: null,
    };
  }

  const prompt = `You are parsing an executive job description (often from a headhunter site like Korn Ferry or Aquis). Extract:
1. Partner/Contact name (the person to contact, e.g. "Contact Sarah Chen" -> Sarah Chen)
2. Partner title if visible
3. Company name
4. Role/Job title
5. Salary range if mentioned (e.g. "$500k-$700k", "£200k")
6. Any explicit "Contact [Name]" or similar note

Return valid JSON only, with keys: partnerName, partnerTitle, company, roleTitle, salaryRange, contactNote. Use null for missing. If salary is in GBP or other currency, also estimate salaryMinUsd (number) for USD. Set isExecutive to true if role is C-level, MD, or comp suggests $500k+.`;

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
          { role: "user", content: prompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI Vision: ${res.status} ${err}`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty OpenAI response");

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const salaryRange = (parsed.salaryRange as string) ?? null;
    let salaryMinUsd = (parsed.salaryMinUsd as number) ?? null;
    const isExecutive =
      (parsed.isExecutive as boolean) ??
      (salaryMinUsd != null && salaryMinUsd >= EXECUTIVE_SALARY_THRESHOLD_USD) ||
      /(\$|USD|£)\s*\d+\s*k|\d+\s*,\s*\d{3}\s*(\$|USD)/i.test(salaryRange ?? "");

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
      isExecutive: isExecutive || (salaryMinUsd != null && salaryMinUsd >= EXECUTIVE_SALARY_THRESHOLD_USD),
      contactNote: (parsed.contactNote as string) ?? null,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      partnerName: null,
      partnerTitle: null,
      company: null,
      roleTitle: null,
      salaryRange: null,
      salaryMinUsd: null,
      isExecutive: false,
      contactNote: null,
    };
  }
}

/**
 * Whether this parsed JD should trigger "find Partner on LinkedIn and run Bridge logic".
 */
export function shouldTriggerPartnerBridgeLogic(entities: ExecutiveJDEntities): boolean {
  return (
    entities.isExecutive ||
    (entities.salaryMinUsd != null && entities.salaryMinUsd >= EXECUTIVE_SALARY_THRESHOLD_USD) ||
    !!entities.partnerName
  );
}
