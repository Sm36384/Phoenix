/**
 * OTLP tracing wrapper for observability.
 * Wraps key operations (cron, healing, AI calls, scraper runs) with spans.
 */

import { phoenixFlush } from "./phoenix-trace";

export interface SpanContext {
  name: string;
  attributes?: Record<string, string | number | boolean>;
  parentSpanId?: string;
}

/**
 * Create a span for an async operation.
 * Automatically records duration and errors.
 */
export async function withSpan<T>(
  context: SpanContext,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const spanId = `span_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    // Log span (in production, this would send to OTLP collector)
    console.log(`[OTLP Span] ${context.name}`, {
      spanId,
      duration,
      attributes: context.attributes,
      status: "success",
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[OTLP Span] ${context.name}`, {
      spanId,
      duration,
      attributes: context.attributes,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  } finally {
    // Flush traces periodically (in production, batch and send to Phoenix)
    await phoenixFlush();
  }
}

/**
 * Create a child span within a parent operation.
 */
export async function withChildSpan<T>(
  parentSpanId: string,
  context: SpanContext,
  operation: () => Promise<T>
): Promise<T> {
  return withSpan(
    {
      ...context,
      parentSpanId,
    },
    operation
  );
}

/**
 * Record an event (non-blocking operation).
 */
export function recordEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
  console.log(`[OTLP Event] ${name}`, attributes);
  // In production, send to OTLP collector
}
