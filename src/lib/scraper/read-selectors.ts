/**
 * Read scraper selectors from Supabase for a source.
 * Workers use this to get CSS selectors for extracting job data.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

export interface ScraperSelector {
  id: string;
  source_id: string;
  field_name: string;
  selector_type: string;
  selector_value: string;
  selector_previous?: string | null;
  last_verified_at?: string;
  updated_at?: string;
}

/**
 * Get all selectors for a source.
 * Returns map of field_name -> selector_value for easy lookup.
 */
export async function getSelectorsForSource(sourceId: string): Promise<Map<string, string>> {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.serviceRoleKey;

  if (!supabaseUrl || !supabaseKey) {
    return new Map(); // Return empty map if Supabase not configured
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("scraper_selectors")
      .select("*")
      .eq("source_id", sourceId);

    if (error || !data) {
      console.warn(`No selectors found for source: ${sourceId}`);
      return new Map();
    }

    const map = new Map<string, string>();
    for (const selector of data) {
      map.set(selector.field_name, selector.selector_value);
    }

    return map;
  } catch (error) {
    console.error(`Failed to fetch selectors for ${sourceId}:`, error);
    return new Map();
  }
}

/**
 * Get a single selector for a field.
 * Returns fallback if not found in DB.
 */
export async function getSelector(
  sourceId: string,
  fieldName: string,
  fallback?: string
): Promise<string> {
  const selectors = await getSelectorsForSource(sourceId);
  return selectors.get(fieldName) ?? fallback ?? `[data-field="${fieldName}"]`;
}

/**
 * Get all selectors as an object (for convenience).
 */
export async function getSelectorsObject(sourceId: string): Promise<Record<string, string>> {
  const selectors = await getSelectorsForSource(sourceId);
  return Object.fromEntries(selectors);
}
