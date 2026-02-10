"use client";

import { useState, useEffect, useCallback } from "react";
import { SignalTable } from "@/components/SignalTable";
import { AuthHeader } from "@/components/AuthHeader";
import { WarRoomDrawer } from "@/components/WarRoomDrawer";
import { SourceStatusBar } from "@/components/SourceStatusBar";
import type { SignalWithStakeholders } from "@/types";
import type { ScrapeSource } from "@/types/integrations";

type IntegrationStatus = {
  supabase: boolean;
  supabaseServiceRole: boolean;
  apify: boolean;
  apollo: boolean;
  openai: boolean;
  cronSecret: boolean;
};

export default function DashboardPage() {
  const [selectedSignal, setSelectedSignal] = useState<SignalWithStakeholders | null>(null);
  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [signals, setSignals] = useState<SignalWithStakeholders[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSignals = useCallback(() => {
    setSignalsLoading(true);
    fetch(`/api/signals?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        if (data.signals && Array.isArray(data.signals)) {
          setSignals(data.signals);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages ?? 1);
          }
        } else if (Array.isArray(data)) {
          // Backward compatibility: if API returns array directly
          setSignals(data);
        } else {
          setSignals([]);
        }
      })
      .catch(() => setSignals([]))
      .finally(() => setSignalsLoading(false));
  }, [page]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  useEffect(() => {
    fetch("/api/integration-status")
      .then((r) => r.json())
      .then(setIntegrationStatus)
      .catch(() => setIntegrationStatus(null));
  }, []);

  async function handleSeed() {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) fetchSignals();
      alert(data.error ?? data.message ?? "Done.");
    } finally {
      setSeedLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-surface/95 backdrop-blur">
        <AuthHeader />
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <p className="mb-2 text-sm text-gray-600">
          Signal-driven intelligence for $1B+ digital transformation mandates · 7 hubs
        </p>

        {integrationStatus && !integrationStatus.supabase && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Using mock data. Add <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and keys to <code className="text-xs">.env</code>, run <code className="text-xs">supabase/schema.sql</code>, then sign in. See <strong>INTEGRATION.md</strong>.
          </div>
        )}
        {integrationStatus?.supabase && !signalsLoading && signals.length === 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <span>No signals in DB. Sign in to see live data.</span>
            <button
              type="button"
              onClick={handleSeed}
              disabled={seedLoading}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {seedLoading ? "Seeding…" : "Seed test data"}
            </button>
          </div>
        )}

        <div className="mb-4">
          <SourceStatusBar sources={sources} />
        </div>
        {signalsLoading ? (
          <p className="text-sm text-gray-500">Loading signals…</p>
        ) : (
          <>
            <SignalTable
              signals={signals}
              onSelectSignal={setSelectedSignal}
            />
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-gray-200 px-3 py-1.5 text-sm text-primary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded border border-gray-200 px-3 py-1.5 text-sm text-primary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <WarRoomDrawer
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
      />
    </div>
  );
}
