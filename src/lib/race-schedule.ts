import type { Race } from "@/lib/supabase/types";

export function todayAtTrack(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isUpcomingEvent(race: Race, today = todayAtTrack()): boolean {
  return race.date >= today && race.event_status !== "completed";
}

export function isNextRace(race: Race, today = todayAtTrack()): boolean {
  return race.date >= today && race.event_status === "scheduled";
}

export function raceStartIso(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", timeZoneName: "shortOffset",
  }).formatToParts(noonUtc).find((part) => part.type === "timeZoneName")?.value || "GMT-5";
  const offset = Number(zone.match(/GMT([+-]\d+)/)?.[1] || -5);
  return new Date(Date.UTC(year, month - 1, day, 16 - offset)).toISOString();
}
