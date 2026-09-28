"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Race, RaceClass, RaceResult } from "@/lib/supabase/types";
import { formatPass, formatRaceDate, sortClassResults } from "@/lib/race-results";
import { generateRacePdf } from "@/lib/generate-race-pdf";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ClassWithResults = RaceClass & { results: RaceResult[] };

export default function RaceResultsDetail() {
  const { raceId } = useParams<{ raceId: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [classes, setClasses] = useState<ClassWithResults[]>([]);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setRace(null);
      setClasses([]);
      try {
        const selector = UUID.test(raceId) ? "id" : "slug";
        const { data: event, error: raceError } = await supabase.from("races")
          .select("*").eq(selector, raceId).eq("published", true).maybeSingle();
        if (raceError) throw raceError;
        if (!event) return;

        const { data: raceClasses, error: classError } = await supabase.from("classes")
          .select("*").eq("race_id", event.id).order("order_num", { ascending: true });
        if (classError) throw classError;
        const ids = (raceClasses || []).map((item) => item.id);
        const rows: RaceResult[] = [];
        if (ids.length) {
          // PostgREST pages at 1,000 rows. Read every page so large race nights stay complete.
          for (let start = 0; ; start += 1000) {
            const { data, error: resultsError } = await supabase.from("results").select("*")
              .in("class_id", ids).order("id").range(start, start + 999);
            if (resultsError) throw resultsError;
            rows.push(...(data || []));
            if (!data || data.length < 1000) break;
          }
        }
        if (!active) return;
        setRace(event);
        setClasses((raceClasses || []).map((item) => ({
          ...item,
          results: sortClassResults(rows.filter((row) => row.class_id === item.id), item.display_mode),
        })));
      } catch (err) {
        console.error("Could not load race results", err);
        if (active) setError("Results could not be loaded. Please try again later.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [raceId]);

  return <div className="max-w-6xl mx-auto px-4 py-12">
    <Link href="/race-results" className="inline-flex gap-2 items-center text-sm font-bold mb-7" style={{ color: "var(--primary)" }}>
      <ArrowLeft className="w-4 h-4" /> All race results
    </Link>
    {loading ? <p>Loading race results...</p> : error ? <p role="alert">{error}</p> : !race ? <p>This race has no published results.</p> : <>
      <header className="mb-9">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>Official race results</span>
        <h1 className="text-4xl sm:text-5xl font-black mt-2">{race.name}</h1>
        <p className="mt-2" style={{ color: "var(--muted-fg)" }}>{formatRaceDate(race.date)}</p>
        {classes.length > 0 && <button type="button" onClick={() => generateRacePdf(race, classes)}
          className="mt-4 rounded-lg px-4 py-2 font-bold text-sm" style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
          Download Official PDF
        </button>}
      </header>
      {classes.length === 0 ? <p>No classes are listed for this race.</p> : <div className="space-y-5">
        {classes.map((item) => {
          const closed = collapsed.includes(item.id);
          const showBest = item.display_mode !== "consistency";
          const showConsistency = item.display_mode !== "fastest";
          return <section key={item.id} className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <button type="button" className="w-full p-5 flex justify-between items-center text-left" aria-expanded={!closed}
              onClick={() => setCollapsed((prev) => closed ? prev.filter((id) => id !== item.id) : [...prev, item.id])}>
              <span className="font-black text-xl">{item.name} <span className="font-normal text-sm" style={{ color: "var(--muted-fg)" }}>({item.results.length})</span></span>
              {closed ? <ChevronDown /> : <ChevronUp />}
            </button>
            {!closed && <div className="overflow-x-auto border-t" style={{ borderColor: "var(--border)" }}>
              {item.results.length === 0 ? <p className="p-5 text-sm">No entries recorded in this class.</p> : <table className="w-full min-w-[580px] text-sm">
                <thead style={{ background: "var(--muted)" }}><tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-right p-3">1st Pass</th><th className="text-right p-3">2nd Pass</th>
                  {showBest && <th className="text-right p-3">Best Pass</th>}
                  {showConsistency && <th className="text-right p-3">Consistency</th>}
                </tr></thead>
                <tbody>{item.results.map((row) => <tr key={row.id} className="border-t" style={{ borderColor: "var(--border)" }}>
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
