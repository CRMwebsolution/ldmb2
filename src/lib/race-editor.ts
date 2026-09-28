import type { RaceClass, RaceResult } from "@/lib/supabase/types";
import { computeRaceMetrics, isBlankResult, isValidPassInput } from "./race-results.ts";

export type EditableResult = RaceResult & { persisted: boolean };
export type EditableClass = RaceClass & { results: EditableResult[] };

export function makePlaceholder(classId: string, order: number): EditableResult {
  return {
    id: crypto.randomUUID(), class_id: classId, order_num: order,
    name: null, first_half: null, second_half: null, fastest: null,
    consistency: null, created_at: null, persisted: false,
  };
}

export function addBlankRows(cls: EditableClass, count: number): EditableClass {
  const maxOrder = Math.max(0, ...cls.results.map((row) => row.order_num || 0));
  return {
    ...cls,
    results: [...cls.results, ...Array.from({ length: count }, (_, index) => makePlaceholder(cls.id, maxOrder + index + 1))],
  };
}

export function prepareRaceEditor(raceClasses: RaceClass[], rows: RaceResult[]): {
  classes: EditableClass[];
  staleBlankIds: string[];
} {
  const staleBlankIds: string[] = [];
  const classes = raceClasses.map((cls) => {
    const populated = rows.filter((row) => row.class_id === cls.id)
      .sort((a, b) => (a.order_num ?? Infinity) - (b.order_num ?? Infinity));
    const results = populated.filter((row) => {
      if (isBlankResult(row)) { staleBlankIds.push(row.id); return false; }
      return true;
    }).map((row, index) => ({ ...row, order_num: index + 1, persisted: true }));
    return addBlankRows({ ...cls, results }, Math.max(0, 20 - results.length));
  });
  return { classes, staleBlankIds };
}

export function buildRaceSavePayload(classes: EditableClass[], staleBlankIds: string[]) {
  const classPayload = classes.map((cls, index) => {
    if (!cls.name.trim()) throw new Error("Each class needs a name.");
    return {
      id: cls.id, race_id: cls.race_id, name: cls.name.trim(),
      display_mode: cls.display_mode, order_num: index + 1,
    };
  });
  const resultPayload: Array<Pick<RaceResult,
    "id" | "class_id" | "order_num" | "name" | "first_half" | "second_half" | "fastest" | "consistency">> = [];
  const deleteIds = new Set(staleBlankIds);

  for (const cls of classes) {
    let order = 0;
    for (const row of cls.results) {
      if (isBlankResult(row)) {
        if (row.persisted) deleteIds.add(row.id);
        continue;
      }
      if (![row.first_half, row.second_half].every(isValidPassInput)) {
        throw new Error(`Check the pass format for ${row.name?.trim() || "an entry"} in ${cls.name}. Use a time, a distance in feet, or DQ.`);
      }
      if (!row.name?.trim() && (row.first_half?.trim() || row.second_half?.trim())) {
        throw new Error(`Enter a racer name for the recorded pass in ${cls.name}.`);
      }
      const first = row.first_half?.trim() || null;
      const second = row.second_half?.trim() || null;
      const metrics = computeRaceMetrics(first, second);
      resultPayload.push({
        id: row.id, class_id: cls.id, order_num: ++order,
        name: row.name?.trim() || null, first_half: first, second_half: second,
        fastest: metrics.fastest, consistency: metrics.consistency,
      });
    }
  }
  return { classPayload, resultPayload, deleteIds: [...deleteIds] };
}
