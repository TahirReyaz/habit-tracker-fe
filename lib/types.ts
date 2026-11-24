export type HabitKind = "BUILD" | "AVOID";
/**
 * CHECK = tick box, SELECT = pick from your own options, TEXT = free text — any saved entry earns the point.
 * LIMIT = an amount with an allowed min and/or max — a day outside the range is −1, otherwise 0.
 */
export type InputType = "CHECK" | "SELECT" | "TEXT" | "LIMIT";

export interface Me {
  id: string;
  email: string;
  weekStart: number; // ISO: 1 = Monday, 7 = Sunday
  lockMinutes: number;
  discreetDefault: boolean;
  hasPin: boolean;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  alias: string;
  kind: HabitKind;
  inputType: InputType;
  options: string[];
  /** SELECT only: several options may be picked on the same day */
  multiSelect: boolean;
  /** LIMIT only: allowed range (null = no bound) and display unit */
  limitMin: number | null;
  limitMax: number | null;
  unit: string | null;
  weeklyTarget: number;
  isPrivate: boolean;
  color: string;
  position: number;
  startDate: string;
  archived: boolean;
}

export interface Entry {
  habitId: string;
  date: string;
  /** the text (TEXT) or the picked options newline-joined (SELECT); null for CHECK */
  value: string | null;
  /** SELECT: the picked options (one, or several for multi-select habits) */
  values: string[];
  note: string | null;
  /** LIMIT only: the amount was outside the allowed range (−1) */
  penalty: boolean;
}

export interface Day {
  date: string;
  restDay: boolean;
  note: string | null;
}

export interface HabitWeek {
  habitId: string;
  count: number;
  points: number;
  /** target in force that week (may be overridden) */
  target: number;
  started: boolean;
  /** the habit's usual weekly target */
  baseTarget: number;
}

export interface Week {
  start: string;
  end: string;
  today: string;
  weekStart: number;
  days: Day[];
  habits: Habit[];
  entries: Entry[];
  scores: HabitWeek[];
  points: number;
  target: number;
  /** habit id → this week's overridden target (absent = usual target; 0 = excused) */
  targets: Record<string, number>;
}

export interface WeekScore {
  start: string;
  points: number;
  target: number;
  habits: HabitWeek[];
}

export interface HabitStats {
  habitId: string;
  totalDays: number;
  weeksCounted: number;
  weeksHit: number;
  hitRate: number;
  avgPerWeek: number;
  currentWeekStreak: number;
  longestWeekStreak: number;
  currentDayStreak: number;
  longestDayStreak: number;
  weekday: number[]; // Mon..Sun
  weekly: number[];
}

export interface DayCell {
  date: string;
  done: number;
  possible: number;
  slips: number;
  rest: boolean;
}

export interface Stats {
  from: string;
  to: string;
  weeks: WeekScore[];
  habits: HabitStats[];
  days: DayCell[];
  thisWeekPoints: number;
  thisWeekTarget: number;
  avgPct: number;
  bestWeekStart: string | null;
  bestWeekPct: number;
  totalLogs: number;
  restDays: number;
  perfectWeeks: number;
}

export interface StatsResponse {
  habits: Habit[];
  stats: Stats;
  /** SELECT habit id → option → days picked in range (most used first) */
  optionCounts: Record<string, Record<string, number>>;
  /** LIMIT habit id → summary of logged amounts in range */
  limitStats: Record<string, LimitStat>;
}

export interface LimitStat {
  days: number;
  avg: number | null;
  lowest: number | null;
  highest: number | null;
  over: number;
  under: number;
}

/** "≤ 120 min", "≥ 7 h", "6–9 h" */
export function limitLabel(h: Pick<Habit, "limitMin" | "limitMax" | "unit">): string {
  const u = h.unit ? ` ${h.unit}` : "";
  if (h.limitMin != null && h.limitMax != null) return `${h.limitMin}–${h.limitMax}${u}`;
  if (h.limitMax != null) return `≤ ${h.limitMax}${u}`;
  if (h.limitMin != null) return `≥ ${h.limitMin}${u}`;
  return "no limit set";
}

/** Same rule as the server: bounds are inclusive. */
export function breaksLimit(h: Pick<Habit, "limitMin" | "limitMax">, amount: number): boolean {
  return (h.limitMin != null && amount < h.limitMin) || (h.limitMax != null && amount > h.limitMax);
}

/** Accepts "90", "1.5", "1,5", "1 234"; null when it isn't a number. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/[\s\u00a0]/g, "");
  if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
