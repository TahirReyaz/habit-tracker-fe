import type { Entry, Habit, HabitWeek } from "./types";
import { addDays } from "./dates";

/** Client copy of the server's weekly rules, so ticking a cell updates the score instantly. */
/** targets: per-week overrides (habit id → target); 0 excuses the habit for the week. */
export function scoreWeek(habits: Habit[], entries: Entry[], start: string, today: string, targets: Record<string, number> = {}) {
  const end = addDays(start, 6);
  const by = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.date < start || e.date > end) continue;
    if (!by.has(e.habitId)) by.set(e.habitId, new Set());
    by.get(e.habitId)!.add(e.date);
  }
  let points = 0, total = 0;
  const scores: HabitWeek[] = habits.map((h) => {
    const days = by.get(h.id) ?? new Set<string>();
    const started = h.startDate <= end;
    const target = targets[h.id] ?? h.weeklyTarget;
    let count = 0, pts = 0;
    if (started) {
      if (h.kind === "BUILD") {
        count = [...days].filter((d) => d >= h.startDate).length;
        pts = Math.min(count, target);
      } else {
        let eligible = 0, slips = 0;
        for (let i = 0; i < 7; i++) {
          const d = addDays(start, i);
          if (d < h.startDate || d > today) continue;
          eligible++;
          if (days.has(d)) slips++;
        }
        count = slips;
        pts = Math.min(eligible - slips, target);
      }
      points += pts;
      total += target;
    }
    return { habitId: h.id, count, points: pts, target, started, baseTarget: h.weeklyTarget };
  });
  return { scores, points, target: total };
}
