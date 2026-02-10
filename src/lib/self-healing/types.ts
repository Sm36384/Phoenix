/**
 * Self-Healing (Phoenix Rebirth) types
 */

export type HealTriggerReason =
  | "null_field"
  | "selector_not_found"
  | "http_403"
  | "http_404"
  | "timeout";

export interface HealRequest {
  source_id: string;
  field_name: string;
  trigger_reason: HealTriggerReason;
  selector_before?: string | null;
  page_html?: string;
  screenshot_base64?: string;
  raw_error?: string;
}

export interface HealResult {
  success: boolean;
  selector_after?: string | null;
  raw_error?: string;
  trace_id?: string;
}

export interface SelectorRecord {
  source_id: string;
  field_name: string;
  selector_type: string;
  selector_value: string;
  selector_previous?: string | null;
}
