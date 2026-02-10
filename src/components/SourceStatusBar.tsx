"use client";

import { useMemo } from "react";
import { CheckCircle2, Loader2, RefreshCw, Wifi } from "lucide-react";
import type { ScrapeSource, SourceStatus } from "@/types/integrations";

interface SourceStatusBarProps {
  sources: ScrapeSource[];
}

const statusConfig: Record<
  SourceStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  ok: {
    label: "Standard",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  healing: {
    label: "Healing",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  healed: {
    label: "Healed",
    color: "text-accent",
    bg: "bg-accent/10",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
  },
};

export function SourceStatusBar({ sources }: SourceStatusBarProps) {
  const list = useMemo(() => sources, [sources]);

  if (list.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Wifi className="h-3.5 w-3.5" />
        Sources
      </span>
      {list.map((s) => {
        const config = statusConfig[s.status];
        return (
          <span
            key={s.id}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color} ${config.bg}`}
            title={`${s.display_name}: ${config.label}${s.last_heal_at ? ` (healed)` : ""}`}
          >
            {config.icon}
            {s.display_name}
          </span>
        );
      })}
      <span className="text-xs text-gray-400">
        Green = OK · Orange = Healing · Blue = Healed
      </span>
    </div>
  );
}
