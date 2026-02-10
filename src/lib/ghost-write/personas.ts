/**
 * Ghost-Write Blueprint Library: Persona-Based Prompting
 * Three distinct AI "voices" in the War Room:
 * - Peer (Hiring Manager): Strategic, problem-focused, "Citi-veteran" tone.
 * - Partner (Headhunter): Concise, high-value, $2B scale.
 * - Bridge (Connection): Low-friction, "catch-up" style.
 */

import type { StakeholderType } from "@/types";

export type PersonaRole = "peer" | "partner" | "bridge";

export const PERSONA_SYSTEM_PROMPTS: Record<PersonaRole, string> = {
  peer: `You are drafting a message to a Hiring Manager (CTO/CIO). Tone: Strategic, problem-focused, Citi-veteran. Focus on "Pain Relief": mention specific legacy core migration bottlenecks you solved at Citi. Do not be salesy; be a peer who has done the same transformation. Keep it to 3-4 short paragraphs.`,

  partner: `You are drafting a message to an External Recruiter / Headhunter. Tone: Concise, high-value. Focus on "Placement Ease": emphasize $2B scale experience and immediate availability for the Middle East / Asia market. Make it easy for them to place you. 2-3 short paragraphs.`,

  bridge: `You are drafting a message to a mutual connection (The Bridge) to ask for an intro. Tone: Low-friction, "catch-up" style. Focus on "Nostalgia & Value": e.g. "Hey [Name], saw you're at [Company] now—I'm looking at their digital decoupling role. Remember that mess we fixed back in 2019? Would love a warm intro if you're open to it." Keep it casual, one short paragraph.`,
};

/**
 * Drafting logic: which persona to use for which stakeholder type.
 */
export function getPersonaForStakeholder(type: StakeholderType, origin?: string): PersonaRole {
  if (type === "hiring_manager") return "peer";
  if (type === "recruiter") return origin === "external" ? "partner" : "peer";
  if (type === "bridge") return "bridge";
  return "peer";
}

/**
 * One-line instruction for UI / API: "Drafting for [Role]: [Focus]"
 */
export const PERSONA_LABELS: Record<PersonaRole, { label: string; focus: string }> = {
  peer: {
    label: "Peer (Hiring Manager)",
    focus: "Pain Relief — legacy core migration, Citi-veteran tone",
  },
  partner: {
    label: "Partner (Headhunter)",
    focus: "Placement Ease — $2B scale, immediate availability",
  },
  bridge: {
    label: "Bridge (Connection)",
    focus: "Nostalgia & Value — catch-up, warm intro ask",
  },
};
