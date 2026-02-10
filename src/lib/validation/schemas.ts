/**
 * Validation schemas for route handlers.
 * Simple object validation (can be replaced with zod if needed).
 */

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate draft pitch request body.
 */
export function validateDraftPitchBody(body: unknown): ValidationResult<{
  stakeholderType: string;
  origin?: string;
  headline: string;
  company: string;
  hub?: string;
  region?: string;
  bridgeName?: string;
  recruiterFirm?: string;
}> {
  if (typeof body !== "object" || body === null) {
    return { valid: false, errors: ["Body must be an object"] };
  }

  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof b.headline !== "string" || !b.headline.trim()) {
    errors.push("headline is required and must be a string");
  }
  if (typeof b.company !== "string" || !b.company.trim()) {
    errors.push("company is required and must be a string");
  }
  if (b.stakeholderType && typeof b.stakeholderType !== "string") {
    errors.push("stakeholderType must be a string");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      stakeholderType: (b.stakeholderType as string) ?? "hiring_manager",
      origin: typeof b.origin === "string" ? b.origin : undefined,
      headline: b.headline as string,
      company: b.company as string,
      hub: typeof b.hub === "string" ? b.hub : undefined,
      region: typeof b.region === "string" ? b.region : undefined,
      bridgeName: typeof b.bridgeName === "string" ? b.bridgeName : undefined,
      recruiterFirm: typeof b.recruiterFirm === "string" ? b.recruiterFirm : undefined,
    },
  };
}

/**
 * Validate parse executive JD request body.
 */
export function validateParseJDBody(body: unknown): ValidationResult<{
  imageBase64?: string;
  jdTextPreview?: string;
  sourceId?: string;
}> {
  if (typeof body !== "object" || body === null) {
    return { valid: false, errors: ["Body must be an object"] };
  }

  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  if (!b.imageBase64 && !b.jdTextPreview) {
    errors.push("Either imageBase64 or jdTextPreview is required");
  }
  if (b.imageBase64 && typeof b.imageBase64 !== "string") {
    errors.push("imageBase64 must be a string");
  }
  if (b.jdTextPreview && typeof b.jdTextPreview !== "string") {
    errors.push("jdTextPreview must be a string");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      imageBase64: typeof b.imageBase64 === "string" ? b.imageBase64 : undefined,
      jdTextPreview: typeof b.jdTextPreview === "string" ? b.jdTextPreview : undefined,
      sourceId: typeof b.sourceId === "string" ? b.sourceId : undefined,
    },
  };
}
