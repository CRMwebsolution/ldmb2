"use client";

import { useState } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message);
      } else {
        router.push("/admin");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="rounded-2xl border p-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color: "var(--foreground)" }}>
            Already Signed In
          </h2>
          <p className="text-xs mb-6" style={{ color: "var(--muted-fg)" }}>
            Signed in as <span className="font-semibold">{user.email}</span>
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            Go to Admin Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div
        className="rounded-2xl border p-6 sm:p-8 shadow-sm"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "rgba(180,83,9,0.12)", color: "var(--primary)" }}
          >
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Race Official Login
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted-fg)" }}>
            Sign in with your Supabase account to manage races, log passes, and update classes.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-widest mb-1.5"
              style={{ color: "var(--muted-fg)" }}
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-fg)" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@littledoomudbog.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none focus:border-amber-600 transition-colors"
                style={{
                  background: "var(--muted)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-bold uppercase tracking-widest mb-1.5"
              style={{ color: "var(--muted-fg)" }}
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-fg)" }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none focus:border-amber-600 transition-colors"
                style={{
                  background: "var(--muted)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {loading ? "Authenticating..." : "Sign In to Admin"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-[11px]" style={{ color: "var(--muted-fg)" }}>
            Secured via Supabase Authentication &amp; RLS policies.
          </p>
        </div>
      </div>
    </div>
  );
}
