/**
 * Rate limiting per source to prevent ToS violations.
 * Addresses Risk 10.3: Legal Gray Zones & ToS Compliance
 */

interface RateLimitState {
  lastRequestTime: number;
  requestCount: number;
  windowStart: number;
}

const rateLimitStore: Map<string, RateLimitState> = new Map();

export interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 12, // 12 requests per minute = 1 per 5 seconds
  windowMs: 60_000, // 1 minute
};

/**
 * Check if a request is allowed for a given source.
 * Returns { allowed: boolean, waitMs?: number }
 */
export function checkRateLimit(
  sourceId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; waitMs?: number; remainingRequests: number } {
  const now = Date.now();
  const state = rateLimitStore.get(sourceId) ?? {
    lastRequestTime: 0,
    requestCount: 0,
    windowStart: now,
  };

  // Reset window if expired
  if (now - state.windowStart >= config.windowMs) {
    state.requestCount = 0;
    state.windowStart = now;
  }

  // Check if limit exceeded
  if (state.requestCount >= config.maxRequests) {
    const waitMs = config.windowMs - (now - state.windowStart);
    return {
      allowed: false,
      waitMs: Math.max(0, waitMs),
      remainingRequests: 0,
    };
  }

  // Allow request
  state.requestCount++;
  state.lastRequestTime = now;
  rateLimitStore.set(sourceId, state);

  return {
    allowed: true,
    remainingRequests: config.maxRequests - state.requestCount,
  };
}

/**
 * Wait if rate limit exceeded, then proceed.
 */
export async function waitForRateLimit(
  sourceId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<void> {
  const check = checkRateLimit(sourceId, config);
  if (!check.allowed && check.waitMs) {
    await new Promise((resolve) => setTimeout(resolve, check.waitMs));
    // Retry once after wait
    checkRateLimit(sourceId, config);
  }
}

/**
 * Get rate limit status for a source (for monitoring).
 */
export function getRateLimitStatus(sourceId: string, config: RateLimitConfig = DEFAULT_CONFIG): {
  remainingRequests: number;
  windowResetMs: number;
  isLimited: boolean;
} {
  const state = rateLimitStore.get(sourceId);
  if (!state) {
    return {
      remainingRequests: config.maxRequests,
      windowResetMs: config.windowMs,
      isLimited: false,
    };
  }

  const now = Date.now();
  const windowResetMs = Math.max(0, config.windowMs - (now - state.windowStart));
  const remainingRequests = Math.max(0, config.maxRequests - state.requestCount);
  const isLimited = remainingRequests === 0;

  return {
    remainingRequests,
    windowResetMs,
    isLimited,
  };
}
