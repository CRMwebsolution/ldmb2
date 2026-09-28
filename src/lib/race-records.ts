import type { Race, RaceClass, RaceResult } from "@/lib/supabase/types";
import { parsePass } from "./race-results.ts";

export interface TimedRecord {
  resultId: string;
  racerName: string;
  seconds: number;
  raceId: string;
  raceName: string;
  raceDate: string;
  raceSlug: string | null;
}

export interface ClassRecords {
  key: string;
  name: string;
  entries: TimedRecord[];
}

function normalizeClassName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function bestTimedPass(row: Pick<RaceResult, "first_half" | "second_half">): number | null {
  const times = [row.first_half, row.second_half]
    .map(parsePass)
    .filter((pass) => pass.kind === "time" && pass.value !== null && Number.isFinite(pass.value) && pass.value > 0)
    .map((pass) => pass.value as number);
  return times.length ? Math.min(...times) : null;
}

export function buildRaceRecords(
  races: Race[], raceClasses: RaceClass[], results: RaceResult[], year: number | null,
): ClassRecords[] {
  const published = new Map(races.filter((race) => race.published).map((race) => [race.id, race]));
  const classes = new Map<string, { key: string; race: Race }>();
  const groups = new Map<string, ClassRecords & { latestDate: string }>();

  for (const cls of raceClasses) {
    const race = cls.race_id ? published.get(cls.race_id) : undefined;
    if (!race || (year !== null && Number(race.date.slice(0, 4)) !== year)) continue;
    const key = normalizeClassName(cls.name);
    if (!key) continue;
    classes.set(cls.id, { key, race });
    const group = groups.get(key);
    if (!group) groups.set(key, { key, name: cls.name.trim().replace(/\s+/g, " "), entries: [], latestDate: race.date });
    else if (race.date > group.latestDate) {
      group.name = cls.name.trim().replace(/\s+/g, " ");
      group.latestDate = race.date;
    }
  }

  for (const row of results) {
    const source = row.class_id ? classes.get(row.class_id) : undefined;
    if (!source) continue;
    const seconds = bestTimedPass(row);
    if (seconds === null) continue;
    groups.get(source.key)!.entries.push({
      resultId: row.id,
      racerName: row.name?.trim() || "Name not recorded",
      seconds,
      raceId: source.race.id,
      raceName: source.race.name,
      raceDate: source.race.date,
      raceSlug: source.race.slug,
    });
  }

  return [...groups.values()].map((group) => ({
    key: group.key,
    name: group.name,
    entries: group.entries.sort((a, b) =>
      a.seconds - b.seconds || a.raceDate.localeCompare(b.raceDate) || a.resultId.localeCompare(b.resultId)),
  })).sort((a, b) => a.name.localeCompare(b.name, "en-US", { numeric: true }));
}
