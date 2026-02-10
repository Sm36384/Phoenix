/**
 * Self-Healing Loop (Phoenix Rebirth)
 * Trigger → Capture (DOM + optional screenshot) → LLM Heal → Verify → Update Supabase Selectors.
 * Log heal events for Arize Phoenix / dashboard.
 */

import type { HealRequest, HealResult } from "./types";
import { llmHealFromHtml, llmHealFromScreenshot } from "./llm-heal";
import { phoenixTraceFailure, phoenixFlush } from "@/lib/observability/phoenix-trace";

export type { HealRequest, HealResult } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Update source status in scrape_sources (ok | healing | healed). */
export async function setSourceStatus(
  sourceId: string,
  status: "ok" | "healing" | "healed",
  extra?: { last_heal_at?: string }
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  await fetch(`${SUPABASE_URL}/rest/v1/scrape_sources?id=eq.${encodeURIComponent(sourceId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    }),
  });
}

/** Upsert selector in scraper_selectors. */
export async function updateSelector(
  sourceId: string,
  fieldName: string,
  selectorValue: string,
  selectorPrevious?: string | null
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  const payload = {
    source_id: sourceId,
    field_name: fieldName,
    selector_type: "css",
    selector_value: selectorValue,
    selector_previous: selectorPrevious ?? null,
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await fetch(`${SUPABASE_URL}/rest/v1/scraper_selectors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });
}

/** Insert heal_events row for audit / Phoenix. */
export async function logHealEvent(
  sourceId: string,
  fieldName: string,
  result: HealResult,
  request: HealRequest
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  await fetch(`${SUPABASE_URL}/rest/v1/heal_events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      source_id: sourceId,
      field_name: fieldName,
      trigger_reason: request.trigger_reason,
      selector_before: request.selector_before ?? null,
      selector_after: result.selector_after ?? null,
      success: result.success,
      trace_id: result.trace_id ?? null,
      raw_error: result.raw_error ?? null,
    }),
  });
}

/**
 * Run one heal cycle: set status to healing → call LLM → verify (caller provides verifier) → update selector + status.
 * If verifier returns true, update Supabase and set status to 'healed'; else leave 'healing' and log failure.
 */
export async function runHealLoop(
  request: HealRequest,
  options: {
    useVision?: boolean;
    verifier?: (selector: string) => Promise<boolean>;
  }
): Promise<HealResult> {
  await setSourceStatus(request.source_id, "healing");

  const result: HealResult = options.useVision
    ? await llmHealFromScreenshot(request)
    : await llmHealFromHtml(request);

  await logHealEvent(request.source_id, request.field_name, result, request);

  if (result.success && result.selector_after) {
    const verified = options.verifier
      ? await options.verifier(result.selector_after)
      : true;
    if (verified) {
      await updateSelector(
        request.source_id,
        request.field_name,
        result.selector_after,
        request.selector_before
      );
      await setSourceStatus(request.source_id, "healed", {
        last_heal_at: new Date().toISOString(),
      });
    } else {
      result.success = false;
      result.raw_error = (result.raw_error ?? "") + "; verification failed";
    }
  }

  if (!result.success) {
    await setSourceStatus(request.source_id, "healing");
    phoenixTraceFailure(request.source_id, request.trigger_reason, {
      field_name: request.field_name,
      raw_error: result.raw_error ?? "",
    });
  }

  await phoenixFlush();
  return result;
}
