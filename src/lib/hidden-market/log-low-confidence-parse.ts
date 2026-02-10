/**
 * Log low-confidence JD parses for manual review.
 * Addresses Risk 10.1: JD Quality & Parsing Accuracy
 */

import { createClient } from "@supabase/supabase-js";
import type { ExecutiveJDEntitiesWithConfidence } from "./parse-executive-jd-with-confidence";

const CONFIDENCE_THRESHOLD_FOR_LOGGING = 0.5; // Log if confidence < 0.5

export interface LowConfidenceParseLog {
  source_id?: string;
  jd_text_preview?: string; // First 500 chars
  parsed_entities: ExecutiveJDEntitiesWithConfidence;
  confidence: number;
  parse_method: "llm" | "fallback_keywords";
  created_at?: string;
}

/**
 * Log a low-confidence parse to Supabase (or console if not configured).
 */
export async function logLowConfidenceParse(
  parse: ExecutiveJDEntitiesWithConfidence,
  options?: { jdTextPreview?: string; sourceId?: string }
): Promise<void> {
  if (parse.confidence >= CONFIDENCE_THRESHOLD_FOR_LOGGING) {
    return; // Only log low-confidence parses
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Fallback to console logging
    console.warn("[Low Confidence Parse]", {
      confidence: parse.confidence,
      method: parse.parseMethod,
      entities: parse,
      preview: options?.jdTextPreview?.substring(0, 200),
    });
    return;
  }

  try {
    const supabase = createClient(url, key);
    // Note: You may want to create a `low_confidence_parses` table in Supabase
    // For now, we'll log to console or an existing audit table
    console.warn("[Low Confidence Parse - DB]", {
      source_id: options?.sourceId,
      confidence: parse.confidence,
      method: parse.parseMethod,
      entities: parse,
    });

    // TODO: Insert into `low_confidence_parses` table if it exists
    // await supabase.from("low_confidence_parses").insert({
    //   source_id: options?.sourceId,
    //   jd_text_preview: options?.jdTextPreview?.substring(0, 500),
    //   parsed_entities: parse,
    //   confidence: parse.confidence,
    //   parse_method: parse.parseMethod,
    // });
  } catch (error) {
    console.error("[Failed to log low-confidence parse]", error);
  }
}
