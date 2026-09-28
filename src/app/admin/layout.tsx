"use client";

import { useAuth } from "@/lib/supabase/auth-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Flag,
  Trophy,
  Truck,
  FileText,
  Building,
  LogOut,
  LogIn,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/races", label: "Race Nights", icon: Flag },
  { href: "/admin/results", label: "Log Passes & Results", icon: Trophy },
  { href: "/admin/classes", label: "Class Catalog", icon: Truck },
  { href: "/admin/rules", label: "Rules Book", icon: FileText },
  { href: "/admin/sponsors", label: "Sponsors", icon: Building },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, signIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login form state for quick inline login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    const { error } = await signIn(loginEmail, loginPass);
    if (error) {
      setLoginError(error.message);
    }
    setLoggingIn(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Admin Bar */}
      <div
        className="border-b px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3 sticky top-16 z-30"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border"
            style={{ borderColor: "var(--border)" }}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-md"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              ADMIN
            </span>
            <span className="font-bold text-sm hidden sm:inline" style={{ color: "var(--foreground)" }}>
              Little Doo Management Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold flex items-center gap-1 hover:underline"
            style={{ color: "var(--muted-fg)" }}
          >
            View Live Site <ExternalLink className="w-3 h-3" />
          </Link>
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium hidden md:inline" style={{ color: "var(--muted-fg)" }}>
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/admin/login"
              className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              <LogIn className="w-3.5 h-3.5" /> Admin Login
            </Link>
          )}
        </div>
      </div>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
        {/* Sidebar Nav */}
        <aside
          className={`md:w-60 shrink-0 ${
            mobileMenuOpen ? "block" : "hidden md:block"
          }`}
        >
          <div
            className="rounded-2xl border p-3 sticky top-32 space-y-1"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-2"
              style={{ color: "var(--muted-fg)" }}
            >
              Management
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: isActive ? "var(--muted)" : "transparent",
                    color: isActive ? "var(--primary)" : "var(--foreground)",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Admin Content Area */}
        <main className="flex-1 min-w-0">
          {!user && !loading && (
            <div
              className="mb-6 rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-amber-600/30 bg-amber-500/10"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                    Admin Authentication Required for Database Mutations
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-fg)" }}>
                    You can view data, but editing or adding races, passes, and classes requires logging in with your Supabase credentials.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/login"
                className="shrink-0 px-4 py-2 text-xs font-bold rounded-lg"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                Sign In Now
              </Link>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
