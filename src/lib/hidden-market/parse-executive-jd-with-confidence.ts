/**
 * Enhanced JD parsing with confidence scores and fallback keyword extraction.
 * Addresses Risk 10.1: JD Quality & Parsing Accuracy
 */

import { parseExecutiveJDFromImage, type ExecutiveJDEntities } from "./parse-executive-jd";

export interface ExecutiveJDEntitiesWithConfidence extends ExecutiveJDEntities {
  confidence: number; // 0-1, overall confidence in parse
  fieldConfidences: {
    partnerName: number;
    partnerTitle: number;
    company: number;
    roleTitle: number;
    salaryRange: number;
    isExecutive: number;
  };
  parseMethod: "llm" | "fallback_keywords";
}

const CONFIDENCE_THRESHOLD = 0.6; // If LLM confidence < 0.6, use fallback

/**
 * Extract company name using keyword patterns (fallback when LLM fails).
 */
function extractCompanyFallback(text: string): string | null {
  // Common patterns: "at [Company]", "Company: [Name]", "[Company] is seeking"
  const patterns = [
    /(?:at|with|from)\s+([A-Z][A-Za-z0-9\s&]+(?:Inc|Ltd|LLC|Corp|Bank|Group)?)/i,
    /Company[:\s]+([A-Z][A-Za-z0-9\s&]+)/i,
    /([A-Z][A-Za-z0-9\s&]+(?:Inc|Ltd|LLC|Corp|Bank|Group)?)\s+is\s+seeking/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract role title using keyword patterns.
 */
function extractRoleTitleFallback(text: string): string | null {
  const patterns = [
    /(?:Role|Position|Title)[:\s]+([A-Z][A-Za-z\s]+)/i,
    /(?:seeking|hiring)\s+(?:a|an|the)?\s*([A-Z][A-Za-z\s]+(?:Director|VP|Head|Manager|Lead|Engineer))/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract partner/contact name using keyword patterns.
 */
function extractPartnerNameFallback(text: string): string | null {
  const patterns = [
    /Contact\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /Partner[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /Reach\s+out\s+to\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract salary range using regex patterns.
 */
function extractSalaryRangeFallback(text: string): { range: string | null; minUsd: number | null } {
  const patterns = [
    /\$(\d+(?:\.\d+)?)\s*k?\s*[-–]\s*\$?(\d+(?:\.\d+)?)\s*k?/i,
    /(\d+(?:\.\d+)?)\s*k\s*[-–]\s*(\d+(?:\.\d+)?)\s*k/i,
    /USD\s*(\d+(?:,\d{3})*)\s*[-–]\s*(\d+(?:,\d{3})*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const min = parseFloat(match[1].replace(/,/g, ""));
      const max = parseFloat(match[2].replace(/,/g, ""));
      const minK = min < 100 ? min * 1000 : min; // Assume "k" if < 100
      return {
        range: `$${Math.round(minK / 1000)}k-$${Math.round((max < 100 ? max * 1000 : max) / 1000)}k`,
        minUsd: minK,
      };
    }
  }
  // Single value
  const singleMatch = text.match(/\$?(\d+(?:\.\d+)?)\s*k/i);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]) * 1000;
    return { range: `$${Math.round(val / 1000)}k`, minUsd: val };
  }
  return { range: null, minUsd: null };
}

/**
 * Fallback keyword-based extraction when LLM confidence is low.
 */
function extractWithFallback(text: string): ExecutiveJDEntitiesWithConfidence {
  const company = extractCompanyFallback(text);
  const roleTitle = extractRoleTitleFallback(text);
  const partnerName = extractPartnerNameFallback(text);
  const { range: salaryRange, minUsd: salaryMinUsd } = extractSalaryRangeFallback(text);
  const isExecutive = /(?:C-?level|C-?suite|Chief|Managing\s+Director|MD|VP|Vice\s+President|Executive)/i.test(text) ||
    (salaryMinUsd != null && salaryMinUsd >= 500_000);

  // Calculate field confidences (lower for fallback)
  const fieldConfidences = {
    partnerName: partnerName ? 0.5 : 0,
    partnerTitle: 0.3, // Hard to extract from keywords
    company: company ? 0.6 : 0,
    roleTitle: roleTitle ? 0.5 : 0,
    salaryRange: salaryRange ? 0.7 : 0,
    isExecutive: isExecutive ? 0.8 : 0.5,
  };

  const overallConfidence = Object.values(fieldConfidences).reduce((a, b) => a + b, 0) / Object.keys(fieldConfidences).length;

  return {
    partnerName,
    partnerTitle: null,
    company,
    roleTitle,
    salaryRange,
    salaryMinUsd,
    isExecutive,
    contactNote: null,
    confidence: overallConfidence,
    fieldConfidences,
    parseMethod: "fallback_keywords",
  };
}

/**
 * Calculate confidence scores for LLM-parsed entities.
 */
function calculateLLMConfidence(entities: ExecutiveJDEntities): {
  confidence: number;
  fieldConfidences: ExecutiveJDEntitiesWithConfidence["fieldConfidences"];
} {
  const fieldConfidences = {
    partnerName: entities.partnerName ? 0.9 : 0,
    partnerTitle: entities.partnerTitle ? 0.8 : 0.3,
    company: entities.company ? 0.95 : 0,
    roleTitle: entities.roleTitle ? 0.9 : 0,
    salaryRange: entities.salaryRange ? 0.85 : 0,
    isExecutive: entities.isExecutive ? 0.9 : 0.5,
  };

  const confidence = Object.values(fieldConfidences).reduce((a, b) => a + b, 0) / Object.keys(fieldConfidences).length;

  return { confidence, fieldConfidences };
}

/**
 * Enhanced parse with confidence scores and fallback.
 * If LLM parse confidence < threshold, falls back to keyword extraction.
 */
export async function parseExecutiveJDWithConfidence(
  imageBase64: string,
  textFallback?: string, // Optional: OCR'd text for fallback
  options?: { openaiApiKey?: string; confidenceThreshold?: number }
): Promise<ExecutiveJDEntitiesWithConfidence> {
  const threshold = options?.confidenceThreshold ?? CONFIDENCE_THRESHOLD;

  // Try LLM parse first
  try {
    const llmResult = await parseExecutiveJDFromImage(imageBase64, options);
    const { confidence, fieldConfidences } = calculateLLMConfidence(llmResult);

    if (confidence >= threshold) {
      return {
        ...llmResult,
        confidence,
        fieldConfidences,
        parseMethod: "llm",
      };
    }

    // LLM confidence too low, use fallback if text available
    if (textFallback) {
      const fallback = extractWithFallback(textFallback);
      // Merge: prefer LLM values if they exist, otherwise fallback
      return {
        partnerName: llmResult.partnerName ?? fallback.partnerName,
        partnerTitle: llmResult.partnerTitle ?? fallback.partnerTitle,
        company: llmResult.company ?? fallback.company,
        roleTitle: llmResult.roleTitle ?? fallback.roleTitle,
        salaryRange: llmResult.salaryRange ?? fallback.salaryRange,
        salaryMinUsd: llmResult.salaryMinUsd ?? fallback.salaryMinUsd,
        isExecutive: llmResult.isExecutive || fallback.isExecutive,
        contactNote: llmResult.contactNote ?? fallback.contactNote,
        confidence: Math.max(confidence, fallback.confidence),
        fieldConfidences: {
          partnerName: Math.max(fieldConfidences.partnerName, fallback.fieldConfidences.partnerName),
          partnerTitle: Math.max(fieldConfidences.partnerTitle, fallback.fieldConfidences.partnerTitle),
          company: Math.max(fieldConfidences.company, fallback.fieldConfidences.company),
          roleTitle: Math.max(fieldConfidences.roleTitle, fallback.fieldConfidences.roleTitle),
          salaryRange: Math.max(fieldConfidences.salaryRange, fallback.fieldConfidences.salaryRange),
          isExecutive: Math.max(fieldConfidences.isExecutive, fallback.fieldConfidences.isExecutive),
        },
        parseMethod: confidence > fallback.confidence ? "llm" : "fallback_keywords",
      };
    }

    // No fallback text, return LLM result with low confidence
    return {
      ...llmResult,
      confidence,
      fieldConfidences,
      parseMethod: "llm",
    };
  } catch {
    // LLM failed entirely, use fallback if available
    if (textFallback) {
      return extractWithFallback(textFallback);
    }

    // No fallback, return empty with zero confidence
    return {
      partnerName: null,
      partnerTitle: null,
      company: null,
      roleTitle: null,
      salaryRange: null,
      salaryMinUsd: null,
      isExecutive: false,
      contactNote: null,
      confidence: 0,
      fieldConfidences: {
        partnerName: 0,
        partnerTitle: 0,
        company: 0,
        roleTitle: 0,
        salaryRange: 0,
        isExecutive: 0,
      },
      parseMethod: "fallback_keywords",
    };
  }
}
