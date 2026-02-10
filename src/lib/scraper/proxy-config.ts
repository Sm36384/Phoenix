/**
 * Proxy configuration per hub. Use Zyte / Bright Data; read from env or regional_profiles.
 */

export type HubId = string;

const PROXY_ENV: Record<string, { server: string; username?: string; password?: string }> = {
  Singapore: {
    server: process.env.PROXY_SG ?? process.env.ZYTE_PROXY ?? "",
    username: process.env.PROXY_SG_USER ?? process.env.ZYTE_API_KEY,
    password: process.env.PROXY_SG_PASS,
  },
  Riyadh: {
    server: process.env.PROXY_RIYADH ?? process.env.ZYTE_PROXY ?? "",
    username: process.env.PROXY_RIYADH_USER ?? process.env.ZYTE_API_KEY,
    password: process.env.PROXY_RIYADH_PASS,
  },
  Dubai: {
    server: process.env.PROXY_DUBAI ?? process.env.ZYTE_PROXY ?? "",
    username: process.env.ZYTE_API_KEY,
    password: process.env.PROXY_DUBAI_PASS,
  },
};

/**
 * Get proxy for Playwright: browser.launch({ proxy: getProxyForHub(hubId) }).
 */
export function getProxyForHub(hubId: HubId): { server: string; username?: string; password?: string } | undefined {
  const cfg = PROXY_ENV[hubId] ?? {
    server: process.env.ZYTE_PROXY ?? process.env.BRIGHT_DATA_PROXY ?? "",
    username: process.env.ZYTE_API_KEY ?? process.env.BRIGHT_DATA_USER,
    password: process.env.BRIGHT_DATA_PASS,
  };
  if (!cfg.server) return undefined;
  return {
    server: cfg.server,
    username: cfg.username ?? undefined,
    password: cfg.password ?? undefined,
  };
}

/**
 * Whether to use Camoufox for this hub (KSA/SG bank portals).
 */
export function useCamoufoxForHub(hubId: HubId): boolean {
  const force = process.env.USE_CAMOUFOX === "1";
  return force || hubId === "Riyadh" || hubId === "Singapore";
}
