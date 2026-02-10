"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Activity, LogOut, Settings } from "lucide-react";

export function AuthHeader() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, [!!supabase]);

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
  }

  return (
    <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
      <div className="flex items-center">
        <Activity className="mr-2 h-6 w-6 text-accent" />
        <h1 className="text-xl font-semibold text-primary">
          Transformation Pulse Global
        </h1>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <Link
            href="/settings/history"
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1.5 text-sm text-primary hover:bg-gray-100"
          >
            <Settings className="h-4 w-4" />
            History
          </Link>
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1.5 text-sm text-primary hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
