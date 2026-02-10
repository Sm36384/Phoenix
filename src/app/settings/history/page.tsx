"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MyHistory } from "@/types/integrations";
import { anonymizedHistoryToPromptSummary } from "@/lib/privacy/anonymize-history";

const defaultHistory: MyHistory = {
  person: { name: "", linkedin_url: null },
  positions: [],
};

export default function HistoryPage() {
  const [history, setHistory] = useState<MyHistory>(defaultHistory);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fn = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
      setLoading(false);
    };
    fn();
  }, [supabase]);

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(history),
    });
    setSaving(false);
    if (res.ok) setMessage("Saved.");
    else setMessage("Save failed.");
  }

  function addPosition() {
    setHistory((h) => ({
      ...h,
      positions: [
        ...h.positions,
        {
          company: "",
          company_normalized: "",
          title: "",
          start_date: "",
          end_date: "",
          overlap_years: 0,
        },
      ],
    }));
  }

  function updatePosition(i: number, field: keyof MyHistory["positions"][number], value: string | number) {
    setHistory((h) => ({
      ...h,
      positions: h.positions.map((p, j) =>
        j === i ? { ...p, [field]: value, company_normalized: field === "company" ? String(value).toLowerCase().replace(/\s+/g, "_") : p.company_normalized } : p
      ),
    }));
  }

  function removePosition(i: number) {
    setHistory((h) => ({ ...h, positions: h.positions.filter((_, j) => j !== i) }));
  }

  if (loading) return <div className="p-6">Loading…</div>;

  if (!supabase) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-primary">Professional History</h1>
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Sign-in is not configured. Add <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="text-xs">.env</code> to save history here.
        </p>
      </div>
    );
  }

  const summary = anonymizedHistoryToPromptSummary(history);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-primary">Professional History</h1>
      <p className="mb-4 text-sm text-gray-600">
        Used for Bridge overlap and anonymized prompts only. Never sent as raw PII to the LLM.
      </p>
      <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
        <strong>Anonymized summary (what the LLM sees):</strong>
        <p className="mt-1">{summary}</p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-primary">Name (optional)</label>
        <input
          type="text"
          value={history.person?.name ?? ""}
          onChange={(e) => setHistory((h) => ({ ...h, person: { ...h.person, name: e.target.value } }))}
          className="mt-1 w-full rounded border border-gray-200 px-3 py-2"
        />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary">Positions</h2>
        <button
          type="button"
          onClick={addPosition}
          className="rounded bg-accent px-3 py-1 text-sm text-white hover:bg-accent-hover"
        >
          Add
        </button>
      </div>
      <div className="space-y-4">
        {history.positions.map((p, i) => (
          <div key={i} className="rounded border border-gray-200 bg-white p-4">
            <div className="grid gap-2 text-sm">
              <input
                placeholder="Company"
                value={p.company}
                onChange={(e) => updatePosition(i, "company", e.target.value)}
                className="rounded border border-gray-200 px-2 py-1"
              />
              <input
                placeholder="Title"
                value={p.title ?? ""}
                onChange={(e) => updatePosition(i, "title", e.target.value)}
                className="rounded border border-gray-200 px-2 py-1"
              />
              <div className="flex gap-2">
                <input
                  placeholder="Start (YYYY-MM)"
                  value={p.start_date}
                  onChange={(e) => updatePosition(i, "start_date", e.target.value)}
                  className="rounded border border-gray-200 px-2 py-1"
                />
                <input
                  placeholder="End (YYYY-MM)"
                  value={p.end_date}
                  onChange={(e) => updatePosition(i, "end_date", e.target.value)}
                  className="rounded border border-gray-200 px-2 py-1"
                />
              </div>
              <input
                type="number"
                step="0.5"
                placeholder="Overlap years"
                value={p.overlap_years ?? ""}
                onChange={(e) => updatePosition(i, "overlap_years", e.target.value ? parseFloat(e.target.value) : 0)}
                className="w-24 rounded border border-gray-200 px-2 py-1"
              />
              <button
                type="button"
                onClick={() => removePosition(i)}
                className="text-left text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-accent px-4 py-2 text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </div>
  );
}
