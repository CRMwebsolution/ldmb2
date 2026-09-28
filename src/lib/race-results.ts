import type { RaceResult } from "@/lib/supabase/types";

export type PassKind = "time" | "distance" | "invalid" | "empty";
export type ParsedPass = { kind: PassKind; value: number | null };

const DISTANCE = /^(-?\d+(?:\.\d+)?)\s*(?:ft|feet|foot|['’′])$/i;
const TIME = /^-?\d+(?:\.\d+)?$/;
const DQ = /^(?:dq|d\/q|disqualified)$/i;

export function parsePass(raw: unknown): ParsedPass {
  const value = raw == null ? "" : String(raw).trim();
  if (!value) return { kind: "empty", value: null };
  if (DQ.test(value)) return { kind: "invalid", value: null };
  const distance = value.match(DISTANCE);
  if (distance) return { kind: "distance", value: Number(distance[1]) };
  if (TIME.test(value)) return { kind: "time", value: Number(value) };
  return { kind: "invalid", value: null };
}

export function isValidPassInput(raw: unknown): boolean {
  return parsePass(raw).kind !== "invalid" || DQ.test(String(raw).trim());
}

export function hasRecordedPass(row: {
  name?: string | null;
  first_half?: string | null;
  second_half?: string | null;
}): boolean {
  return !!row.name?.trim() && [row.first_half, row.second_half].some((raw) => {
    const kind = parsePass(raw).kind;
    return kind === "time" || kind === "distance" || DQ.test(String(raw ?? "").trim());
  });
}

export function computeRaceMetrics(first: string | null, second: string | null) {
  const passes = [parsePass(first), parsePass(second)];
  const times = passes.filter((p) => p.kind === "time" && p.value !== null) as { value: number }[];
  if (times.length) {
    return {
      fastest: Math.min(...times.map((p) => p.value)).toFixed(3),
      consistency: times.length === 2
        ? Number(Math.abs(times[0].value - times[1].value).toFixed(3))
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

export function sortClassResults(rows: RaceResult[], mode: string): RaceResult[] {
  return rows.filter((row) => !isBlankResult(row)).sort((a, b) => {
    const best = compareBestPass(a.fastest, b.fastest);
    const consistency = (a.consistency ?? Infinity) - (b.consistency ?? Infinity);
    const primary = mode === "consistency" ? consistency : best;
    const secondary = mode === "both" ? consistency : mode === "consistency" ? best : 0;
    return primary || secondary || (a.order_num ?? Infinity) - (b.order_num ?? Infinity);
  });
}

export function formatRaceDate(date: string, options: Intl.DateTimeFormatOptions = {
  year: "numeric", month: "long", day: "numeric",
}): string {
  return new Intl.DateTimeFormat("en-US", {
    ...options, timeZone: "America/New_York",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}
