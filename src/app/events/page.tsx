"use client";

import { useEffect, useState } from "react";
import { Clock, DollarSign, MapPin, Flag, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { AnimateIn } from "@/components/AnimateIn";
import { CountdownTimer } from "@/components/CountdownTimer";
import { supabase } from "@/lib/supabase/client";
import { Race } from "@/lib/supabase/types";

export default function EventsPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRaces() {
      try {
        const { data, error } = await supabase
          .from("races")
          .select("*")
          .eq("show_on_schedule", true)
          .order("date", { ascending: true });

        if (data) {
          setRaces(data);
        }
      } catch (err) {
        console.error("Error fetching races:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRaces();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingRaces = races.filter(
    (r) => r.date >= todayStr || r.event_status === "scheduled"
  );
  const pastRaces = races.filter(
    (r) => r.date < todayStr && r.event_status !== "scheduled"
  );

  const nextRace = upcomingRaces[0];

  const getStatusBadge = (status: Race["event_status"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case "postponed":
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Postponed
          </span>
        );
      default:
        return (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: "rgba(180,83,9,0.15)", color: "var(--primary)" }}
          >
            <Flag className="w-3.5 h-3.5" /> Scheduled
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <AnimateIn>
        <div className="mb-10">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--primary)" }}
          >
            Official Schedule
          </span>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight mt-1"
            style={{ color: "var(--foreground)" }}
          >
            Race Events
          </h1>
          <p className="mt-2" style={{ color: "var(--muted-fg)" }}>
            Monthly mud racing events at 759 Tom Mann Rd, Newport, NC. Gates open at 2:00 PM, racing starts at 4:00 PM.
          </p>
        </div>
      </AnimateIn>

      {/* Location banner */}
      <AnimateIn delay={0.1}>
        <div
          className="rounded-2xl border p-4 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ background: "var(--muted)", borderColor: "var(--border)" }}
        >
          <MapPin className="w-5 h-5 shrink-0" style={{ color: "var(--primary)" }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              759 Tom Mann Rd, Newport, NC 28570
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-fg)" }}>
              Gates open 2:00 PM · Racing begins 4:00 PM · Admission: \$10 Adults · Free for 12 &amp; Under
            </p>
          </div>
          <a
            href="https://maps.google.com/?q=759+Tom+Mann+Rd+Newport+NC"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 px-4 py-2 text-xs font-bold rounded-lg"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            Get Directions
          </a>
        </div>
      </AnimateIn>

      {/* Countdown to Next Event */}
      {nextRace && (
        <AnimateIn delay={0.15}>
          <div className="mb-10">
            <CountdownTimer
              targetDate={`${nextRace.date}T16:00:00`}
              eventName={`${nextRace.name} Race`}
            />
          </div>
        </AnimateIn>
      )}

      {/* Upcoming Events */}
      <section className="mb-12">
        <AnimateIn>
          <h2
            className="text-xl font-black tracking-tight mb-5"
            style={{ color: "var(--foreground)" }}
          >
            Upcoming Schedule
          </h2>
        </AnimateIn>

        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--muted-fg)" }}>
            Loading schedule from Supabase...
          </div>
        ) : upcomingRaces.length === 0 ? (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
          >
            No upcoming races scheduled currently. Check back soon!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {upcomingRaces.map((race, i) => {
              const d = new Date(race.date + "T00:00:00");
              return (
                <AnimateIn key={race.id} delay={i * 0.08}>
                  <div
                    className="rounded-2xl border p-6 flex flex-col sm:flex-row gap-6 transition-all hover:border-amber-600/40"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    {/* Date badge */}
                    <div
                      className="rounded-xl p-4 text-center min-w-[76px] self-start"
                      style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                    >
                      <div className="text-xs font-bold uppercase tracking-wide">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className="text-3xl font-black leading-none">{d.getDate()}</div>
                      <div className="text-xs mt-0.5">{d.getFullYear()}</div>
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3
                            className="text-xl font-black tracking-tight"
                            style={{ color: "var(--foreground)" }}
                          >
                            {race.name} Race Night
                          </h3>
                          {race.special_label && (
                            <span className="inline-block mt-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                              ★ {race.special_label}
                            </span>
                          )}
                        </div>
                        {getStatusBadge(race.event_status)}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        <div>
                          <div
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-0.5"
                            style={{ color: "var(--primary)" }}
                          >
                            <Clock className="w-3.5 h-3.5" /> Gates Open
                          </div>
                          <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            2:00 PM
                          </div>
                        </div>
                        <div>
                          <div
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-0.5"
                            style={{ color: "var(--primary)" }}
                          >
                            <Clock className="w-3.5 h-3.5" /> Racing Starts
                          </div>
                          <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            4:00 PM
                          </div>
                        </div>
                        <div>
                          <div
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-0.5"
                            style={{ color: "var(--primary)" }}
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Admission
                          </div>
                          <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            \$10 Adults
                          </div>
                        </div>
                        <div>
                          <div
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-0.5"
                            style={{ color: "var(--primary)" }}
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Kids (12-)
                          </div>
                          <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            FREE
                          </div>
                        </div>
                      </div>

                      {race.pdf_url && (
                        <div className="mt-4 pt-3 border-t flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                          <a
                            href={race.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold flex items-center gap-1.5 text-amber-600 hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" /> Download Event Flyer / PDF
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </AnimateIn>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Events */}
      {pastRaces.length > 0 && (
        <section>
          <AnimateIn>
            <h2
              className="text-xl font-black tracking-tight mb-5"
              style={{ color: "var(--foreground)" }}
            >
              Past Races
            </h2>
          </AnimateIn>
          <div className="flex flex-col gap-4">
            {pastRaces.map((race, i) => {
              const d = new Date(race.date + "T00:00:00");
              return (
                <AnimateIn key={race.id} delay={i * 0.06}>
                  <div
                    className="rounded-2xl border p-5 flex flex-col sm:flex-row gap-5 opacity-80"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    <div
                      className="rounded-xl p-3 text-center min-w-[64px] self-start"
                      style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
                    >
                      <div className="text-xs font-bold uppercase">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className="text-2xl font-black leading-none">{d.getDate()}</div>
                      <div className="text-[10px] mt-0.5">{d.getFullYear()}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
                          {race.name} Race
                        </h3>
                        {getStatusBadge(race.event_status)}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--muted-fg)" }}>
                        Completed championship race event at Little Doo Mud Bog.
                      </p>
                    </div>
                  </div>
                </AnimateIn>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
