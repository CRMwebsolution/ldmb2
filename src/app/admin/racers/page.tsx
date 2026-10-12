"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Racer } from "@/lib/supabase/types";
import {
  buildRacerLeaderboard, fetchHistoryRows, filterRacerLeaderboardByYear,
  formatRaceDate, getRacerLeaderboardYears, type EstimatedRacerSummary,
} from "@/lib/estimated-racer-history";

export default function RacerHistoryPage() {
  const [identities, setIdentities] = useState<Racer[]>([]);
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({});
  const [estimated, setEstimated] = useState<EstimatedRacerSummary[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [{ data: racers, error: racerError }, historyRows, { data: linked, error: linkedError }] = await Promise.all([
        supabase.from("racers").select("*").order("display_name"),
        fetchHistoryRows(supabase),
        supabase.from("results").select("racer_id").not("racer_id", "is", null),
      ]);
      if (racerError) throw racerError;
      if (linkedError) throw linkedError;
      setIdentities(racers || []);
      const counts: Record<string, number> = {};
      (linked || []).forEach((row) => {
        if (row.racer_id) counts[row.racer_id] = (counts[row.racer_id] || 0) + 1;
      });
      setLinkedCounts(counts);
      const summary = buildRacerLeaderboard(historyRows);
      setEstimated(summary);
      setYear((current) => current ?? getRacerLeaderboardYears(summary)[0] ?? null);
    } catch (error) {
      console.error("Racer history failed", error);
      setMessage("Racer history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function addRacer(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase.from("racers").insert({ display_name: name });
    if (error) setMessage(error.code === "23505" ? "That racer identity already exists." : error.message);
    else {
      setNewName("");
      setMessage("Racer identity created. It is now available in the results editor.");
      await load();
    }
  }

  async function removeRacer(racer: Racer) {
    if (linkedCounts[racer.id]) {
      setMessage("This identity is linked to results and cannot be removed here.");
      return;
    }
    if (!confirm(`Remove the unused racer identity "${racer.display_name}"?`)) return;
    const { error } = await supabase.from("racers").delete().eq("id", racer.id);
    if (error) setMessage(error.message);
    else await load();
  }

  const years = getRacerLeaderboardYears(estimated);
  const shown = useMemo(
    () => year === null ? estimated : filterRacerLeaderboardByYear(estimated, year),
    [estimated, year],
  );

  return <div className="space-y-8">
    <header>
      <h1 className="text-2xl font-black">Racer History</h1>
      <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>Create stable racer identities, then link them explicitly in the results editor. Historic names are never merged automatically.</p>
    </header>

    {message && <p role="status" className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--border)" }}>{message}</p>}

    <section className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" style={{ color: "var(--primary)" }} /><h2 className="font-black text-lg">Verified racer identities</h2></div>
      <form onSubmit={addRacer} className="flex flex-col sm:flex-row gap-2">
        <label className="flex-1 text-sm font-bold">Display name
          <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={120} required
            className="mt-1 w-full rounded-lg border px-3 py-2" style={{ background: "var(--muted)", borderColor: "var(--border)" }} placeholder="Racer / driver name" />
        </label>
        <button disabled={!newName.trim()} className="sm:self-end rounded-lg px-4 py-2 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "var(--primary)", color: "var(--primary-fg)" }}><Plus className="w-4 h-4" /> Add identity</button>
      </form>
      {loading ? <p>Loading…</p> : identities.length === 0 ? <p className="text-sm">No verified identities yet.</p> :
        <div className="grid gap-2 sm:grid-cols-2">
          {identities.map((racer) => <div key={racer.id} className="rounded-lg border p-3 flex justify-between gap-3 items-center" style={{ borderColor: "var(--border)" }}>
            <div><p className="font-bold">{racer.display_name}</p><p className="text-xs" style={{ color: "var(--muted-fg)" }}>{linkedCounts[racer.id] || 0} linked result entries</p></div>
            <button type="button" onClick={() => removeRacer(racer)} disabled={!!linkedCounts[racer.id]} title="Remove unused identity" className="p-2 text-red-600 disabled:opacity-25"><Trash2 className="w-4 h-4" /></button>
          </div>)}
        </div>}
    </section>

    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-black">Historic estimated matches</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>Older entries without a racer ID remain an estimate based on normalized names. Link future entries explicitly; no historic record is silently rewritten.</p>
      </div>
      <label className="block text-sm font-bold max-w-xs">Season
        <select className="block mt-1 w-full rounded-lg border p-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          value={year ?? "all"} onChange={(event) => setYear(event.target.value === "all" ? null : Number(event.target.value))}>
          <option value="all">All years</option>
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {shown.length === 0 ? <p className="p-5">No historic racer entries found.</p> : shown.map((racer, index) => <details key={racer.key} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
          <summary className="cursor-pointer p-4 flex justify-between gap-3">
            <span className="font-bold">{index + 1}. {racer.displayName}</span>
            <span className="font-mono text-sm">{racer.totalEvents} {racer.totalEvents === 1 ? "race" : "races"}</span>
          </summary>
          <div className="px-4 pb-4 text-sm" style={{ color: "var(--muted-fg)" }}>
            {racer.recordedNames.length > 1 && <p>Recorded as: {racer.recordedNames.join(", ")}</p>}
            {racer.classes.map((cls) => <section key={cls.className} className="mt-3 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <h3 className="font-bold" style={{ color: "var(--foreground)" }}>{cls.className} · {cls.events.length} {cls.events.length === 1 ? "race" : "races"}</h3>
              <ul className="mt-2 space-y-2">{cls.events.map((event) => <li key={event.raceId} className="flex flex-wrap justify-between gap-x-4 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                <span>{event.raceName} <span className="text-xs">(recorded as {event.recordedNames.join(", ")})</span></span>
                <time dateTime={event.date} className="font-semibold">{formatRaceDate(event.date)}</time>
              </li>)}</ul>
            </section>)}
          </div>
        </details>)}
      </div>
    </section>
  </div>;
}
