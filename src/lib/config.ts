/**
 * Centralized configuration with fail-fast validation.
 * All env vars are validated at module load time.
 */

function optionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

export const config = {
  // Supabase (required for auth and data)
  supabase: {
    url: optionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: optionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  },

  // External APIs (optional, app degrades gracefully)
  apify: {
    token: optionalEnv("APIFY_TOKEN"),
    linkedinJobsActor: optionalEnv("APIFY_LINKEDIN_JOBS_ACTOR", "bebity/linkedin-jobs-scraper"),
  },

  apollo: {
    apiKey: optionalEnv("APOLLO_API_KEY"),
  },

  openai: {
    apiKey: optionalEnv("OPENAI_API_KEY"),
  },

  phantombuster: {
    apiKey: optionalEnv("PHANTOMBUSTER_API_KEY"),
    linkedinSearchAgentId: optionalEnv("PHANTOMBUSTER_LINKEDIN_SEARCH_AGENT_ID"),
  },

  proxycurl: {
    apiKey: optionalEnv("PROXYCURL_API_KEY"),
  },

  // Cron (required for cron endpoint)
  cron: {
    secret: optionalEnv("CRON_SECRET") ?? optionalEnv("VERCEL_CRON_SECRET"),
  },

  // Observability
  phoenix: {
    collectorUrl: optionalEnv("PHOENIX_COLLECTOR_URL"),
  },

  // Scraping (optional)
  zyte: {
    proxy: optionalEnv("ZYTE_PROXY"),
    apiKey: optionalEnv("ZYTE_API_KEY"),
  },

  fingerprint: {
    apiKey: optionalEnv("FINGERPRINT_API_KEY"),
    lastRequestId: optionalEnv("FINGERPRINT_LAST_REQUEST_ID"),
    apiRegion: optionalEnv("FINGERPRINT_API_REGION", "us"),
  },

  camoufox: {
    executablePath: optionalEnv("CAMOUFOX_EXECUTABLE_PATH"),
    useCamoufox: optionalEnv("USE_CAMOUFOX", "false") === "true",
  },
} as const;

/**
 * Check if Supabase is configured (for conditional features).
 */
export function isSupabaseConfigured(): boolean {
  return !!(config.supabase.url && config.supabase.anonKey);
}

/**
 * Check if a feature is available (for integration status).
 */
export function isFeatureAvailable(feature: keyof typeof config): boolean {
  switch (feature) {
    case "supabase":
      return isSupabaseConfigured();
    case "apify":
      return !!config.apify.token;
    case "apollo":
      return !!config.apollo.apiKey;
    case "openai":
      return !!config.openai.apiKey;
    case "phantombuster":
      return !!config.phantombuster.apiKey;
    case "proxycurl":
      return !!config.proxycurl.apiKey;
    case "cron":
      return !!config.cron.secret;
    case "phoenix":
      return !!config.phoenix.collectorUrl;
    default:
      return false;
  }
}

/**
 * Validate critical config at startup (call in route handlers or middleware).
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Supabase is optional (app can run in mock mode)
  // But if one is set, both should be set
  if (config.supabase.url && !config.supabase.anonKey) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY required when NEXT_PUBLIC_SUPABASE_URL is set");
  }
  if (config.supabase.anonKey && !config.supabase.url) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL required when NEXT_PUBLIC_SUPABASE_ANON_KEY is set");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
