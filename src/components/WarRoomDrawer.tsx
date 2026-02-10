"use client";

import { useState } from "react";
import type { SignalWithStakeholders } from "@/types";
import { X, Send, UserPlus, User, Briefcase, Link2, Loader2 } from "lucide-react";
import { mockWarRoomSummary } from "@/data/mock-signals";
import { LiveTraceBar } from "@/components/LiveTraceBar";
import { getPersonaForStakeholder, PERSONA_LABELS } from "@/lib/ghost-write/personas";
import type { StakeholderType } from "@/types";

interface WarRoomDrawerProps {
  signal: SignalWithStakeholders | null;
  onClose: () => void;
}

export function WarRoomDrawer({ signal, onClose }: WarRoomDrawerProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [draftPersona, setDraftPersona] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);

  if (!signal) return null;

  const summary = signal.parsed_summary
    ? `${mockWarRoomSummary}\n\nParsed JD: ${signal.parsed_summary}`
    : mockWarRoomSummary;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-primary/20 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-lg border-l border-gray-200 bg-surface shadow-xl overflow-y-auto"
        aria-label="War Room"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-surface px-4 py-3">
          <h2 className="text-lg font-semibold text-primary">War Room</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-4">
          <section>
            <LiveTraceBar
              demo={true}
              signalHeadline={signal.headline}
              bridgeName={signal.bridges?.[0]?.name}
              overlapPct={signal.bridges?.[0]?.rss_score != null ? Math.round(signal.bridges[0].rss_score) : undefined}
              persona={signal.recruiter ? PERSONA_LABELS[getPersonaForStakeholder(signal.recruiter.type, signal.recruiter.origin)].label : PERSONA_LABELS.peer.label}
            />
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <Briefcase className="h-4 w-4" />
              Role
            </h3>
            <p className="font-medium text-primary">{signal.headline}</p>
            <p className="text-sm text-gray-600">
              {signal.company} · {signal.hub}, {signal.region}
            </p>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              AI Summary
            </h3>
            <p className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-primary">
              {summary}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Drafting logic: Hiring Manager → Peer (pain relief). Recruiter → Partner (placement ease). Bridge → Nostalgia &amp; value.
            </p>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <Link2 className="h-4 w-4" />
              Stakeholder Map
            </h3>
            <StakeholderMap signal={signal} />
          </section>

          <section className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={draftLoading}
              onClick={async () => {
                setDraftLoading(true);
                setDraft(null);
                setDraftPersona(null);
                const stakeholder = signal.recruiter ?? signal.hiring_manager;
                const stakeholderType: StakeholderType = stakeholder?.type ?? "hiring_manager";
                const origin = stakeholder?.type === "recruiter" ? (stakeholder as { origin?: string }).origin : undefined;
                try {
                  const res = await fetch("/api/draft-pitch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      stakeholderType,
                      origin,
                      headline: signal.headline,
                      company: signal.company,
                      hub: signal.hub,
                      region: signal.region,
                      bridgeName: signal.bridges?.[0]?.name,
                      recruiterFirm: signal.recruiter?.firm_name,
                    }),
                  });
                  const data = await res.json();
                  if (data.draft) {
                    setDraft(data.draft);
                    setDraftPersona(data.persona ?? null);
                  } else if (data.error) {
                    setDraft(`[Error: ${data.error}]`);
                  }
                } catch (e) {
                  setDraft(`[Request failed: ${e instanceof Error ? e.message : String(e)}]`);
                } finally {
                  setDraftLoading(false);
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {draftLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {draftLoading ? "Drafting…" : "Send Blueprint Pitch"}
            </button>
            {draft != null && (
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                {draftPersona && (
                  <p className="mb-2 text-xs font-semibold uppercase text-accent">{draftPersona}</p>
                )}
                <p className="whitespace-pre-wrap text-sm text-primary">{draft}</p>
              </div>
            )}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent bg-white px-4 py-3 font-medium text-accent hover:bg-accent/5"
            >
              <UserPlus className="h-4 w-4" />
              Ask for Intro
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}

function StakeholderMap({ signal }: { signal: SignalWithStakeholders }) {
  const recruiter = signal.recruiter;
  const hiringManager = signal.hiring_manager;
  const bridges = signal.bridges ?? [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Simple visual graph: HM in center, Recruiter and Bridges around */}
      <div className="flex flex-col gap-4">
        {hiringManager && (
          <div className="flex items-start gap-3 rounded border border-accent/30 bg-accent/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary">{hiringManager.name}</p>
              <p className="text-sm text-gray-600">
                {hiringManager.title}
                {hiringManager.company && ` · ${hiringManager.company}`}
              </p>
              <span className="mt-1 inline-block rounded bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                Hiring Manager
              </span>
            </div>
          </div>
        )}

        {recruiter && (
          <div className="flex items-start gap-3 rounded border border-gray-200 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary">{recruiter.name}</p>
              <p className="text-sm text-gray-600">
                {recruiter.title}
                {recruiter.firm_name && ` · ${recruiter.firm_name}`}
              </p>
              <span className="mt-1 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-primary">
                {recruiter.origin === "external" ? "External Recruiter" : "Internal HR"}
              </span>
            </div>
          </div>
        )}

        {bridges.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
              The Bridge (Top {bridges.length} by RSS)
            </p>
            <div className="space-y-2">
              {bridges.map((b, i) => (
                <div
                  key={b.id}
                  className="flex items-start gap-3 rounded border border-gray-200 p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800 font-semibold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary">{b.name}</p>
                    <p className="text-sm text-gray-600">
                      {b.title}
                      {b.company && ` · ${b.company}`}
                    </p>
                    <p className="mt-1 text-xs font-medium text-accent">
                      RSS: {b.rss_score?.toFixed(1) ?? "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
