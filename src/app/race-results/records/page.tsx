"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, RefreshCw, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Race, RaceClass, RaceResult } from "@/lib/supabase/types";
import { buildRaceRecords } from "@/lib/race-records";
import { formatRaceDate } from "@/lib/race-results";
import { ResultsTabs } from "@/components/ResultsTabs";

type RecordsData = { races: Race[]; classes: RaceClass[]; results: RaceResult[] };

// PostgREST caps response rows. Paginate each table so older records stay visible.
async function fetchRecords(): Promise<RecordsData> {
  const races: Race[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from("races").select("*")
      .eq("published", true).order("date", { ascending: false }).range(start, start + 999);
    if (error) throw error;
    races.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const classes: RaceClass[] = [];
  for (let i = 0; i < races.length; i += 75) {
    const ids = races.slice(i, i + 75).map((race) => race.id);
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("classes").select("*")
        .in("race_id", ids).order("id").range(start, start + 999);
      if (error) throw error;
      classes.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
  }

  const results: RaceResult[] = [];
  for (let i = 0; i < classes.length; i += 75) {
    const ids = classes.slice(i, i + 75).map((cls) => cls.id);
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("results").select("*")
        .in("class_id", ids).order("id").range(start, start + 999);
      if (error) throw error;
      results.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
  }
  return { races, classes, results };
}

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordsData | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRecords().then((data) => {
      if (!active) return;
      setRecords(data);
      setError("");
    }).catch(() => {
      if (active) setError("Records could not be loaded. Please try again.");
    }).finally(() => {
      if (active) setRefreshing(false);
    });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") setRevision((current) => current + 1);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const years = [...new Set((records?.races || []).map((race) => Number(race.date.slice(0, 4))))]
    .filter(Number.isFinite).sort((a, b) => b - a);
  const classes = records ? buildRaceRecords(records.races, records.classes, records.results, year) : [];
  const timedClasses = classes.filter((cls) => cls.entries.length > 0).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <ResultsTabs active="records" />
      <div className="flex flex-wrap gap-4 items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black">Class Records</h2>
          <p className="mt-2" style={{ color: "var(--muted-fg)" }}>Fastest passes and smallest differences between two passes, by class and year.</p>
        </div>
        <button type="button" onClick={() => { setRefreshing(true); setRevision((current) => current + 1); }}
          disabled={refreshing} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border-l-4 p-5 mb-9" style={{ borderColor: "var(--primary)", background: "var(--muted)" }}>
        <p className="font-bold">Unofficial records</p>
        <p className="text-sm leading-relaxed mt-1" style={{ color: "var(--muted-fg)" }}>
          These times may be incomplete or inaccurate and are not guaranteed to be 100% accurate. They include only times entered since the website tracking system began. Earlier races and unrecorded passes are not included. Distances and disqualifications do not count as timed records. Consistency records require two valid timed passes; the smallest difference wins.
        </p>
      </div>

      {!records && !error && <p role="status">Loading records...</p>}
      {error && <p role="alert" className="mb-6">{error}</p>}
      {records && <>
        <nav className="flex flex-wrap gap-2 mb-5" aria-label="Record period">
          {[null, ...years].map((option) => (
            <button key={option ?? "all"} type="button" aria-pressed={year === option} onClick={() => setYear(option)}
              className="px-4 py-2 rounded-full text-sm font-semibold border transition-colors"
              style={{ borderColor: year === option ? "var(--primary)" : "var(--border)", background: year === option ? "var(--primary)" : "var(--surface)", color: year === option ? "var(--primary-fg)" : "var(--foreground)" }}>
              {option ?? "All time"}
            </button>
          ))}
        </nav>
        <p className="text-sm mb-6" style={{ color: "var(--muted-fg)" }}>
          {timedClasses} of {classes.length} class categories have a qualifying record for {year ?? "all time"}. Best pass classes use each entry’s fastest time; consistency classes use the difference between both timed passes. Updates automatically while this page is open.
        </p>
        {classes.length === 0 ? <p>No classes have been published for this period yet.</p> : (
          <div className="grid gap-5 lg:grid-cols-2">
            {classes.map((cls) => {
              const best = cls.entries[0];
              return <section key={cls.key} className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <h2 className="font-black text-xl flex gap-2 items-center"><Trophy className="w-5 h-5 shrink-0" style={{ color: "var(--primary)" }} />{cls.name}</h2>
                <p className="text-xs font-semibold uppercase tracking-wide mt-2" style={{ color: "var(--muted-fg)" }}>{cls.kind === "consistency" ? "Smallest two-pass difference" : "Fastest pass"}</p>
                {best ? <>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <strong className="text-4xl font-black tabular-nums" style={{ color: "var(--primary)" }}>{best.seconds.toFixed(3)}<span className="text-base ml-1">sec{cls.kind === "consistency" ? " difference" : ""}</span></strong>
                    <span className="font-semibold">{best.racerName}</span>
                  </div>
                  <Link className="inline-flex items-center gap-1 text-sm mt-2 hover:underline" style={{ color: "var(--muted-fg)" }} href={`/race-results/${best.raceSlug || best.raceId}`}>
                    {best.raceName} · {formatRaceDate(best.raceDate)} <ArrowUpRight className="w-4 h-4" />
                  </Link>
                  {cls.entries.length > 1 && <details className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                    <summary className="cursor-pointer text-sm font-semibold">See top {Math.min(10, cls.entries.length)} {cls.kind === "consistency" ? "differences" : "recorded entries"}</summary>
                    <ol className="mt-4 space-y-3">
                      {cls.entries.slice(0, 10).map((entry, index) => <li key={entry.resultId} className="grid grid-cols-[2rem_1fr_auto] gap-2 text-sm items-start">
                        <span style={{ color: "var(--muted-fg)" }}>{index + 1}.</span>
                        <span><span className="font-semibold">{entry.racerName}</span><br />
                          <Link className="hover:underline text-xs" style={{ color: "var(--muted-fg)" }} href={`/race-results/${entry.raceSlug || entry.raceId}`}>{entry.raceName} · {formatRaceDate(entry.raceDate)}</Link>
                        </span>
                        <span className="font-bold tabular-nums">{entry.seconds.toFixed(3)}s{cls.kind === "consistency" ? " diff." : ""}</span>
                      </li>)}
                    </ol>
                  </details>}
                </> : <p className="mt-5 flex items-center gap-2 text-sm" style={{ color: "var(--muted-fg)" }}><Clock3 className="w-4 h-4" /> {cls.kind === "consistency" ? "No pair of timed passes" : "No timed pass"} recorded for this class in this period.</p>}
              </section>;
            })}
          </div>
        )}
      </>}
    </div>
  );
}
