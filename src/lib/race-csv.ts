import type { Race } from "@/lib/supabase/types";
import type { EditableClass } from "@/lib/race-editor";
import { formatPass } from "./race-results.ts";

function safeCell(value: unknown) {
  const text = String(value ?? "");
  const protectedText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

export function raceResultsCsv(race: Race, classes: EditableClass[]) {
  const rows: string[][] = [
    ["Race", race.name],
    ["Date", race.date],
    [],
    ["Class", "Order", "Racer", "First Pass", "Second Pass", "Best Pass", "Consistency"],
  ];
  for (const cls of classes) {
    cls.results.filter((row) => row.name?.trim() || row.first_half?.trim() || row.second_half?.trim())
      .forEach((row, index) => rows.push([
        cls.name,
        String(index + 1),
        row.name?.trim() || "",
        formatPass(row.first_half),
        formatPass(row.second_half),
        formatPass(row.fastest),
        row.consistency == null ? "" : Number(row.consistency).toFixed(3),
      ]));
  }
  return "\uFEFF" + rows.map((row) => row.map(safeCell).join(",")).join("\r\n");
}

export function downloadRaceCsv(race: Race, classes: EditableClass[]) {
  const blob = new Blob([raceResultsCsv(race, classes)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${race.date}-${race.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-results.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
