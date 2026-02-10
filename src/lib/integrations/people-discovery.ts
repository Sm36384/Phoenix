/**
 * People Discovery (LinkedIn Intelligence / Triangulation)
 * Node B: Hiring Manager via Apollo.io People Search.
 * Node C: Recruiter via Apify LinkedIn Poster Scraper (call separately).
 *
 * For every job: Apollo search [Company Name] + Seniority C-Level, VP + Department IT, Engineering.
 */

export interface ApolloPerson {
  id: string;
  name: string;
  title?: string;
  organization?: { name: string };
  email?: string;
  linkedin_url?: string;
  [key: string]: unknown;
}

export interface ApolloPeopleSearchParams {
  organization_name?: string;
  person_titles?: string[];
  person_seniorities?: string[];
  person_locations?: string[];
  contact_email_status?: string[];
}

const APOLLO_DEFAULT_TITLES = [
  "CTO",
  "CIO",
  "Head of Digital",
  "Head of Technology",
  "VP Digital",
  "VP Technology",
  "Chief Digital Officer",
  "Chief Technology Officer",
  "Chief Information Officer",
];

/**
 * Apollo.io People Search API.
 * Search: [Company Name] + Seniority: C-Level, VP + Department: IT, Engineering.
 */
export async function apolloPeopleSearch(
  companyName: string,
  options?: {
    titles?: string[];
    seniorities?: string[];
    limit?: number;
  }
): Promise<ApolloPerson[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.warn("APOLLO_API_KEY not set; returning empty people list");
    return [];
  }

  const titles = options?.titles ?? APOLLO_DEFAULT_TITLES;
  const seniorities = options?.seniorities ?? ["c_level", "vp"];
  const limit = options?.limit ?? 10;

  const body = {
    api_key: apiKey,
    q_organization_name: companyName,
    person_titles: titles,
    person_seniorities: seniorities,
    contact_email_status: ["verified"],
    page: 1,
    per_page: limit,
  };

  const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Apollo People Search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    people?: ApolloPerson[];
    pagination?: { total_entries: number };
  };

  const people = data.people ?? [];
  return people;
}

/**
 * For a given job (company name), find the likely Hiring Manager (CIO/CTO/Head of Digital).
 * Returns best match and their email + LinkedIn for Bridge step.
 */
export async function findHiringManagerForCompany(
  companyName: string
): Promise<ApolloPerson | null> {
  const people = await apolloPeopleSearch(companyName, { limit: 5 });
  if (people.length === 0) return null;
  const preferred = people.find(
    (p) =>
      p.title &&
      /CTO|CIO|Chief Digital|Head of Digital|Head of Technology|VP Digital/i.test(p.title)
  );
  return preferred ?? people[0];
}
