import type { RaceResult } from "@/lib/supabase/types";

export type PassKind = "time" | "distance" | "invalid" | "empty";
export type ScoringMode = "fastest" | "consistency" | "both";
export type ParsedPass = { kind: PassKind; value: number | null };

const DISTANCE = /^(-?\d+(?:\.\d+)?)\s*(?:ft|feet|foot|['’′])$/i;
const TIME = /^-?\d+(?:\.\d+)?$/;
const DQ = /^(?:dq|d\/q|disqualified)$/i;
const RECORDED_DQ = /^(?:(?:\d+)\s*)?(?:dq|d\/q|disqualified)$/i;
const NO_PASS_MARKER = /^(?:-|['’′])$/;

export function parsePass(raw: unknown): ParsedPass {
  const value = raw == null ? "" : String(raw).trim();
  if (!value) return { kind: "empty", value: null };
  if (DQ.test(value)) return { kind: "invalid", value: null };
  const distance = value.match(DISTANCE);
  if (distance) {
    const number = Number(distance[1]);
    return Number.isFinite(number) && number > 0
      ? { kind: "distance", value: number }
      : { kind: "invalid", value: null };
  }
  if (TIME.test(value)) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0
      ? { kind: "time", value: number }
      : { kind: "invalid", value: null };
  }
  return { kind: "invalid", value: null };
}

export function isValidPassInput(raw: unknown): boolean {
  const value = String(raw ?? "").trim();
  return parsePass(raw).kind !== "invalid" || RECORDED_DQ.test(value) || NO_PASS_MARKER.test(value);
}

export function hasRecordedPass(row: {
  name?: string | null;
  first_half?: string | null;
  second_half?: string | null;
}): boolean {
  return !!row.name?.trim() && [row.first_half, row.second_half].some((raw) => {
    const kind = parsePass(raw).kind;
    return kind === "time" || kind === "distance" || RECORDED_DQ.test(String(raw ?? "").trim());
  });
}

function roundedThousandth(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function computeRaceMetrics(first: string | null, second: string | null) {
  const passes = [parsePass(first), parsePass(second)];
  const times = passes.filter((p) => p.kind === "time" && p.value !== null) as { value: number }[];
  if (times.length) {
    return {
      fastest: Math.min(...times.map((p) => p.value)).toFixed(3),
      consistency: times.length === 2
        ? roundedThousandth(Math.abs(times[0].value - times[1].value))
        : null,
    };
  }
  const distances = passes.filter((p) => p.kind === "distance" && p.value !== null) as { value: number }[];
  if (distances.length) {
    return { fastest: `${Number(Math.max(...distances.map((p) => p.value)).toFixed(3))}ft`, consistency: null };
  }
  return { fastest: null, consistency: null };
}

export function formatPass(raw: unknown): string {
  if (raw == null || String(raw).trim() === "") return "—";
  const parsed = parsePass(raw);
  if (parsed.kind === "time") return parsed.value!.toFixed(3);
  if (parsed.kind === "distance") return `${Number(parsed.value!.toFixed(3))}ft`;
  return String(raw).trim();
}

export function isBlankResult(row: {
  name?: string | null;
  first_half?: string | null;
  second_half?: string | null;
}): boolean {
  return [row.name, row.first_half, row.second_half].every((v) => v == null || !String(v).trim());
}

export function compareBestPass(a: string | null, b: string | null): number {
  const first = parsePass(a);
  const second = parsePass(b);
  const rank = (kind: PassKind) => kind === "time" ? 0 : kind === "distance" ? 1 : 2;
  const difference = rank(first.kind) - rank(second.kind);
  if (difference) return difference;
  if (first.value === null) return second.value === null ? 0 : 1;
  if (second.value === null) return -1;
  return first.kind === "distance" ? second.value - first.value : first.value - second.value;
}

export function isScoringMode(value: unknown): value is ScoringMode {
  return value === "fastest" || value === "consistency" || value === "both";
}

export function sortClassResults(rows: RaceResult[], mode: string): RaceResult[] {
  return rows.filter((row) => !isBlankResult(row)).sort((a, b) => {
    const best = compareBestPass(a.fastest, b.fastest);
    const consistency = (a.consistency ?? Infinity) - (b.consistency ?? Infinity);
    const primary = mode === "consistency" ? consistency : best;
    const secondary = mode === "both" ? consistency : mode === "consistency" ? best : 0;
    return primary || secondary || (a.order_num ?? Infinity) - (b.order_num ?? Infinity);
  });
}

export type ResultSortColumn = "order" | "first_half" | "second_half" | "fastest" | "consistency";
export type SortDirection = "asc" | "desc";
export type ResultSortState = {
  column: ResultSortColumn;
  direction: SortDirection;
};

export function toggleResultSort(
  current: ResultSortState | undefined,
  column: ResultSortColumn,
  defaultColumn: ResultSortColumn = "order",
): ResultSortState {
  const activeColumn = current?.column ?? defaultColumn;
  const activeDirection = current?.direction ?? "asc";
  if (activeColumn === column) {
    return { column, direction: activeDirection === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

function passCategoryRank(raw: string | null | undefined): number {
  const value = raw == null ? "" : String(raw).trim();
  if (!value || NO_PASS_MARKER.test(value)) return 3;
  const parsed = parsePass(value);
  if (parsed.kind === "time" || parsed.kind === "distance") return 0;
  if (RECORDED_DQ.test(value) || DQ.test(value)) return 1;
  return 2;
}

function comparePassWithDirection(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: SortDirection,
): number {
  const catA = passCategoryRank(a);
  const catB = passCategoryRank(b);
  if (catA !== catB) return catA - catB;
  if (catA !== 0) return 0;
  const cmp = compareBestPass(a ?? null, b ?? null);
  return direction === "asc" ? cmp : -cmp;
}

export function sortResultsByColumn<
  T extends Pick<RaceResult, "id" | "order_num" | "name" | "first_half" | "second_half" | "fastest" | "consistency">,
>(rows: T[], sort: ResultSortState, mode: string = "fastest"): T[] {
  return [...rows].sort((a, b) => {
    const blankA = isBlankResult(a);
    const blankB = isBlankResult(b);
    if (blankA !== blankB) return blankA ? 1 : -1;
    if (blankA && blankB) return (a.order_num ?? Infinity) - (b.order_num ?? Infinity);

    const orderFallback = (a.order_num ?? Infinity) - (b.order_num ?? Infinity);

    if (sort.column === "order") {
      return sort.direction === "asc" ? orderFallback : -orderFallback;
    }

    if (sort.column === "first_half") {
      return comparePassWithDirection(a.first_half, b.first_half, sort.direction) || orderFallback;
    }

    if (sort.column === "second_half") {
      return comparePassWithDirection(a.second_half, b.second_half, sort.direction) || orderFallback;
    }

    if (sort.column === "fastest") {
      const fastA = a.fastest ?? computeRaceMetrics(a.first_half ?? null, a.second_half ?? null).fastest;
      const fastB = b.fastest ?? computeRaceMetrics(b.first_half ?? null, b.second_half ?? null).fastest;
      const passDiff = comparePassWithDirection(fastA, fastB, sort.direction);
      if (passDiff) return passDiff;
      if (mode === "both") {
        const consDiff = (a.consistency ?? Infinity) - (b.consistency ?? Infinity);
        if (consDiff) return consDiff;
      }
      return orderFallback;
    }

    // sort.column === "consistency"
    const consA = a.consistency ?? computeRaceMetrics(a.first_half ?? null, a.second_half ?? null).consistency;
    const consB = b.consistency ?? computeRaceMetrics(b.first_half ?? null, b.second_half ?? null).consistency;
    const hasA = consA != null && Number.isFinite(consA);
    const hasB = consB != null && Number.isFinite(consB);
    if (hasA !== hasB) return hasA ? -1 : 1;
    if (hasA && hasB) {
      const diff = sort.direction === "asc" ? consA - consB : consB - consA;
      if (diff) return diff;
    }
    const fastA = a.fastest ?? computeRaceMetrics(a.first_half ?? null, a.second_half ?? null).fastest;
    const fastB = b.fastest ?? computeRaceMetrics(b.first_half ?? null, b.second_half ?? null).fastest;
    return compareBestPass(fastA, fastB) || orderFallback;
  });
}

export function formatRaceDate(date: string, options: Intl.DateTimeFormatOptions = {
  year: "numeric", month: "long", day: "numeric",
}): string {
  return new Intl.DateTimeFormat("en-US", {
    ...options, timeZone: "America/New_York",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}
