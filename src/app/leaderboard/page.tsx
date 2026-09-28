"use client";

import { useEffect, useState } from "react";
import { AnimateIn } from "@/components/AnimateIn";
import { supabase } from "@/lib/supabase/client";
import { Race, RaceClass, RaceResult } from "@/lib/supabase/types";
import { Trophy, Filter, Calendar, Award, Clock, ArrowUpDown } from "lucide-react";

export default function LeaderboardPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>("");
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [results, setResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  // 1. Fetch published races
  useEffect(() => {
    async function loadPublishedRaces() {
      try {
        const { data, error } = await supabase
          .from("races")
          .select("*")
          .eq("published", true)
          .order("date", { ascending: false });

        if (data && data.length > 0) {
          setRaces(data);
          setSelectedRaceId(data[0].id);
        }
      } catch (err) {
        console.error("Error loading published races:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPublishedRaces();
  }, []);

  // 2. When selectedRaceId changes, fetch classes and results for that race
  useEffect(() => {
    if (!selectedRaceId) return;

    async function loadRaceData() {
      setLoadingResults(true);
      try {
        const { data: classesData, error: classesErr } = await supabase
          .from("classes")
          .select("*")
          .eq("race_id", selectedRaceId)
          .order("order_num", { ascending: true });

        if (classesData) {
          setClasses(classesData);
          setSelectedClassId("ALL");

          const classIds = classesData.map((c) => c.id);
          if (classIds.length > 0) {
            const { data: resultsData } = await supabase
              .from("results")
              .select("*")
              .in("class_id", classIds)
              .order("order_num", { ascending: true });

            setResults(resultsData || []);
          } else {
            setResults([]);
          }
        }
      } catch (err) {
        console.error("Error loading race details:", err);
      } finally {
        setLoadingResults(false);
      }
    }

    loadRaceData();
  }, [selectedRaceId]);

  const selectedRace = races.find((r) => r.id === selectedRaceId);

  // Filter results by selected class if specified
  const filteredResults = results.filter((r) => {
    if (selectedClassId === "ALL") return true;
    return r.class_id === selectedClassId;
  });

  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  // Helper for medal colors
  const getMedal = (rank: number) => {
    if (rank === 1) return { bg: "rgba(234,179,8,0.2)", text: "#EAB308", label: "1st" };
    if (rank === 2) return { bg: "rgba(156,163,175,0.2)", text: "#9CA3AF", label: "2nd" };
    if (rank === 3) return { bg: "rgba(180,83,9,0.2)", text: "#B45309", label: "3rd" };
    return { bg: "var(--muted)", text: "var(--muted-fg)", label: `#${rank}` };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <AnimateIn>
        <div className="mb-10">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block"
            style={{ background: "rgba(180,83,9,0.12)", color: "var(--primary)" }}
          >
            Championship Results
          </span>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight mt-2"
            style={{ color: "var(--foreground)" }}
          >
            Race Results &amp; Leaderboards
          </h1>
          <p className="mt-2" style={{ color: "var(--muted-fg)" }}>
            Official pass times, consistency metrics, and podium rankings from Little Doo Mud Bog events.
          </p>
        </div>
      </AnimateIn>

      {/* Filter Bar */}
      <AnimateIn delay={0.1}>
        <div
          className="rounded-2xl border p-4 mb-8 flex flex-col sm:flex-row gap-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mr-2" style={{ color: "var(--muted-fg)" }}>
            <Filter className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Select Event</span>
          </div>

          {/* Race selector */}
          <select
            value={selectedRaceId}
            onChange={(e) => setSelectedRaceId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none font-semibold cursor-pointer"
            style={{
              background: "var(--muted)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} Race — {new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </option>
            ))}
          </select>

          {/* Class selector */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none font-semibold cursor-pointer"
            style={{
              background: "var(--muted)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="ALL">All Classes ({classes.length})</option>
            {classes.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.name}
              </option>
            ))}
          </select>
        </div>
      </AnimateIn>

      {/* Selected Race Banner */}
      {selectedRace && (
        <AnimateIn delay={0.15}>
          <div
            className="rounded-2xl border p-5 mb-8 flex items-center justify-between flex-wrap gap-4"
            style={{ background: "var(--muted)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" style={{ color: "var(--primary)" }} />
              <div>
                <h2 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
                  {selectedRace.name} Race Night
                  {selectedRace.special_label && (
                    <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      ★ {selectedRace.special_label}
                    </span>
                  )}
                </h2>
                <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                  {new Date(selectedRace.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: "rgba(180,83,9,0.15)", color: "var(--primary)" }}
            >
              {filteredResults.length} Contestant Passes Recorded
            </span>
          </div>
        </AnimateIn>
      )}

      {/* Leaderboard Table */}
      <AnimateIn delay={0.2}>
        {loading || loadingResults ? (
          <div className="py-12 text-center" style={{ color: "var(--muted-fg)" }}>
            Loading passes and times from Supabase...
          </div>
        ) : filteredResults.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
          >
            No passes recorded for the selected class in this race event.
          </div>
        ) : (
          <div
            className="rounded-2xl border overflow-hidden shadow-sm"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Table Header */}
            <div
              className="grid gap-3 px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider border-b"
              style={{
                background: "var(--muted)",
                borderColor: "var(--border)",
                color: "var(--muted-fg)",
                gridTemplateColumns: "50px 1.5fr 1fr 1fr 1fr 1fr",
              }}
            >
              <span>Rank</span>
              <span>Driver / Contestant</span>
              <span>Class</span>
              <span className="text-right">1st Pass</span>
              <span className="text-right">2nd Pass</span>
              <span className="text-right text-amber-700 dark:text-amber-400">Fastest</span>
            </div>

            {/* Rows */}
            <div style={{ background: "var(--surface)" }}>
              {filteredResults.map((entry, idx) => {
                const rank = entry.order_num ?? idx + 1;
                const medal = getMedal(rank);
                const className = (entry.class_id && classMap.get(entry.class_id)) || "Class Entry";

                return (
                  <div
                    key={entry.id}
                    className="grid gap-3 px-5 py-4 items-center border-t first:border-t-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{
                      borderColor: "var(--border)",
                      gridTemplateColumns: "50px 1.5fr 1fr 1fr 1fr 1fr",
                    }}
                  >
                    {/* Rank */}
                    <div>
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                        style={{ background: medal.bg, color: medal.text }}
                      >
                        {rank <= 3 ? <Trophy className="w-3.5 h-3.5" /> : medal.label}
                      </span>
                    </div>

                    {/* Driver */}
                    <div>
                      <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                        {entry.name || "Unnamed Contestant"}
                      </p>
                      {entry.consistency !== null && (
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--muted-fg)" }}>
                          Consistency: ±{entry.consistency}s
                        </p>
                      )}
                    </div>

                    {/* Class */}
                    <div>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-md inline-block truncate max-w-full"
                        style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
                      >
                        {className}
                      </span>
                    </div>

                    {/* 1st Pass */}
                    <div className="text-right font-mono text-sm" style={{ color: "var(--muted-fg)" }}>
                      {entry.first_half || "—"}
                    </div>

                    {/* 2nd Pass */}
                    <div className="text-right font-mono text-sm" style={{ color: "var(--muted-fg)" }}>
                      {entry.second_half || "—"}
                    </div>

                    {/* Fastest */}
                    <div className="text-right">
                      <span
                        className="font-mono font-black text-sm px-2 py-0.5 rounded-md"
                        style={{
                          background: rank === 1 ? "rgba(234,179,8,0.15)" : "var(--muted)",
                          color: rank === 1 ? "#D97706" : "var(--foreground)",
                        }}
                      >
                        {entry.fastest || "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AnimateIn>

      <AnimateIn delay={0.25}>
        <p
          className="mt-6 text-xs text-center leading-relaxed"
          style={{ color: "var(--muted-fg)" }}
        >
          Times are official track times recorded at Little Doo Mud Bog. In case of distance runs, measurements are given in feet (ft).
        </p>
      </AnimateIn>
    </div>
  );
}
