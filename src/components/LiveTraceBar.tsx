"use client";

import { useState, useEffect } from "react";
import { Radio } from "lucide-react";

export type LiveTraceStep =
  | { id: "identifying"; text: string }
  | { id: "connection"; text: string; name?: string; overlap?: number }
  | { id: "drafting"; text: string; persona?: string }
  | { id: "ready"; text: string };

interface LiveTraceBarProps {
  signalHeadline?: string;
  bridgeName?: string;
  overlapPct?: number;
  persona?: string;
  /** When true, run a short demo sequence. */
  demo?: boolean;
}

const DEMO_STEPS: LiveTraceStep[] = [
  { id: "identifying", text: "Identifying target..." },
  { id: "connection", text: "Found connection", name: "Vikas P.", overlap: 92 },
  {
    id: "drafting",
    text: "Drafting pitch referencing Riyadh Vision 2030...",
    persona: "Peer (Hiring Manager)",
  },
  { id: "ready", text: "Ready to send." },
];

export function LiveTraceBar({
  signalHeadline,
  bridgeName,
  overlapPct,
  persona,
  demo = true,
}: LiveTraceBarProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<LiveTraceStep[]>(DEMO_STEPS);

  useEffect(() => {
    if (!demo) {
      const custom: LiveTraceStep[] = [
        { id: "identifying", text: "Identifying target..." },
        {
          id: "connection",
          text: bridgeName ? `Found connection: ${bridgeName}` : "Found connection",
          name: bridgeName,
          overlap: overlapPct,
        },
        {
          id: "drafting",
          text: persona
            ? `Drafting '${persona}' pitch${signalHeadline ? ` for role` : ""}...`
            : "Drafting pitch...",
          persona,
        },
        { id: "ready", text: "Ready to send." },
      ];
      setSteps(custom);
      return;
    }

    const interval = setInterval(() => {
      setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, 2200);
    return () => clearInterval(interval);
  }, [demo, bridgeName, overlapPct, persona, signalHeadline, steps.length]);

  const current = steps[stepIndex];
  const displayText =
    current?.id === "connection" && (current as { name?: string; overlap?: number }).name
      ? `Found connection: ${(current as { name?: string; overlap?: number }).name}${(current as { overlap?: number }).overlap != null ? ` (${(current as { overlap?: number }).overlap}% overlap)` : ""}...`
      : current?.text ?? "";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm">
      <Radio className="h-4 w-4 shrink-0 text-accent" aria-hidden />
      <span className="font-medium text-primary">Live Trace:</span>
      <span className="text-gray-700">{displayText}</span>
    </div>
  );
}
