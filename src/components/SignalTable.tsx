"use client";

import type { SignalWithStakeholders } from "@/types";
import { Activity, MapPin, Building2, Type, Percent, Users } from "lucide-react";

const COLUMNS: { id: keyof SignalWithStakeholders | "stakeholders"; label: string; icon: React.ReactNode }[] = [
  { id: "signal_keywords", label: "Signal Pulse", icon: <Activity className="h-4 w-4" /> },
  { id: "region", label: "Region", icon: <MapPin className="h-4 w-4" /> },
  { id: "company", label: "Company", icon: <Building2 className="h-4 w-4" /> },
  { id: "headline", label: "Headline", icon: <Type className="h-4 w-4" /> },
  { id: "complexity_match_pct", label: "Complexity Match %", icon: <Percent className="h-4 w-4" /> },
  { id: "stakeholders", label: "Stakeholders", icon: <Users className="h-4 w-4" /> },
];

interface SignalTableProps {
  signals: SignalWithStakeholders[];
  onSelectSignal: (signal: SignalWithStakeholders) => void;
}

export function SignalTable({ signals, onSelectSignal }: SignalTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80 text-primary">
            {COLUMNS.map((col) => (
              <th
                key={String(col.id)}
                className="px-4 py-3 font-semibold text-primary"
              >
                <span className="flex items-center gap-2">
                  {col.icon}
                  {col.label}
                </span>
              </th>
            ))}
            <th className="w-24 px-4 py-3 font-semibold text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-100 transition-colors hover:bg-accent/5 cursor-pointer"
              onClick={() => onSelectSignal(row)}
            >
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {row.signal_keywords?.map((k) => (
                    <span
                      key={k}
                      className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
                    >
                      {k}
                    </span>
                  )) ?? "—"}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-primary">{row.region}</span>
                <span className="text-gray-500"> · {row.hub}</span>
              </td>
              <td className="px-4 py-2.5 font-medium text-primary">{row.company}</td>
              <td className="max-w-[280px] px-4 py-2.5 text-primary">
                {row.headline}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={
                    row.complexity_match_pct >= 85
                      ? "font-semibold text-green-700"
                      : row.complexity_match_pct >= 70
                        ? "font-medium text-accent"
                        : "text-gray-600"
                  }
                >
                  {row.complexity_match_pct}%
                </span>
              </td>
              <td className="px-4 py-2.5">
                <StakeholdersCell signal={row} />
              </td>
              <td className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSignal(row);
                  }}
                  className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover"
                >
                  War Room
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StakeholdersCell({ signal }: { signal: SignalWithStakeholders }) {
  const r = signal.recruiter;
  const hm = signal.hiring_manager;
  const bridgeCount = signal.bridges?.length ?? 0;
  const parts: string[] = [];
  if (r) parts.push(`Rec: ${r.name}${r.firm_name ? ` (${r.firm_name})` : ""}`);
  if (hm) parts.push(`HM: ${hm.name}`);
  if (bridgeCount) parts.push(`${bridgeCount} bridge(s)`);
  const text = parts.length ? parts.join(" · ") : "—";
  return (
    <span className="max-w-[220px] truncate text-gray-700" title={text}>
      {text}
    </span>
  );
}
