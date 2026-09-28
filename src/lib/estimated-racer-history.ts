import type { SupabaseClient } from "@supabase/supabase-js";
import { formatRaceDate as formatCalendarRaceDate } from "./race-results";

export interface HistoryRaceRelation {
  id: string;
  name: string;
  date: string;
}

export interface HistoryClassRelation {
  name: string;
  races: HistoryRaceRelation | HistoryRaceRelation[] | null;
}

export interface HistorySourceRow {
  name: string | null;
  classes: HistoryClassRelation | HistoryClassRelation[] | null;
}

export interface EstimatedHistoryEvent {
  raceId: string;
  raceName: string;
  date: string;
  recordedNames: string[];
}

export interface EstimatedHistoryClass {
  className: string;
  events: EstimatedHistoryEvent[];
}

export interface EstimatedHistory {
  totalEvents: number;
  classes: EstimatedHistoryClass[];
}

export interface EstimatedRacerSummary extends EstimatedHistory {
  key: string;
  displayName: string;
  recordedNames: string[];
}

interface PreparedHistoryRow {
  recordedName: string;
  normalizedName: string;
  className: string;
  race: HistoryRaceRelation;
}

const CLASS_ORDER = [
  "Foot Runners",
  "Unlimited",
  "Renegade Cuts",
  "Pure Street",
  "C Class",
  "Small Block",
  "Modified",
  "B Class",
  "Kids Class",
  "A Class",
  "4&6",
];

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’_-]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLikelySameRacer(seedName: string, candidateName: string): boolean {
  const seed = normalizeName(seedName);
  const candidate = normalizeName(candidateName);

  if (!seed || !candidate) return false;
  if (seed === candidate) return true;

  const seedParts = seed.split(" ");
  const candidateParts = candidate.split(" ");

  if (seedParts[0] !== candidateParts[0]) return false;
  if (seedParts.length === 1 || candidateParts.length === 1) return true;

  return seedParts[1][0] === candidateParts[1][0];
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function prepareRows(rows: HistorySourceRow[]): PreparedHistoryRow[] {
  const prepared: PreparedHistoryRow[] = [];

  for (const row of rows) {
    const recordedName = row.name?.trim();
    const normalizedName = recordedName ? normalizeName(recordedName) : "";
    const classRelation = unwrapRelation(row.classes);
    const raceRelation = classRelation ? unwrapRelation(classRelation.races) : null;
    const normalizedClassName = classRelation?.name
      ? normalizeName(classRelation.name)
      : "";

    if (
      !recordedName ||
      !normalizedName ||
      !classRelation?.name ||
      normalizedClassName === "foot runners" ||
      !raceRelation?.id
    ) {
      continue;
    }

    prepared.push({
      recordedName,
      normalizedName,
      className: classRelation.name,
      race: raceRelation,
    });
  }

  return prepared;
}

function buildHistoryFromNames(
  matchedNames: Set<string>,
  preparedRows: PreparedHistoryRow[]
): EstimatedHistory {
  const totalEventIds = new Set<string>();
  const classGroups = new Map<
    string,
    { className: string; events: Map<string, EstimatedHistoryEvent> }
  >();

  for (const row of preparedRows) {
    if (!matchedNames.has(row.normalizedName)) continue;

    const classKey = normalizeName(row.className);
    const group = classGroups.get(classKey) ?? {
      className: row.className,
      events: new Map<string, EstimatedHistoryEvent>(),
    };

    const existingEvent = group.events.get(row.race.id);
    if (existingEvent) {
      if (!existingEvent.recordedNames.includes(row.recordedName)) {
        existingEvent.recordedNames.push(row.recordedName);
      }
    } else {
      group.events.set(row.race.id, {
        raceId: row.race.id,
        raceName: row.race.name,
        date: row.race.date,
        recordedNames: [row.recordedName],
      });
    }

    classGroups.set(classKey, group);
    totalEventIds.add(row.race.id);
  }

  const classes = Array.from(classGroups.values()).map((group) => ({
    className: group.className,
    events: Array.from(group.events.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  }));

  classes.sort((a, b) => {
    const aIndex = CLASS_ORDER.indexOf(a.className);
    const bIndex = CLASS_ORDER.indexOf(b.className);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    }
    return a.className.localeCompare(b.className);
  });

  return { totalEvents: totalEventIds.size, classes };
}

export function buildEstimatedHistory(
  racerName: string,
  rows: HistorySourceRow[]
): EstimatedHistory {
  const preparedRows = prepareRows(rows);
  const matchedNames = new Set(
    preparedRows
      .filter((row) => isLikelySameRacer(racerName, row.recordedName))
      .map((row) => row.normalizedName)
  );

  return buildHistoryFromNames(matchedNames, preparedRows);
}

function chooseDisplayName(
  normalizedNames: Set<string>,
  displayCounts: Map<string, Map<string, number>>
): string {
  const options: Array<{ name: string; count: number }> = [];

  for (const normalizedName of normalizedNames) {
    for (const [name, count] of displayCounts.get(normalizedName) ?? []) {
      options.push({ name, count });
    }
  }

  options.sort(
    (a, b) =>
      b.count - a.count ||
      b.name.split(/\s+/).length - a.name.split(/\s+/).length ||
      b.name.length - a.name.length ||
      a.name.localeCompare(b.name)
  );

  return options[0]?.name ?? Array.from(normalizedNames)[0] ?? "Unknown";
}

export function buildRacerLeaderboard(rows: HistorySourceRow[]): EstimatedRacerSummary[] {
  const preparedRows = prepareRows(rows);
  const displayCounts = new Map<string, Map<string, number>>();

  for (const row of preparedRows) {
    const counts = displayCounts.get(row.normalizedName) ?? new Map<string, number>();
    counts.set(row.recordedName, (counts.get(row.recordedName) ?? 0) + 1);
    displayCounts.set(row.normalizedName, counts);
  }

  const uniqueNames = Array.from(displayCounts.keys());
  const fullNames = uniqueNames.filter((name) => name.includes(" "));
  const singleNames = uniqueNames.filter((name) => !name.includes(" "));
  const parent = fullNames.map((_, index) => index);

  const find = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };

  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < fullNames.length; i += 1) {
    for (let j = i + 1; j < fullNames.length; j += 1) {
      if (isLikelySameRacer(fullNames[i], fullNames[j])) union(i, j);
    }
  }

  const groups = new Map<number, Set<string>>();
  for (let i = 0; i < fullNames.length; i += 1) {
    const root = find(i);
    const names = groups.get(root) ?? new Set<string>();
    names.add(fullNames[i]);
    groups.set(root, names);
  }

  const groupList = Array.from(groups.values());

  for (const singleName of singleNames) {
    const matchingGroups = groupList.filter((group) =>
      Array.from(group).some((fullName) => singleName === fullName.split(" ")[0])
    );

    if (matchingGroups.length === 0) {
      groupList.push(new Set([singleName]));
    } else {
      for (const group of matchingGroups) group.add(singleName);
    }
  }

  const summaries = groupList.map((matchedNames) => {
    const history = buildHistoryFromNames(matchedNames, preparedRows);
    const displayName = chooseDisplayName(matchedNames, displayCounts);
    const recordedNames = Array.from(
      new Set(
        Array.from(matchedNames).flatMap((name) =>
          Array.from(displayCounts.get(name)?.keys() ?? [])
        )
      )
    ).sort((a, b) => a.localeCompare(b));

    return {
      key: Array.from(matchedNames).sort().join("|"),
      displayName,
      recordedNames,
      ...history,
    };
  });

  return summaries.sort(
    (a, b) => b.totalEvents - a.totalEvents || a.displayName.localeCompare(b.displayName)
  );
}

