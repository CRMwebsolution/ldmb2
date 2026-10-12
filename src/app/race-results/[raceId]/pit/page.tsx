"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Maximize2, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Race, RaceClass, RaceResult } from "@/lib/supabase/types";
import { formatPass, formatRaceDate, sortClassResults } from "@/lib/race-results";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PitClass = RaceClass & { results: RaceResult[] };

export default function PitDisplayPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [classes, setClasses] = useState<PitClass[]>([]);
  const [selected, setSelected] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const selector = UUID.test(raceId) ? "id" : "slug";
        const { data: event, error: raceError } = await supabase.from("races")
          .select("*").eq(selector, raceId).eq("published", true).maybeSingle();
        if (raceError) throw raceError;
        if (!event) { if (active) setError("Published race not found."); return; }
        const { data: raceClasses, error: classError } = await supabase.from("classes")
          .select("*").eq("race_id", event.id).order("order_num");
        if (classError) throw classError;
        const ids = (raceClasses || []).map((item) => item.id);
        const rows: RaceResult[] = [];
        for (let start = 0; ids.length; start += 1000) {
          const { data, error: resultError } = await supabase.from("results").select("*")
            .in("class_id", ids).range(start, start + 999);
          if (resultError) throw resultError;
          rows.push(...(data || []));
          if (!data || data.length < 1000) break;
        }
        if (!active) return;
        setRace(event);
        setClasses((raceClasses || []).map((item) => ({
          ...item,
          results: sortClassResults(rows.filter((row) => row.class_id === item.id), item.display_mode),
        })));
        setError("");
      } catch {
        if (active) setError("Live results are temporarily unavailable.");
      }
    }
    void load();
    return () => { active = false; };
  }, [raceId, revision]);

  useEffect(() => {
    if (!race?.id) return;
    const refresh = () => setRevision((value) => value + 1);
    const channel = supabase.channel(`pit-${race.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "races", filter: `id=eq.${race.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "classes", filter: `race_id=eq.${race.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [race?.id]);

  useEffect(() => {
    if (classes.length < 2) return;
    const timer = window.setInterval(() => setSelected((value) => (value + 1) % classes.length), 15_000);
    return () => window.clearInterval(timer);
  }, [classes.length]);

  useEffect(() => {
    if (selected >= classes.length) setSelected(0);
  }, [classes.length, selected]);

  const current = classes[selected];
  const rows = useMemo(() => current?.results.slice(0, 12) || [], [current]);

  return <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-7">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-5">
      <div>
        <Link href={`/race-results/${race?.slug || raceId}`} className="inline-flex items-center gap-2 text-sm text-amber-400 font-bold mb-3"><ArrowLeft className="w-4 h-4" /> Standard results</Link>
        <p className="uppercase tracking-[.25em] text-xs text-amber-400 font-black flex items-center gap-2"><Radio className="w-4 h-4 animate-pulse" /> Live pit display</p>
        <h1 className="text-3xl sm:text-5xl font-black mt-2">{race?.name || "Race Night"}</h1>
        {race && <p className="text-slate-400 mt-1">{formatRaceDate(race.date)}</p>}
      </div>
      <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="rounded-xl border border-white/20 px-4 py-3 font-bold inline-flex gap-2 items-center"><Maximize2 className="w-5 h-5" /> Full screen</button>
    </header>

    {error ? <p className="mt-10 text-xl text-red-300">{error}</p> : !current ? <p className="mt-10 text-xl text-slate-300">Waiting for published results…</p> : <>
      <nav className="flex gap-2 overflow-x-auto py-4" aria-label="Race classes">
        {classes.map((item, index) => <button key={item.id} type="button" onClick={() => setSelected(index)}
          className={`shrink-0 rounded-full px-4 py-2 font-bold ${selected === index ? "bg-amber-500 text-slate-950" : "bg-white/10 text-white"}`}>{item.name}</button>)}
      </nav>
      <section className="rounded-2xl border border-white/15 overflow-hidden">
        <div className="bg-white/10 px-5 py-4 flex justify-between gap-4 items-baseline">
          <h2 className="text-2xl sm:text-4xl font-black">{current.name}</h2>
          <span className="text-slate-400 text-sm">Updates live · rotates every 15 sec</span>
        </div>
        {rows.length === 0 ? <p className="p-8 text-xl text-slate-300">No passes entered yet.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-lg sm:text-2xl">
            <thead className="text-left text-xs sm:text-sm uppercase tracking-wider text-slate-400"><tr>
              <th className="p-4 w-16">#</th><th className="p-4">Driver</th>
              <th className="p-4 text-right">First</th><th className="p-4 text-right">Second</th>
              {current.display_mode !== "consistency" && <th className="p-4 text-right">Best</th>}
              {current.display_mode !== "fastest" && <th className="p-4 text-right">Consistency</th>}
            </tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id} className="border-t border-white/10">
              <td className="p-4 text-amber-400 font-black">{index + 1}</td>
              <td className="p-4 font-black">{row.name || "—"}</td>
              <td className="p-4 text-right font-mono">{formatPass(row.first_half)}</td>
              <td className="p-4 text-right font-mono">{formatPass(row.second_half)}</td>
              {current.display_mode !== "consistency" && <td className="p-4 text-right font-mono font-black text-amber-400">{formatPass(row.fastest)}</td>}
              {current.display_mode !== "fastest" && <td className="p-4 text-right font-mono">{row.consistency == null ? "—" : Number(row.consistency).toFixed(3)}</td>}
            </tr>)}</tbody>
          </table></div>}
      </section>
    </>}
  </div>;
}
