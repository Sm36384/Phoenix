/**
 * Partner discovery with multiple fallback providers and circuit breaker.
 * Addresses Risk 10.2: PhantomBuster Dependency Risk
 * 
 * Fallback chain: PhantomBuster → Proxycurl → manual entry
 * Circuit breaker: if PhantomBuster fails N times, skip it temporarily
 */

import { findPartnerOnLinkedIn } from "./phantombuster";
import { searchPersonProxycurl } from "./proxycurl";
import { createClient } from "@supabase/supabase-js";

export interface PartnerDiscoveryResult {
  linkedinUrl?: string;
  provider: "phantombuster" | "proxycurl" | "cache" | "none";
  cached?: boolean;
}

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5; // Fail N times before opening circuit
const CIRCUIT_BREAKER_RESET_SECONDS = 300; // Reset after 5 minutes

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  isOpen: boolean;
}

const circuitBreakerState: Map<string, CircuitBreakerState> = new Map();

function getCircuitBreakerKey(provider: string): string {
  return `circuit_breaker_${provider}`;
}

function isCircuitOpen(provider: string): boolean {
  const key = getCircuitBreakerKey(provider);
  const state = circuitBreakerState.get(key);
  if (!state) return false;

  if (state.isOpen) {
    const now = Date.now();
    const resetTime = (state.lastFailureTime ?? 0) + CIRCUIT_BREAKER_RESET_SECONDS * 1000;
    if (now > resetTime) {
      // Reset circuit
      circuitBreakerState.set(key, { failures: 0, lastFailureTime: null, isOpen: false });
      return false;
    }
    return true;
  }

  return false;
}

function recordFailure(provider: string): void {
  const key = getCircuitBreakerKey(provider);
  const state = circuitBreakerState.get(key) ?? { failures: 0, lastFailureTime: null, isOpen: false };
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
    state.isOpen = true;
  }

  circuitBreakerState.set(key, state);
}

function recordSuccess(provider: string): void {
  const key = getCircuitBreakerKey(provider);
  circuitBreakerState.set(key, { failures: 0, lastFailureTime: null, isOpen: false });
}

/**
 * Check cache for Partner LinkedIn URL in stakeholders table.
 */
async function getCachedPartnerLinkedIn(
  partnerName: string,
  company: string
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from("stakeholders")
      .select("linkedin_url")
      .eq("name", partnerName)
      .eq("company", company)
      .not("linkedin_url", "is", null)
      .limit(1)
      .single();

    return data?.linkedin_url ?? null;
  } catch {
    return null;
  }
}

/**
 * Cache Partner LinkedIn URL in stakeholders table.
 */
async function cachePartnerLinkedIn(
  partnerName: string,
  company: string,
  linkedinUrl: string
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const supabase = createClient(url, key);
    // Upsert a placeholder stakeholder record for caching
    await supabase.from("stakeholders").upsert(
      {
        name: partnerName,
        company,
        linkedin_url: linkedinUrl,
        type: "recruiter", // Placeholder type
        signal_id: "00000000-0000-0000-0000-000000000000", // Placeholder UUID
      },
      {
        onConflict: "name,company",
        ignoreDuplicates: false,
      }
    );
  } catch {
    // Ignore cache errors
  }
}

/**
 * Discover Partner LinkedIn URL with fallback chain and caching.
 * 
 * 1. Check cache first
 * 2. Try PhantomBuster (if circuit not open)
 * 3. Try Proxycurl (if circuit not open)
 * 4. Return null if all fail
 */
export async function discoverPartnerWithFallback(
  partnerName: string,
  company: string
): Promise<PartnerDiscoveryResult> {
  // Step 1: Check cache
  const cached = await getCachedPartnerLinkedIn(partnerName, company);
  if (cached) {
    return {
      linkedinUrl: cached,
      provider: "cache",
      cached: true,
    };
  }

  // Step 2: Try PhantomBuster (if circuit not open)
  if (!isCircuitOpen("phantombuster")) {
    try {
      const phantom = await findPartnerOnLinkedIn(partnerName, company);
      if (phantom?.linkedinUrl) {
        recordSuccess("phantombuster");
        await cachePartnerLinkedIn(partnerName, company, phantom.linkedinUrl);
        return {
          linkedinUrl: phantom.linkedinUrl,
          provider: "phantombuster",
          cached: false,
        };
      }
      recordFailure("phantombuster");
    } catch {
      recordFailure("phantombuster");
    }
  }

  // Step 3: Try Proxycurl (if circuit not open)
  if (!isCircuitOpen("proxycurl")) {
    try {
      const proxycurl = await searchPersonProxycurl(partnerName, company);
      if (proxycurl?.linkedinUrl) {
        recordSuccess("proxycurl");
        await cachePartnerLinkedIn(partnerName, company, proxycurl.linkedinUrl);
        return {
          linkedinUrl: proxycurl.linkedinUrl,
          provider: "proxycurl",
          cached: false,
        };
      }
      recordFailure("proxycurl");
    } catch {
      recordFailure("proxycurl");
    }
  }

  // Step 4: All failed
  return {
    provider: "none",
    cached: false,
  };
}
