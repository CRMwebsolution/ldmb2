"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Race } from "@/lib/supabase/types";
import {
  Flag,
  Trophy,
  Truck,
  Building,
  FileText,
  Plus,
  ArrowRight,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [counts, setCounts] = useState({
    races: 0,
    catalog: 0,
    results: 0,
    sponsors: 0,
    rules: 0,
  });
  const [recentRaces, setRecentRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [racesRes, catalogRes, resultsRes, sponsorsRes, rulesRes] = await Promise.all([
          supabase.from("races").select("*", { count: "exact" }).order("date", { ascending: false }),
          supabase.from("class_catalog").select("*", { count: "exact" }),
          supabase.from("results").select("*", { count: "exact" }),
          supabase.from("sponsors").select("*", { count: "exact" }),
          supabase.from("class_catalog").select("id", { count: "exact" }).not("rules", "is", null),
        ]);

        setCounts({
          races: racesRes.count || 0,
          catalog: catalogRes.count || 0,
          results: resultsRes.count || 0,
          sponsors: sponsorsRes.count || 0,
          rules: rulesRes.count || 0,
        });

        if (racesRes.data) {
          setRecentRaces(racesRes.data.slice(0, 5));
        }
      } catch (err) {
        console.error("Error loading admin overview stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const statCards = [
    { label: "Race Nights", count: counts.races, href: "/admin/races", icon: Flag, desc: "Scheduled & past races" },
    { label: "Contestant Passes", count: counts.results, href: "/admin/results", icon: Trophy, desc: "Logged times & passes" },
    { label: "Master Classes", count: counts.catalog, href: "/admin/classes", icon: Truck, desc: "In class catalog" },
    { label: "Class Rules", count: counts.rules, href: "/admin/classes", icon: FileText, desc: "Posted in the catalog" },
    { label: "Sponsors", count: counts.sponsors, href: "/admin/sponsors", icon: Building, desc: "Active & tiers" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
            Overview of Little Doo database tables, race night configurations, and live scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/races"
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            <Plus className="w-3.5 h-3.5" /> New Race
          </Link>
          <Link
            href="/admin/results"
            className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <Trophy className="w-3.5 h-3.5" /> Log Passes
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border p-4 transition-all hover:border-amber-600/50 hover:scale-[1.02] flex flex-col justify-between"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                  style={{ background: "rgba(180,83,9,0.12)", color: "var(--primary)" }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: "var(--muted-fg)" }} />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                  {loading ? "..." : card.count}
                </div>
                <div className="text-xs font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
                  {card.label}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted-fg)" }}>
                  {card.desc}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Action Workflows */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 className="text-base font-black tracking-tight mb-4" style={{ color: "var(--foreground)" }}>
          Quick Management Workflows
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/admin/races"
            className="p-4 rounded-xl border flex flex-col justify-between transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ background: "var(--muted)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-1" style={{ color: "var(--foreground)" }}>
                <Flag className="w-4 h-4 text-amber-600" /> 1. Manage Race Night
              </div>
              <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                Schedule a new date and select which classes from the catalog will run on that night.
              </p>
            </div>
            <span className="mt-3 text-xs font-bold text-amber-600 flex items-center gap-1">
              Configure Race <ArrowRight className="w-3 h-3" />
            </span>
          </Link>

          <Link
            href="/admin/results"
            className="p-4 rounded-xl border flex flex-col justify-between transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ background: "var(--muted)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-1" style={{ color: "var(--foreground)" }}>
                <Trophy className="w-4 h-4 text-amber-600" /> 2. Log Passes
              </div>
              <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                Enter driver names, 1st &amp; 2nd pass times, fastest runs, and publish live results.
              </p>
            </div>
            <span className="mt-3 text-xs font-bold text-amber-600 flex items-center gap-1">
              Open Pass Logger <ArrowRight className="w-3 h-3" />
            </span>
          </Link>

          <Link
            href="/admin/classes"
            className="p-4 rounded-xl border flex flex-col justify-between transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ background: "var(--muted)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-1" style={{ color: "var(--foreground)" }}>
                <Truck className="w-4 h-4 text-amber-600" /> 3. Class Catalog &amp; Rules
              </div>
              <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                Add new classes, adjust technical rules, entry fees, and scoring modes.
              </p>
            </div>
            <span className="mt-3 text-xs font-bold text-amber-600 flex items-center gap-1">
              Edit Catalog <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </div>

      {/* Recent Races Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2 className="text-base font-black tracking-tight" style={{ color: "var(--foreground)" }}>
              Recent Race Nights
            </h2>
            <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
              Status and publication state of recent events
            </p>
          </div>
          <Link
            href="/admin/races"
            className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
          >
            All Races <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {recentRaces.map((race) => (
            <div
              key={race.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
                  style={{ background: "var(--muted)", color: "var(--primary)" }}
                >
                  {new Date(race.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                    {race.name} Race
                    {race.special_label && (
                      <span className="ml-2 text-xs font-semibold text-amber-600">
                        ({race.special_label})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                    Status: <span className="font-semibold capitalize">{race.event_status}</span> · Schedule: {race.show_on_schedule ? "Visible" : "Hidden"} · Results: {race.published ? "Published" : "Draft"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/results`}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  Passes
                </Link>
                <Link
                  href={`/admin/races`}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "var(--muted)", color: "var(--primary)" }}
                >
                  Edit Race
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
