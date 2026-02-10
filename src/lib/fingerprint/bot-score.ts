/**
 * Fingerprint.com Server API: bot detection.
 * GET https://api.fpjs.io/events/{request_id} with Auth-API-Key.
 * If Bot Score > 10%, auto-rotate proxy and browser headers.
 */

const BOT_SCORE_THRESHOLD_PCT = 10;

const FP_API_BASE = process.env.FINGERPRINT_API_REGION === "eu" ? "https://eu.api.fpjs.io" : "https://api.fpjs.io";

export interface BotScoreResult {
  scorePct: number;
  shouldRotate: boolean;
  botResult?: string;
  raw?: unknown;
}

/** Map bot.result to a 0–100 score (higher = more bot-like). */
function botResultToScorePct(result: string | undefined): number {
  if (!result) return 0;
  switch (result) {
    case "notDetected":
      return 0;
    case "good":
      return 5;
    case "bad":
      return 100;
    case "bot":
      return 90;
    default:
      return 50;
  }
}

/**
 * Call Fingerprint.com Server API (Get event by request ID).
 * Requires FINGERPRINT_API_KEY. Use requestId from your frontend Fingerprint agent, or pass one.
 */
export async function checkBotScore(
  options?: { requestId?: string; apiKey?: string }
): Promise<BotScoreResult> {
  const apiKey = options?.apiKey ?? process.env.FINGERPRINT_API_KEY;
  if (!apiKey) {
    return { scorePct: 0, shouldRotate: false };
  }

  const requestId = options?.requestId ?? process.env.FINGERPRINT_LAST_REQUEST_ID ?? "";
  if (!requestId) {
    return { scorePct: 0, shouldRotate: false, raw: "No requestId (run Fingerprint agent to get one)" };
  }

  try {
    const res = await fetch(`${FP_API_BASE}/events/${encodeURIComponent(requestId)}`, {
      method: "GET",
      headers: { "Auth-API-Key": apiKey },
    });

    if (!res.ok) {
      return { scorePct: 0, shouldRotate: false, raw: await res.text() };
    }

    const data = (await res.json()) as {
      products?: { botd?: { data?: { bot?: { result?: string } } } };
    };
    const botResult = data.products?.botd?.data?.bot?.result;
    const scorePct = botResultToScorePct(botResult);
    const shouldRotate = scorePct > BOT_SCORE_THRESHOLD_PCT;

    return { scorePct, shouldRotate, botResult, raw: data };
  } catch (e) {
    return {
      scorePct: 0,
      shouldRotate: false,
      raw: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * If shouldRotate, caller should switch proxy and refresh browser headers
 * before continuing the scrape.
 */
export function shouldRotateProxyAfterCheck(result: BotScoreResult): boolean {
  return result.shouldRotate;
}

/**
 * Return rotated proxy config (e.g. next pool) when bot score > threshold.
 */
export function getRotatedProxyEnvKey(hubId: string): string {
  const alt = process.env[`PROXY_${hubId.toUpperCase().replace(/\s+/g, "_")}_ALT`] ?? process.env.ZYTE_PROXY_ALT;
  return alt ?? "";
}

/** Rotated proxy object for Playwright when shouldRotate. */
export function getRotatedProxyForHub(
  hubId: string
): { server: string; username?: string; password?: string } | undefined {
  const server = getRotatedProxyEnvKey(hubId);
  if (!server) return undefined;
  return {
    server,
    username: process.env.ZYTE_API_KEY ?? process.env.BRIGHT_DATA_USER,
    password: process.env.BRIGHT_DATA_PASS ?? process.env.PROXY_RIYADH_PASS,
  };
}

/** Fresh user-agent pool for rotation (reduce fingerprint reuse). */
const ROTATION_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

export function getRotatedUserAgent(): string {
  const i = Math.floor(Math.random() * ROTATION_USER_AGENTS.length);
  return ROTATION_USER_AGENTS[i] ?? ROTATION_USER_AGENTS[0];
}

/**
 * Apply rotation: close current browser, re-launch with rotated proxy + new user-agent.
 * Call after checkBotScore when shouldRotate is true.
 */
export interface RotationConfig {
  proxy: { server: string; username?: string; password?: string } | undefined;
  userAgent: string;
}

export function getRotationConfig(hubId: string): RotationConfig {
  return {
    proxy: getRotatedProxyForHub(hubId),
    userAgent: getRotatedUserAgent(),
  };
}
