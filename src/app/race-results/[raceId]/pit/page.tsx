"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Maximize2, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Race, RaceClass, RaceResult } from "@/lib/supabase/types";
import {
  formatPass,
  formatRaceDate,
  isBlankResult,
  sortClassResults,
  sortResultsByColumn,
  toggleResultSort,
  type ResultSortColumn,
  type ResultSortState,
} from "@/lib/race-results";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PitClass = RaceClass & { results: RaceResult[] };

export default function PitDisplayPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [classes, setClasses] = useState<PitClass[]>([]);
  const [selected, setSelected] = useState(0);
  const [classSorts, setClassSorts] = useState<Record<string, ResultSortState>>({});
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
        setClasses((raceClasses || []).map((item) => {
          const populated = rows
            .filter((row) => row.class_id === item.id && !isBlankResult(row))
            .sort((a, b) => (a.order_num ?? Infinity) - (b.order_num ?? Infinity))
            .map((row, index) => ({ ...row, order_num: row.order_num ?? index + 1 }));
          return {
            ...item,
            results: sortClassResults(populated, item.display_mode),
          };
        }));
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
  const defaultColumn: ResultSortColumn = current?.display_mode === "consistency" ? "consistency" : "fastest";
  const activeSort: ResultSortState = current ? (classSorts[current.id] ?? { column: defaultColumn, direction: "asc" }) : { column: "fastest", direction: "asc" };

  const rows = useMemo(() => {
    if (!current) return [];
    return sortResultsByColumn(current.results, activeSort, current.display_mode).slice(0, 12);
  }, [current, activeSort]);

  function handleSortHeader(column: ResultSortColumn) {
    if (!current) return;
    setClassSorts((prev) => ({
      ...prev,
      [current.id]: toggleResultSort(prev[current.id], column, defaultColumn),
    }));
  }

  function renderSortIcon(column: ResultSortColumn) {
    if (activeSort.column !== column) return <ArrowUpDown className="w-4 h-4 opacity-40 shrink-0" />;
    return activeSort.direction === "asc"
      ? <ArrowUp className="w-4 h-4 text-amber-400 shrink-0" />
      : <ArrowDown className="w-4 h-4 text-amber-400 shrink-0" />;
  }

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
              <th className="p-4 w-20" aria-sort={activeSort.column === "order" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => handleSortHeader("order")} className="inline-flex items-center gap-1 font-bold uppercase hover:text-white cursor-pointer select-none">
                  <span>#</span>{renderSortIcon("order")}
                </button>
              </th>
              <th className="p-4">Driver</th>
              <th className="p-4 text-right" aria-sort={activeSort.column === "first_half" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => handleSortHeader("first_half")} className="inline-flex items-center justify-end gap-1 font-bold uppercase hover:text-white cursor-pointer select-none ml-auto">
                  <span>First</span>{renderSortIcon("first_half")}
                </button>
              </th>
              <th className="p-4 text-right" aria-sort={activeSort.column === "second_half" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => handleSortHeader("second_half")} className="inline-flex items-center justify-end gap-1 font-bold uppercase hover:text-white cursor-pointer select-none ml-auto">
                  <span>Second</span>{renderSortIcon("second_half")}
                </button>
              </th>
              {current.display_mode !== "consistency" && <th className="p-4 text-right" aria-sort={activeSort.column === "fastest" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => handleSortHeader("fastest")} className="inline-flex items-center justify-end gap-1 font-bold uppercase hover:text-white cursor-pointer select-none ml-auto">
                  <span>Best</span>{renderSortIcon("fastest")}
                </button>
              </th>}
              {current.display_mode !== "fastest" && <th className="p-4 text-right" aria-sort={activeSort.column === "consistency" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => handleSortHeader("consistency")} className="inline-flex items-center justify-end gap-1 font-bold uppercase hover:text-white cursor-pointer select-none ml-auto">
                  <span>Consistency</span>{renderSortIcon("consistency")}
                </button>
              </th>}
            </tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id} className="border-t border-white/10">
              <td className="p-4 text-amber-400 font-black">{row.order_num ?? index + 1}</td>
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