function getRaceYear(value: string): number | null {
  const leadingYear = /^(\d{4})-/.exec(value)?.[1];
  if (leadingYear) return Number(leadingYear);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

export function getRacerLeaderboardYears(racers: EstimatedRacerSummary[]): number[] {
  const years = new Set<number>();

  for (const racer of racers) {
    for (const classHistory of racer.classes) {
      for (const event of classHistory.events) {
        const year = getRaceYear(event.date);
        if (year !== null) years.add(year);
      }
    }
  }

  return Array.from(years).sort((a, b) => b - a);
}

export function filterRacerLeaderboardByYear(
  racers: EstimatedRacerSummary[],
  year: number
): EstimatedRacerSummary[] {
  const filtered = racers.flatMap((racer) => {
    const eventIds = new Set<string>();
    const recordedNames = new Set<string>();
    const classes = racer.classes.flatMap((classHistory) => {
      const events = classHistory.events.filter((event) => getRaceYear(event.date) === year);
      if (events.length === 0) return [];

      for (const event of events) {
        eventIds.add(event.raceId);
        for (const name of event.recordedNames) recordedNames.add(name);
      }

      return [{ ...classHistory, events }];
    });

    if (eventIds.size === 0) return [];

    return [
      {
        ...racer,
        totalEvents: eventIds.size,
        recordedNames: Array.from(recordedNames).sort((a, b) => a.localeCompare(b)),
        classes,
      },
    ];
  });

  return filtered.sort(
    (a, b) => b.totalEvents - a.totalEvents || a.displayName.localeCompare(b.displayName)
  );
}

export async function fetchHistoryRows(
  client: SupabaseClient
): Promise<HistorySourceRow[]> {
  const pageSize = 1000;
  const allRows: HistorySourceRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("results")
      .select(`
        name,
        classes!inner (
          name,
          races!inner (
            id,
            name,
            date
          )
        )
      `)
      .not("name", "is", null)
      .neq("name", "")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as unknown as HistorySourceRow[];
    allRows.push(...page);
    if (page.length < pageSize) break;
  }

  return allRows;
}

export function formatRaceDate(value: string): string {
  return formatCalendarRaceDate(value);
}
