/**
 * LLM-Heal: Given failed selector + page HTML (and optional screenshot), ask the LLM
 * to return a new CSS selector for the field. Supports text-based (HTML) and vision-based (screenshot).
 */

import type { HealRequest, HealResult } from "./types";

const FIELD_PROMPT =
  "The previous selector failed to extract this field. Based on the provided page content, find the new path for [Field Name]. Return only a single valid CSS selector, no explanation.";

function buildTextPrompt(fieldName: string, html: string, selectorBefore?: string | null): string {
  const truncated = html.slice(0, 80_000);
  return `The previous CSS selector for the field "${fieldName}" failed.
Previous selector: ${selectorBefore ?? "none"}

Below is the page HTML. Find the element that contains the value for "${fieldName}" (e.g. job title, company name, apply button). Return ONLY a valid CSS selector, nothing else.

HTML:
\`\`\`
${truncated}
\`\`\`

CSS selector:`;
}

function buildVisionPrompt(fieldName: string, selectorBefore?: string | null): string {
  return `Look at this screenshot of a web page. The previous CSS selector for "${fieldName}" failed: ${selectorBefore ?? "none"}. Find the new location of the "${fieldName}" element (e.g. job title, company name, button). Return ONLY one valid CSS selector, no other text.`;
}

/**
 * Text-based healing: send HTML to LLM, get new selector.
 * Use OpenAI or Gemini with text completion.
 */
export async function llmHealFromHtml(
  request: HealRequest,
  options?: { model?: string; openaiApiKey?: string }
): Promise<HealResult> {
  const apiKey = options?.openaiApiKey ?? process.env.OPENAI_API_KEY;
  const model = options?.model ?? "gpt-4o-mini";

  if (!apiKey) {
    return { success: false, raw_error: "OPENAI_API_KEY not set" };
  }

  const prompt = buildTextPrompt(
    request.field_name,
    request.page_html ?? "",
    request.selector_before
  );

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, raw_error: `OpenAI API: ${res.status} ${err}` };
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { success: false, raw_error: "Empty LLM response" };

    const selector = extractSelectorFromResponse(content);
    if (!selector) return { success: false, raw_error: "No valid selector in response: " + content };

    return { success: true, selector_after: selector, trace_id: crypto.randomUUID() };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { success: false, raw_error: err };
  }
}

/**
 * Vision-based healing: send screenshot to GPT-4o (or Gemini) and get new selector.
 * Gold standard for heavy JS / Middle East bank portals.
 */
export async function llmHealFromScreenshot(
  request: HealRequest,
  options?: { openaiApiKey?: string }
): Promise<HealResult> {
  const apiKey = options?.openaiApiKey ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { success: false, raw_error: "OPENAI_API_KEY not set" };
  }

  if (!request.screenshot_base64) {
    return { success: false, raw_error: "screenshot_base64 required for vision heal" };
  }

  const prompt = buildVisionPrompt(request.field_name, request.selector_before);

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
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${request.screenshot_base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, raw_error: `OpenAI Vision API: ${res.status} ${err}` };
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { success: false, raw_error: "Empty LLM response" };

    const selector = extractSelectorFromResponse(content);
    if (!selector) return { success: false, raw_error: "No valid selector in response: " + content };

    return { success: true, selector_after: selector, trace_id: crypto.randomUUID() };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { success: false, raw_error: err };
  }
}

/** Extract a single CSS selector from LLM response (strip code blocks, take first line). */
function extractSelectorFromResponse(content: string): string | null {
  let s = content.trim();
  s = s.replace(/^```\w*\n?/i, "").replace(/\n?```$/i, "").trim();
  const firstLine = s.split("\n")[0]?.trim();
  if (!firstLine || firstLine.length > 500) return null;
  if (/^[.#\w\[\]="'\s\-_:>+~]+$/.test(firstLine)) return firstLine;
  return firstLine;
}
