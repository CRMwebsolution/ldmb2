//src/utils/generateRacePdf.ts
import jsPDF from "jspdf";
import { formatRaceDate, formatPass, isBlankResult, parsePass } from "./race-results";

type PdfResult = {
  name?: string | null;
  first_half?: string | null;
  second_half?: string | null;
  fastest?: string | null;
  consistency?: number | null;
};

type PdfClass = {
  name: string;
  display_mode?: string | null;
  results: PdfResult[];
};

type PdfRace = {
  name: string;
  date: string;
};

// ---------------------------------------------
// CONFIG
// ---------------------------------------------
export const RACE_PDF_LOGO_URL =
  "https://shxpqufymaxwvwamlmmz.supabase.co/storage/v1/object/public/race-pdfs/LDMBlogo.jpg";

// Load the logo as base64
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to load logo:", err);
    return null;
  }
}

// ---------------------------------------------
// HELPERS
// ---------------------------------------------

function safeNumber(value: unknown, fallback = Infinity): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

function compareBestPass(a: PdfResult, b: PdfResult): number {
  const aPass = parsePass(a.fastest);
  const bPass = parsePass(b.fastest);
  const rank = (kind: string) => (kind === "time" ? 0 : kind === "distance" ? 1 : 2);
  const rankDifference = rank(aPass.kind) - rank(bPass.kind);
  if (rankDifference !== 0) return rankDifference;
  if (aPass.value === null) return bPass.value === null ? 0 : 1;
  if (bPass.value === null) return -1;
  return aPass.kind === "distance"
    ? bPass.value - aPass.value
    : aPass.value - bPass.value;
}

// ---------------------------------------------
// SORT BY CLASS MODE
// ---------------------------------------------
function sortResults(cls: PdfClass, results: PdfResult[]) {
  // remove fully empty rows
  const filtered = results.filter((result) => !isBlankResult(result));

  if (cls.display_mode === "consistency") {
    return filtered.sort(
      (a, b) =>
        (safeNumber(a.consistency, Infinity) - safeNumber(b.consistency, Infinity)) ||
        compareBestPass(a, b)
    );
  }

  return filtered.sort((a, b) =>
    compareBestPass(a, b) || (cls.display_mode === "both"
      ? safeNumber(a.consistency, Infinity) - safeNumber(b.consistency, Infinity)
      : 0)
  );
}

// ---------------------------------------------
// MAIN EXPORT
// ---------------------------------------------
export async function generateRacePdf(
  race: PdfRace,
  classes: PdfClass[]
): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const logo = await loadImageAsDataUrl(RACE_PDF_LOGO_URL);
  let pageNumber = 0;

  const drawCell = (value: string, x: number, y: number, width: number, size: number) => {
    let text = value.replace(/—/g, "-");
    doc.setFontSize(size);
    if (doc.getTextWidth(text) > width) {
      doc.setFontSize(Math.max(7, size * width / doc.getTextWidth(text)));
    }
    while (text.length > 1 && doc.getTextWidth(text) > width) text = `${text.slice(0, -4)}...`;
    doc.text(text, x, y);
  };

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    const results = sortResults(cls, cls.results);
    const headers = ["Name", "1st Pass", "2nd Pass"];
    if (cls.display_mode === "fastest" || cls.display_mode === "both") {
      headers.push("Best Pass");
    }
    if (cls.display_mode === "consistency" || cls.display_mode === "both") {
      headers.push("Consistency");
    }
    const body = results.map((r) => {
      const row: string[] = [
        r.name || "-",
        formatPass(r.first_half),
        formatPass(r.second_half),
      ];

      if (cls.display_mode === "fastest" || cls.display_mode === "both") {
        row.push(formatPass(r.fastest));
      }

      if (cls.display_mode === "consistency" || cls.display_mode === "both") {
        row.push(
          r.consistency != null ? Number(r.consistency).toFixed(3) : "-"
        );
      }

      return row;
    });
    const widths = headers.length === 5 ? [150, 96, 96, 102, 75]
      : headers.length === 4 ? [180, 110, 110, 119] : [225, 145, 149];
    const positions = widths.map((_, index) => 40 + widths.slice(0, index).reduce((sum, width) => sum + width, 0));

    for (let start = 0; start < Math.max(1, body.length); start += 34) {
      if (pageNumber++) doc.addPage();
      const pageRows = body.slice(start, start + 34);
      if (logo) doc.addImage(logo, "JPEG", 40, 20, 120, 120);
      doc.setFont("Helvetica", "bold");
      drawCell(race.name, 180, 60, 390, 24);
      drawCell(formatRaceDate(race.date), 180, 85, 390, 16);
      drawCell(`Class: ${cls.name}${start ? " (continued)" : ""}`, 40, 170, 520, 18);
      doc.setFontSize(12);
      doc.text(`Mode: ${cls.display_mode || "fastest"}`, 40, 190);
      headers.forEach((header, index) => drawCell(header, positions[index], 220, widths[index] - 8, 12));

      const rowHeight = Math.min(22, 520 / Math.max(1, pageRows.length));
      doc.setFont("Helvetica", "normal");
      pageRows.forEach((row, rowIndex) => {
        const y = 220 + rowHeight * (rowIndex + 1);
        row.forEach((cell, index) => drawCell(cell, positions[index], y, widths[index] - 8, pageRows.length > 24 ? 9 : 11));
      });
    }
  }

// ---------------------------------------
// FOOTER ON EVERY PAGE
// ---------------------------------------
const pageCount = doc.getNumberOfPages();

for (let i = 1; i <= pageCount; i++) {
  doc.setPage(i);

  // Footer styling
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120); // gray

  // Centered footer text
  const footerText = "Visit littledoomudbog.com for upcoming races";

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.text(
    footerText,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );
}

  
  // ---------------------------------------------
  // SAVE PDF
  // ---------------------------------------------
  doc.save(`${race.name} - Official Results.pdf`);
}
