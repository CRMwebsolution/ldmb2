"use client";

import { useEffect, useState } from "react";
import { isBlankResult, sortClassResults } from "@/lib/race-results";
import { todayAtTrack } from "@/lib/race-schedule";
import { supabase } from "@/lib/supabase/client";
import type { Race, RaceClass, RaceResult } from "@/lib/supabase/types";

export const PUBLIC_RACE_RESULTS = "published.eq.true,live_results.eq.true";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ClassWithResults = RaceClass & { results: RaceResult[] };
type RaceView = { race: Race | null; classes: ClassWithResults[]; error: string };

export function usePublicRaceResults(raceId: string) {
  const [view, setView] = useState<(RaceView & { route: string }) | null>(null);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let needsRefresh = false;
    let activeRaceId = "";
    let activeRaceDate = "";
    let ticks = 0;
    let classIds = new Set<string>();
    let resultIds = new Set<string>();
    const selector = UUID.test(raceId) ? "id" : "slug";

    async function refresh() {
      if (!active) return;
      if (inFlight) {
        needsRefresh = true;
        return;
      }
      inFlight = true;
      try {
        const { data: race, error: raceError } = await supabase.from("races")
          .select("*").eq(selector, raceId).or(PUBLIC_RACE_RESULTS).maybeSingle();
        if (raceError) throw raceError;
        if (!active) return;
        activeRaceId = race?.id ?? "";
        activeRaceDate = race?.date ?? "";
        if (!race) {
          classIds.clear();
          resultIds.clear();
          setView({ route: raceId, race: null, classes: [], error: "" });
          return;
        }

        const { data: raceClasses, error: classError } = await supabase.from("classes")
          .select("*").eq("race_id", race.id).order("order_num");
        if (classError) throw classError;
        if (!active) return;
        classIds = new Set(raceClasses.map((item) => item.id));

        const rows: RaceResult[] = [];
        for (let start = 0; classIds.size; start += 1000) {
          const { data, error } = await supabase.from("results").select("*")
            .in("class_id", [...classIds]).order("id").range(start, start + 999);
          if (error) throw error;
          if (!active) return;
          rows.push(...data);
          if (data.length < 1000) break;
        }
        resultIds = new Set(rows.map((row) => row.id));
        const classes = raceClasses.map((item) => {
          const populated = rows.filter((row) => row.class_id === item.id && !isBlankResult(row))
            .sort((a, b) => (a.order_num ?? Infinity) - (b.order_num ?? Infinity))
            .map((row, index) => ({ ...row, order_num: row.order_num ?? index + 1 }));
          return { ...item, results: sortClassResults(populated, item.display_mode) };
        });
        setView({ route: raceId, race, classes, error: "" });
      } catch (error) {
        console.error("Could not load race results", error);
        if (active) setView((previous) => previous?.route === raceId && previous.race
          ? previous
          : { route: raceId, race: null, classes: [], error: "Results could not be loaded. Please try again later." });
      } finally {
        inFlight = false;
        if (needsRefresh) {
          needsRefresh = false;
          void refresh();
        }
      }
    }

    const channel = supabase.channel(`public-race-results-${raceId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "races", filter: `${selector}=eq.${raceId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, (change) => {
        if (change.eventType === "DELETE" ? classIds.has(change.old.id) : change.new.race_id === activeRaceId) void refresh();
      })
      // Also pick up writes from any admin editor that was already open before deployment.
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, (change) => {
        if (change.eventType === "DELETE" ? resultIds.has(change.old.id) : classIds.has(change.new.class_id)) void refresh();
      })
      .subscribe((status) => { if (status === "SUBSCRIBED") void refresh(); });

    void refresh();
    const interval = window.setInterval(() => {
      ticks += 1;
      if (document.visibilityState === "visible" && (activeRaceDate >= todayAtTrack() || ticks % 6 === 0)) void refresh();
    }, 5000);
    const handleVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [raceId]);

  const current = view?.route === raceId ? view : null;
  return {
    race: current?.race ?? null,
    classes: current?.classes ?? [],
    error: current?.error ?? "",
    loading: current === null,
  };
}
