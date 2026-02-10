/**
 * Session Persistence: store browser cookies in Supabase.
 * Reuse sessions so scrapers do not trigger "New Login" / "Suspicious Login" alerts.
 * Cookie injection: load stored cookies and inject into Playwright context.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface BrowserSession {
  hub_id: string;
  source_id: string;
  cookies_encrypted: string;
  user_agent: string | null;
  expires_at: string | null;
}

export interface CookieRecord {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

import { encryptCookiePayload, decryptCookiePayload } from "./cookie-cipher";

function encodeCookies(cookies: CookieRecord[]): string {
  const plain = JSON.stringify(cookies);
  return encryptCookiePayload(plain);
}

function decodeCookies(encoded: string): CookieRecord[] {
  try {
    const plain = decryptCookiePayload(encoded);
    if (plain) return JSON.parse(plain) as CookieRecord[];
  } catch {
    // fallback: legacy base64 (no encryption)
  }
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as CookieRecord[];
  } catch {
    return [];
  }
}

/**
 * Save session cookies for hub+source. Overwrites existing.
 */
export async function saveSession(
  hubId: string,
  sourceId: string,
  cookies: CookieRecord[],
  options?: { userAgent?: string; expiresAt?: Date }
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  const expiresAt = options?.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await fetch(`${SUPABASE_URL}/rest/v1/browser_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      hub_id: hubId,
      source_id: sourceId,
      cookies_encrypted: encodeCookies(cookies),
      user_agent: options?.userAgent ?? null,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
}

/**
 * Load session for hub+source. Returns null if missing or expired.
 */
export async function loadSession(
  hubId: string,
  sourceId: string
): Promise<{ cookies: CookieRecord[]; userAgent: string | null } | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/browser_sessions?hub_id=eq.${encodeURIComponent(hubId)}&source_id=eq.${encodeURIComponent(sourceId)}&select=cookies_encrypted,user_agent,expires_at`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!res.ok) return null;
  const rows = (await res.json()) as BrowserSession[];
  const row = rows[0];
  if (!row?.cookies_encrypted) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

  return {
    cookies: decodeCookies(row.cookies_encrypted),
    userAgent: row.user_agent,
  };
}

/**
 * Page-like interface for cookie injection (Playwright: page.context().addCookies()).
 */
export interface PageWithContext {
  context: () => { addCookies: (cookies: Array<Record<string, unknown>>) => Promise<void> };
}

/**
 * Convert our CookieRecord to Playwright addCookies format and inject.
 */
export function toPlaywrightCookies(cookies: CookieRecord[]): Array<Record<string, unknown>> {
  return cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain ?? undefined,
    path: c.path ?? "/",
    expires: c.expires ?? -1,
    httpOnly: c.httpOnly ?? false,
    secure: c.secure ?? true,
    sameSite: (c.sameSite as "Strict" | "Lax" | "None") ?? "Lax",
  }));
}

/**
 * Load session and inject cookies into Playwright context (paywall bypass).
 */
export async function injectSavedSessionIntoPage(
  page: PageWithContext,
  hubId: string,
  sourceId: string
): Promise<boolean> {
  const session = await loadSession(hubId, sourceId);
  if (!session?.cookies.length) return false;

  await page.context().addCookies(toPlaywrightCookies(session.cookies));
  return true;
}
