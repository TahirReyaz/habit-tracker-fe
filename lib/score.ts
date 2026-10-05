import type { Entry, Habit, HabitWeek } from "./types";
import { addDays } from "./dates";

/** Client copy of the server's weekly rules, so ticking a cell updates the score instantly. */
export function scoreWeek(habits: Habit[], entries: Entry[], start: string, today: string) {
  const end = addDays(start, 6);
  const by = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.date < start || e.date > end) continue;
    if (!by.has(e.habitId)) by.set(e.habitId, new Set());
    by.get(e.habitId)!.add(e.date);
  }
  let points = 0, target = 0;
  const scores: HabitWeek[] = habits.map((h) => {
    const days = by.get(h.id) ?? new Set<string>();
    const started = h.startDate <= end;
    let count = 0, pts = 0;
    if (started) {
      if (h.kind === "BUILD") {
        count = [...days].filter((d) => d >= h.startDate).length;
        pts = Math.min(count, h.weeklyTarget);
      } else {
        let eligible = 0, slips = 0;
        for (let i = 0; i < 7; i++) {
          const d = addDays(start, i);
          if (d < h.startDate || d > today) continue;
          eligible++;
          if (days.has(d)) slips++;
        }
        count = slips;
        pts = Math.min(eligible - slips, h.weeklyTarget);
      }
      points += pts;
      target += h.weeklyTarget;
    }
    return { habitId: h.id, count, points: pts, target: h.weeklyTarget, started };
  });
  return { scores, points, target };
}
