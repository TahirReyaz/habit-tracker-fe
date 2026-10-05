export type HabitKind = "BUILD" | "AVOID";

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
  note: string | null;
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
  target: number;
  started: boolean;
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
}

export const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
