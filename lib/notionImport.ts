// Parses a Notion database CSV export shaped like:
//   Date | Academics/仕事 | スポーツ | ... | Total
// Dated rows → one entry per non-empty cell (the cell text becomes the note).
// Undated rows holding "0/5"-style values → used to detect each column's weekly target.
// A cell reading 休日 / rest / off → the whole day is marked as a rest day.

export interface ParsedImport {
  dateColumn: string;
  habits: { name: string; weeklyTarget: number; kind: "BUILD" | "AVOID"; logged: number }[];
  entries: { habit: string; date: string; note: string }[];
  restDays: string[];
  skippedRows: number;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

export function parseLooseDate(raw: string): string | null {
  let s = raw.trim().replace(/^@/, "");
  if (!s) return null;
  s = s.split("→")[0].trim();
  let m = s.match(/^(\d{4})[/\-.年](\d{1,2})[/\-.月](\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
  m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[1].slice(0, 3).toLowerCase()])}-${pad(+m[2])}`;
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(+m[1])}`;
  return null;
}

const REST = /^(休日|休み|rest( day)?|off|holiday)$/i;
const POINTS = /^\s*\d+\s*\/\s*(\d+)\s*$/;

export function parseNotion(text: string): ParsedImport {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("The file has no data rows.");
  const header = rows[0].map((h) => h.trim());
  let dateIdx = header.findIndex((h) => /^(date|day|日付|日)$/i.test(h));
  if (dateIdx < 0) dateIdx = 0;
  const skip = new Set<number>([dateIdx]);
  header.forEach((h, i) => { if (/^(total|合計|points|score|name)$/i.test(h) || h === "") skip.add(i); });
  const cols = header.map((h, i) => ({ h, i })).filter((c) => !skip.has(c.i));
  if (cols.length === 0) throw new Error("Couldn't find any habit columns.");

  const targets = new Map<string, number>();
  const logged = new Map<string, number>();
  const entries: ParsedImport["entries"] = [];
  const rest = new Set<string>();
  let skipped = 0;

  for (const r of rows.slice(1)) {
    const date = parseLooseDate(r[dateIdx] ?? "");
    if (!date) {
      let any = false;
      for (const c of cols) {
        const m = (r[c.i] ?? "").match(POINTS);
        if (m) { targets.set(c.h, Math.min(7, Math.max(1, +m[1]))); any = true; }
      }
      if (!any) skipped++;
      continue;
    }
    for (const c of cols) {
      const v = (r[c.i] ?? "").trim();
      if (!v || POINTS.test(v)) continue;
      if (REST.test(v)) { rest.add(date); continue; }
      entries.push({ habit: c.h, date, note: v.slice(0, 2000) });
      logged.set(c.h, (logged.get(c.h) ?? 0) + 1);
    }
  }

  return {
    dateColumn: header[dateIdx],
    habits: cols.map((c) => ({
      name: c.h.slice(0, 80),
      weeklyTarget: targets.get(c.h) ?? 7,
      kind: /fuck ?ups?|slips?|relapse|失敗/i.test(c.h) ? "AVOID" : "BUILD",
      logged: logged.get(c.h) ?? 0,
    })),
    entries,
    restDays: [...rest].sort(),
    skippedRows: skipped,
  };
}
