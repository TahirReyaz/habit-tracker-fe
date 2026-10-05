// All dates travel as ISO "YYYY-MM-DD" strings and are handled as local calendar days.

export function todayIso(): string {
  return toIso(new Date());
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** ISO weekday: 1 = Monday ... 7 = Sunday */
export function isoDow(s: string): number {
  const g = parseIso(s).getDay();
  return g === 0 ? 7 : g;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dowShort(s: string): string {
  return DOW[isoDow(s) - 1];
}

export function dowName(i: number): string {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i];
}

export function fmtShort(s: string): string {
  const d = parseIso(s);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

export function fmtRange(a: string, b: string): string {
  const da = parseIso(a), db = parseIso(b);
  if (da.getMonth() === db.getMonth()) return `${MON[da.getMonth()]} ${da.getDate()}–${db.getDate()}`;
  return `${fmtShort(a)} – ${fmtShort(b)}`;
}

/** ISO-8601 week number */
export function weekNumber(s: string): number {
  const d = parseIso(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
