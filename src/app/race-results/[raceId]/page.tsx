"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, MonitorUp } from "lucide-react";
import {
  formatPass,
  formatRaceDate,
  sortResultsByColumn,
  toggleResultSort,
  type ResultSortColumn,
  type ResultSortState,
} from "@/lib/race-results";
import { usePublicRaceResults } from "@/lib/use-public-race-results";
import { generateRacePdf } from "@/lib/generate-race-pdf";
import { SpectatorQR } from "@/components/SpectatorQR";

export default function RaceResultsDetail() {
  const { raceId } = useParams<{ raceId: string }>();
  const { race, classes, loading, error } = usePublicRaceResults(raceId);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [classSorts, setClassSorts] = useState<Record<string, ResultSortState>>({});

  function handleSortHeader(classId: string, column: ResultSortColumn, defaultColumn: ResultSortColumn) {
    setClassSorts((prev) => ({
      ...prev,
      [classId]: toggleResultSort(prev[classId], column, defaultColumn),
    }));
  }

  function renderSortIcon(activeSort: ResultSortState, column: ResultSortColumn) {
    if (activeSort.column !== column) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 shrink-0" />;
    return activeSort.direction === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
      : <ArrowDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />;
  }

  return <div className="max-w-6xl mx-auto px-4 py-12">
    <Link href="/race-results" className="inline-flex gap-2 items-center text-sm font-bold mb-7" style={{ color: "var(--primary)" }}>
      <ArrowLeft className="w-4 h-4" /> All race results
    </Link>
    {loading ? <p>Loading race results...</p> : error ? <p role="alert">{error}</p> : !race ? <p>Results will appear here when the first entry is saved.</p> : <>
      <header className="mb-9">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>{race.published ? "Official race results" : "Live race results"}</span>
        <h1 className="text-4xl sm:text-5xl font-black mt-2">{race.name}</h1>
        <p className="mt-2" style={{ color: "var(--muted-fg)" }}>{formatRaceDate(race.date)}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted-fg)" }}>Entries update automatically. Click any column header to sort.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {classes.length > 0 && <>
            {race.published && <button type="button" onClick={() => generateRacePdf(race, classes)}
              className="rounded-lg px-4 py-2 font-bold text-sm" style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
              Download Official PDF
            </button>}
            <Link href={`/race-results/${race.slug || race.id}/pit`} className="rounded-lg border px-4 py-2 font-bold text-sm inline-flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
              <MonitorUp className="w-4 h-4" /> Pit Display
            </Link>
          </>}
          <SpectatorQR path={`/race-results/${race.slug || race.id}`} eventName={race.name} />
        </div>
      </header>
      {classes.length === 0 ? <p>No classes are listed for this race.</p> : <div className="space-y-5">
        {classes.map((item) => {
          const closed = collapsed.includes(item.id);
          const showBest = item.display_mode !== "consistency";
          const showConsistency = item.display_mode !== "fastest";
          const defaultColumn: ResultSortColumn = item.display_mode === "consistency" ? "consistency" : "fastest";
          const activeSort: ResultSortState = classSorts[item.id] ?? { column: defaultColumn, direction: "asc" };
          const sortedResults = sortResultsByColumn(item.results, activeSort, item.display_mode);

          return <section key={item.id} className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <button type="button" className="w-full p-5 flex justify-between items-center text-left" aria-expanded={!closed}
              onClick={() => setCollapsed((prev) => closed ? prev.filter((id) => id !== item.id) : [...prev, item.id])}>
              <span className="font-black text-xl">{item.name} <span className="font-normal text-sm" style={{ color: "var(--muted-fg)" }}>({item.results.length})</span></span>
              {closed ? <ChevronDown /> : <ChevronUp />}
            </button>
            {!closed && <div className="overflow-x-auto border-t" style={{ borderColor: "var(--border)" }}>
              {sortedResults.length === 0 ? <p className="p-5 text-sm">No entries recorded in this class.</p> : <table className="w-full min-w-[580px] text-sm">
                <thead style={{ background: "var(--muted)" }}><tr>
                  <th className="text-left p-3 w-16" aria-sort={activeSort.column === "order" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => handleSortHeader(item.id, "order", defaultColumn)}
                      className="inline-flex items-center gap-1 font-bold hover:opacity-80 cursor-pointer select-none"
                      title="Sort by order number">
                      <span>#</span>
                      {renderSortIcon(activeSort, "order")}
                    </button>
                  </th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-right p-3" aria-sort={activeSort.column === "first_half" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => handleSortHeader(item.id, "first_half", defaultColumn)}
                      className="inline-flex items-center justify-end gap-1 font-bold hover:opacity-80 cursor-pointer select-none ml-auto"
                      title="Sort by 1st Pass">
                      <span>1st Pass</span>
                      {renderSortIcon(activeSort, "first_half")}
                    </button>
                  </th>
                  <th className="text-right p-3" aria-sort={activeSort.column === "second_half" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => handleSortHeader(item.id, "second_half", defaultColumn)}
                      className="inline-flex items-center justify-end gap-1 font-bold hover:opacity-80 cursor-pointer select-none ml-auto"
                      title="Sort by 2nd Pass">
                      <span>2nd Pass</span>
                      {renderSortIcon(activeSort, "second_half")}
                    </button>
                  </th>
                  {showBest && <th className="text-right p-3" aria-sort={activeSort.column === "fastest" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => handleSortHeader(item.id, "fastest", defaultColumn)}
                      className="inline-flex items-center justify-end gap-1 font-bold hover:opacity-80 cursor-pointer select-none ml-auto"
                      title="Sort by Best Pass">
                      <span>Best Pass</span>
                      {renderSortIcon(activeSort, "fastest")}
                    </button>
                  </th>}
                  {showConsistency && <th className="text-right p-3" aria-sort={activeSort.column === "consistency" ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => handleSortHeader(item.id, "consistency", defaultColumn)}
                      className="inline-flex items-center justify-end gap-1 font-bold hover:opacity-80 cursor-pointer select-none ml-auto"
                      title="Sort by Consistency">
                      <span>Consistency</span>
                      {renderSortIcon(activeSort, "consistency")}
                    </button>
                  </th>}
                </tr></thead>
                <tbody>{sortedResults.map((row, index) => <tr key={row.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-3 font-mono text-xs" style={{ color: "var(--muted-fg)" }}>{row.order_num ?? index + 1}</td>
                  <td className="p-3 font-semibold">{row.name?.trim() || "—"}</td>
                  <td className="p-3 text-right font-mono">{formatPass(row.first_half)}</td>
                  <td className="p-3 text-right font-mono">{formatPass(row.second_half)}</td>
                  {showBest && <td className="p-3 text-right font-mono font-bold">{formatPass(row.fastest)}</td>}
                  {showConsistency && <td className="p-3 text-right font-mono">{row.consistency == null ? "—" : Number(row.consistency).toFixed(3)}</td>}
                </tr>)}</tbody>
              </table>}
            </div>}
          </section>;
        })}
      </div>}
    </>}
  </div>;
}
