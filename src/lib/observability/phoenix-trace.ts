/**
 * Arize Phoenix tracing.
 * Log every reasoning step for audit. Exports to OTLP/Phoenix when PHOENIX_COLLECTOR_URL set.
 */

import { exportSpansToPhoenix } from "./phoenix-export";

export type TraceSpan = {
  name: string;
  attributes?: Record<string, string | number | boolean>;
  startTime?: number;
  endTime?: number;
};

const traceBuffer: TraceSpan[] = [];
const MAX_BUFFER = 100;

export function phoenixTrace(
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  const span: TraceSpan = {
    name,
    attributes,
    startTime: Date.now(),
  };
  traceBuffer.push(span);
  if (traceBuffer.length > MAX_BUFFER) traceBuffer.shift();
}

export function phoenixTraceEnd(name: string, attributes?: Record<string, string | number | boolean>): void {
  const span = traceBuffer.find((s) => s.name === name);
  if (span) {
    span.endTime = Date.now();
    if (attributes) span.attributes = { ...span.attributes, ...attributes };
  }
}

/** Flush buffer to Phoenix/OTLP collector (call periodically or on shutdown). */
export async function phoenixFlush(): Promise<void> {
  if (traceBuffer.length === 0) return;
  const toSend = traceBuffer.splice(0, traceBuffer.length);
  await exportSpansToPhoenix(toSend);
}

export function phoenixTraceFailure(
  sourceId: string,
  reason: string,
  details?: Record<string, unknown>
): void {
  phoenixTrace("heal_failure", {
    source_id: sourceId,
    reason,
    ...(details as Record<string, string | number | boolean>),
  });
}

/** For dashboard: get recent trace summary (in production, query Arize Phoenix). */
export function getRecentTraces(): TraceSpan[] {
  return traceBuffer.slice(-50);
}
