"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, ChevronRight, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Race } from "@/lib/supabase/types";
import { formatRaceDate } from "@/lib/race-results";

export default function RaceResultsIndex() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedYears, setExpandedYears] = useState<number[]>([]);

  useEffect(() => {
    let active = true;
    supabase.from("races").select("*").eq("published", true).order("date", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("Race results could not be loaded. Please try again later.");
        else setRaces(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const currentYear = new Date().getFullYear();
  const grouped = Object.entries(races.reduce<Record<string, Race[]>>((acc, race) => {
    const year = race.date.slice(0, 4);
    (acc[year] ||= []).push(race);
    return acc;
  }, {})).sort(([a], [b]) => Number(b) - Number(a));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>Official results</span>
        <h1 className="text-4xl sm:text-5xl font-black mt-2">Race Results</h1>
        <p className="mt-2" style={{ color: "var(--muted-fg)" }}>Choose a race to see its results by class.</p>
        <Link href="/records" className="inline-flex items-center mt-4 font-semibold text-sm hover:underline" style={{ color: "var(--primary)" }}>See class records →</Link>
      </div>
      {loading ? <p>Loading races...</p> : error ? <p role="alert">{error}</p> : races.length === 0 ? <p>No results have been published yet.</p> : (
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
