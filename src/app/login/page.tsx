"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMessage("Sign-in is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMessage("Sign-in is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env");
      return;
    }
    if (!email) {
      setMessage("Email required.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          shouldCreateUser: true,
        }
      });
      if (error) {
        setMessage(error.message);
        console.error("Sign up error:", error);
      } else {
        setMessage("Check your email for the sign-up link.");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
      console.error("Sign up exception:", err);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMessage("Sign-in is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env");
      return;
    }
    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        }
      });
      if (error) {
        setMessage(error.message);
        console.error("Magic link error:", error);
      } else {
        setMessage("Check your email for the login link.");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
      console.error("Magic link exception:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-primary">
          Transformation Pulse Global
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Sign in to access the dashboard.
        </p>
        {!supabase && (
          <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Auth is not configured. Add <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="text-xs">.env</code> to enable sign-in.
          </p>
        )}
        <form onSubmit={signInWithMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-primary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-primary"
              required
              placeholder="your@email.com"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.includes("Check your email") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading || !supabase || !email}
              className="flex-1 rounded bg-accent py-2 font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "Sending…" : "Sign in with Magic Link"}
            </button>
            <button
              type="button"
              onClick={signUp}
              disabled={loading || !supabase || !email}
              className="rounded border border-gray-200 px-3 py-2 text-sm text-primary hover:bg-gray-50 disabled:opacity-60"
            >
              Sign up
            </button>
          </div>
          {password && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs text-gray-500">Or sign in with password:</p>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-primary">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-primary"
                />
              </div>
              <button
                type="button"
                onClick={signInWithPassword}
                disabled={loading || !supabase || !email || !password}
                className="mt-2 w-full rounded border border-gray-200 px-3 py-2 text-sm text-primary hover:bg-gray-50 disabled:opacity-60"
              >
                Sign in with Password
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
