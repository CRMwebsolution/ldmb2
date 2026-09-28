"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  buildRacerLeaderboard, fetchHistoryRows, filterRacerLeaderboardByYear,
  getRacerLeaderboardYears, type EstimatedRacerSummary,
} from "@/lib/estimated-racer-history";

export default function RacerEstimatesPage() {
  const [racers, setRacers] = useState<EstimatedRacerSummary[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchHistoryRows(supabase).then((rows) => {
      if (!active) return;
      const summary = buildRacerLeaderboard(rows);
      setRacers(summary);
      setYear(getRacerLeaderboardYears(summary)[0] ?? null);
    }).catch((reason) => {
      console.error("Racer history failed", reason);
      if (active) setError("Racer history could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const years = getRacerLeaderboardYears(racers);
  const shown = year === null ? racers : filterRacerLeaderboardByYear(racers, year);
  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black">Estimated Racer History</h1>
      <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>Counts distinct race nights per racer. Name matching is an estimate because historic entries have no racer ID. Foot Runners are excluded.</p>
    </div>
    {loading ? <p>Loading racer history...</p> : error ? <p role="alert">{error}</p> : <>
      <label className="block text-sm font-bold">Season
        <select className="block mt-1 rounded-lg border p-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          value={year ?? "all"} onChange={(event) => setYear(event.target.value === "all" ? null : Number(event.target.value))}>
          <option value="all">All years</option>
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {shown.length === 0 ? <p className="p-5">No racer entries found.</p> : shown.map((racer, index) => <details key={racer.key} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
          <summary className="cursor-pointer p-4 flex justify-between gap-3">
            <span className="font-bold">{index + 1}. {racer.displayName}</span>
            <span className="font-mono text-sm">{racer.totalEvents} {racer.totalEvents === 1 ? "race" : "races"}</span>
          </summary>
          <div className="px-4 pb-4 text-sm" style={{ color: "var(--muted-fg)" }}>
            {racer.recordedNames.length > 1 && <p>Recorded as: {racer.recordedNames.join(", ")}</p>}
            {racer.classes.map((cls) => <p key={cls.className}>{cls.className}: {cls.events.length} {cls.events.length === 1 ? "event" : "events"}</p>)}
          </div>
        </details>)}
      </div>
    </>}
  </div>;
}
