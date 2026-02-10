/**
 * Arize Phoenix / OTLP export.
 * When PHOENIX_COLLECTOR_URL or OTEL_EXPORTER_OTLP_ENDPOINT is set, send spans.
 * Uses OTLP HTTP JSON (ExportTraceServiceRequest); compatible with Phoenix and any OTLP collector.
 */

import type { TraceSpan } from "./phoenix-trace";

const BASE =
  process.env.PHOENIX_COLLECTOR_URL ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "";

/** OTLP traces endpoint: append /v1/traces if not already present. */
function getTracesEndpoint(): string {
  if (!BASE) return "";
  const u = BASE.replace(/\/+$/, "");
  return u.endsWith("/v1/traces") ? u : `${u}/v1/traces`;
}

function getTraceId(): string {
  return "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function getSpanId(): string {
  return "xxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

/**
 * Export spans to OTLP HTTP JSON endpoint (Phoenix or any OTLP collector).
 * Payload: ExportTraceServiceRequest with resourceSpans[] and OTLP span fields.
 */
export async function exportSpansToPhoenix(
  spans: TraceSpan[],
  traceId?: string
): Promise<void> {
  const endpoint = getTracesEndpoint();
  if (!endpoint || spans.length === 0) return;

  const id = traceId ?? getTraceId();
  const resourceSpans = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "transformation-pulse-global" } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "phoenix-trace" },
            spans: spans.map((s) => ({
              traceId: id,
              spanId: getSpanId(),
              name: s.name,
              kind: 1, // SPAN_KIND_INTERNAL
              startTimeUnixNano: String(Math.round((s.startTime ?? 0) * 1e9)),
              endTimeUnixNano: String(Math.round((s.endTime ?? Date.now()) * 1e9)),
              attributes: Object.entries(s.attributes ?? {}).map(([k, v]) => ({
                key: k,
                value:
                  typeof v === "string"
                    ? { stringValue: v }
                    : typeof v === "number"
                      ? { intValue: v }
                      : { boolValue: v },
              })),
            })),
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resourceSpans),
    });
    if (!res.ok && process.env.NODE_ENV === "development") {
      console.warn("[Phoenix] OTLP export non-OK:", res.status, await res.text());
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Phoenix] OTLP export failed:", e);
    }
  }
}
