"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, ChevronRight, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Race } from "@/lib/supabase/types";
import { formatRaceDate } from "@/lib/race-results";
import { PUBLIC_RACE_RESULTS } from "@/lib/use-public-race-results";
import { ResultsTabs } from "@/components/ResultsTabs";

export default function RaceResultsIndex() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedYears, setExpandedYears] = useState<number[]>([]);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let needsRefresh = false;

    async function load() {
      if (!active) return;
      if (inFlight) {
        needsRefresh = true;
        return;
      }
      inFlight = true;
      try {
        const { data, error } = await supabase.from("races").select("*")
          .or(PUBLIC_RACE_RESULTS).order("date", { ascending: false });
        if (error) throw error;
        if (!active) return;
        setRaces(data);
        setError("");
      } catch {
        if (active) setError("Race results could not be loaded. Please try again later.");
      } finally {
        if (active) setLoading(false);
        inFlight = false;
        if (needsRefresh) {
          needsRefresh = false;
          void load();
        }
      }
    }

    const channel = supabase.channel(`public-race-results-archive-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "races" }, load)
      .subscribe((status) => { if (status === "SUBSCRIBED") void load(); });
    void load();
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, []);

  const currentYear = new Date().getFullYear();
  const grouped = Object.entries(races.reduce<Record<string, Race[]>>((acc, race) => {
    const year = race.date.slice(0, 4);
    (acc[year] ||= []).push(race);
    return acc;
  }, {})).sort(([a], [b]) => Number(b) - Number(a));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <ResultsTabs active="archive" />
      <p className="mb-6" style={{ color: "var(--muted-fg)" }}>Choose a race to see results by class.</p>
      {loading ? <p>Loading races...</p> : error ? <p role="alert">{error}</p> : races.length === 0 ? <p>No race results are available yet.</p> : (
        <div className="space-y-8">
          {grouped.map(([year, yearRaces]) => {
            const open = Number(year) === currentYear
              ? !expandedYears.includes(Number(year))
              : expandedYears.includes(Number(year));
            return <section key={year} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <button type="button" className="w-full flex justify-between items-center p-5 text-left" aria-expanded={open}
                onClick={() => setExpandedYears((prev) => prev.includes(Number(year)) ? prev.filter((y) => y !== Number(year)) : [...prev, Number(year)])}>
                <span className="text-xl font-black">{year} Results <span className="text-sm font-normal" style={{ color: "var(--muted-fg)" }}>({yearRaces.length})</span></span>
                {open ? <ChevronDown /> : <ChevronRight />}
              </button>
              {open && <div className="border-t p-4 grid gap-3" style={{ borderColor: "var(--border)" }}>
                {yearRaces.map((race) => <Link key={race.id} href={`/race-results/${race.slug || race.id}`}
                  className="flex items-center gap-3 rounded-xl border p-4 hover:border-amber-600 transition-colors" style={{ borderColor: "var(--border)" }}>
                  <Trophy className="w-5 h-5 shrink-0" style={{ color: "var(--primary)" }} />
                  <span className="font-bold">{race.name}</span>
                  {!race.published && <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Live</span>}
                  <span className="ml-auto text-sm flex items-center gap-1" style={{ color: "var(--muted-fg)" }}><Calendar className="w-4 h-4" />{formatRaceDate(race.date)}</span>
                </Link>)}
              </div>}
            </section>;
          })}
        </div>
      )}
    </div>
  );
}
