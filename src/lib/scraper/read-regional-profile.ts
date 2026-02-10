/**
 * Read regional profile from Supabase for scraping workers.
 * Workers use this to get timezone, proxy config, and business hours.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

export interface RegionalProfile {
  id: string;
  hub_id: string;
  timezone_iana: string;
  proxy_provider?: string;
  proxy_region?: string;
  business_start_hour: number;
  business_end_hour: number;
  updated_at?: string;
}

/**
 * Get regional profile for a hub from Supabase.
 * Falls back to defaults if not found in DB.
 */
export async function getRegionalProfile(hubId: string): Promise<RegionalProfile> {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.serviceRoleKey;

  if (!supabaseUrl || !supabaseKey) {
    // Fallback to defaults
    return getDefaultProfile(hubId);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("regional_profiles")
      .select("*")
      .eq("hub_id", hubId)
      .single();

    if (error || !data) {
      console.warn(`No regional profile found for ${hubId}, using defaults`);
      return getDefaultProfile(hubId);
    }

    return {
      id: data.id,
      hub_id: data.hub_id,
      timezone_iana: data.timezone_iana,
      proxy_provider: data.proxy_provider ?? undefined,
      proxy_region: data.proxy_region ?? undefined,
      business_start_hour: data.business_start_hour ?? 9,
      business_end_hour: data.business_end_hour ?? 18,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error(`Failed to fetch regional profile for ${hubId}:`, error);
    return getDefaultProfile(hubId);
  }
}

/**
 * Default profiles if DB lookup fails.
 */
function getDefaultProfile(hubId: string): RegionalProfile {
  const defaults: Record<string, Omit<RegionalProfile, "id" | "updated_at">> = {
    Singapore: {
      hub_id: "Singapore",
      timezone_iana: "Asia/Singapore",
      proxy_region: "StarHub/Singtel",
      business_start_hour: 9,
      business_end_hour: 18,
    },
    Riyadh: {
      hub_id: "Riyadh",
      timezone_iana: "Asia/Riyadh",
      proxy_region: "STC/Mobily",
      business_start_hour: 9,
      business_end_hour: 18,
    },
    Dubai: {
      hub_id: "Dubai",
      timezone_iana: "Asia/Dubai",
      proxy_region: "Etisalat/du",
      business_start_hour: 9,
      business_end_hour: 18,
    },
    "Hong Kong": {
      hub_id: "Hong Kong",
      timezone_iana: "Asia/Hong_Kong",
      proxy_region: "HKBN/PCCW",
      business_start_hour: 9,
      business_end_hour: 18,
    },
    Mumbai: {
      hub_id: "Mumbai",
      timezone_iana: "Asia/Kolkata",
      proxy_region: "Airtel/Jio",
      business_start_hour: 9,
      business_end_hour: 18,
    },
    Bangalore: {
      hub_id: "Bangalore",
      timezone_iana: "Asia/Kolkata",
      proxy_region: "Airtel/Jio",
      business_start_hour: 9,
      business_end_hour: 18,
    },
  };

  const profile = defaults[hubId] ?? {
    hub_id: hubId,
    timezone_iana: "UTC",
    business_start_hour: 9,
    business_end_hour: 18,
  };

  return {
    id: `default-${hubId.toLowerCase()}`,
    ...profile,
  };
}

/**
 * Check if hub is currently within business hours (using profile timezone).
 */
export function isHubInBusinessHours(profile: RegionalProfile): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.timezone_iana,
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(formatter.format(now), 10);
  return hour >= profile.business_start_hour && hour < profile.business_end_hour;
}
