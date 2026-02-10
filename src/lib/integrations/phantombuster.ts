/**
 * PhantomBuster placeholder: find Partner on LinkedIn when Apollo doesn't have them.
 * Set PHANTOMBUSTER_API_KEY and agent IDs to use.
 * Docs: https://phantombuster.com/api
 */

const API_BASE = "https://api.phantombuster.com/api/v2";

export interface PhantomBusterProfile {
  id: string;
  name?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  [key: string]: unknown;
}

/**
 * Launch a PhantomBuster agent (e.g. LinkedIn profile scraper) and return output when done.
 * Placeholder: returns empty until real API key and agent are configured.
 */
export async function runPhantomBusterAgent(
  agentId: string,
  _arguments: Record<string, unknown> = {}
): Promise<{ output?: PhantomBusterProfile[]; error?: string }> {
  const apiKey = process.env.PHANTOMBUSTER_API_KEY;
  if (!apiKey) {
    return { output: [], error: "PHANTOMBUSTER_API_KEY not set" };
  }

  try {
    const launchRes = await fetch(`${API_BASE}/agents/launch?id=${agentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Phantombuster-Key": apiKey,
      },
      body: JSON.stringify(_arguments),
    });
    if (!launchRes.ok) {
      const err = await launchRes.text();
      return { error: `Launch: ${launchRes.status} ${err}` };
    }
    const launch = (await launchRes.json()) as { containerId?: string };
    const containerId = launch.containerId;
    if (!containerId) return { error: "No containerId" };

    let status = "running";
    let waited = 0;
    while (status === "running" && waited < 120_000) {
      await new Promise((r) => setTimeout(r, 5000));
      waited += 5000;
      const statusRes = await fetch(
        `${API_BASE}/containers/fetch?id=${containerId}`,
        { headers: { "X-Phantombuster-Key": apiKey } }
      );
      const data = (await statusRes.json()) as { status?: string; output?: string };
      status = data.status ?? "unknown";
      if (status === "finished" && data.output) {
        try {
          const parsed = JSON.parse(data.output) as PhantomBusterProfile[];
          return { output: Array.isArray(parsed) ? parsed : [parsed] };
        } catch {
          return { output: [] };
        }
      }
    }
    return { error: "Timeout waiting for agent" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Find Partner by name/company on LinkedIn (via PhantomBuster agent).
 * Configure agent to search LinkedIn and return profile URL.
 */
export async function findPartnerOnLinkedIn(
  partnerName: string,
  company: string
): Promise<{ linkedinUrl?: string; profile?: PhantomBusterProfile } | null> {
  const agentId = process.env.PHANTOMBUSTER_LINKEDIN_SEARCH_AGENT_ID;
  if (!agentId) return null;
  const { output, error } = await runPhantomBusterAgent(agentId, {
    partnerName,
    company,
  });
  if (error || !output?.length) return null;
  const first = output[0];
  return {
    linkedinUrl: first.linkedinUrl ?? (first as { url?: string }).url,
    profile: first,
  };
}
