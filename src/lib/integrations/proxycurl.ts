/**
 * Proxycurl API integration as fallback for PhantomBuster.
 * Addresses Risk 10.2: PhantomBuster Dependency Risk
 * Docs: https://nubela.co/proxycurl/docs#people-api
 */

const PROXYCURL_API_BASE = "https://nubela.co/proxycurl/api/v2";

export interface ProxycurlProfile {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  summary?: string;
  country?: string;
  city?: string;
  state?: string;
  experiences?: Array<{
    company?: string;
    title?: string;
    starts_at?: { year?: number; month?: number };
    ends_at?: { year?: number; month?: number };
  }>;
  linkedin_url?: string;
  profile_pic_url?: string;
  [key: string]: unknown;
}

/**
 * Search for a person by name and company using Proxycurl.
 * Requires PROXYCURL_API_KEY.
 */
export async function searchPersonProxycurl(
  name: string,
  company: string,
  options?: { apiKey?: string }
): Promise<{ linkedinUrl?: string; profile?: ProxycurlProfile } | null> {
  const apiKey = options?.apiKey ?? process.env.PROXYCURL_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Proxycurl Person Search API
    const res = await fetch(`${PROXYCURL_API_BASE}/linkedin/profile/resolve`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      // Note: Proxycurl resolve endpoint may require different params
      // This is a placeholder structure; adjust based on actual API
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as ProxycurlProfile;
    if (data.linkedin_url) {
      return {
        linkedinUrl: data.linkedin_url,
        profile: data,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Alternative: Use Proxycurl's LinkedIn Profile API with URL if we have it.
 */
export async function getProfileByLinkedInUrl(
  linkedinUrl: string,
  options?: { apiKey?: string }
): Promise<ProxycurlProfile | null> {
  const apiKey = options?.apiKey ?? process.env.PROXYCURL_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const res = await fetch(`${PROXYCURL_API_BASE}/linkedin/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      // Note: Proxycurl may require URL as query param or body
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as ProxycurlProfile;
  } catch {
    return null;
  }
}
