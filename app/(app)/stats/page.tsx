"use client";

import { useEffect, useMemo, useState } from "react";
import { Heatmap, Spark, WeekdayBars, WeeklyBars } from "@/components/Charts";
import { api } from "@/lib/api";
import { addDays, dowName, fmtRange, pct, todayIso } from "@/lib/dates";
import { useSession } from "@/lib/session";
import type { Habit, HabitStats, StatsResponse } from "@/lib/types";

const RANGES = [4, 12, 26, 52];

export default function StatsPage() {
  const { me, label, colorOf } = useSession();
  const [weeks, setWeeks] = useState(12);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    let alive = true;
    api.stats(weeks).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [weeks]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.habits
      .map((h) => ({ h, s: data.stats.habits.find((x) => x.habitId === h.id)! }))
      .filter((r) => r.s && (!r.h.archived || r.s.totalDays > 0));
  }, [data]);

  const insights = useMemo(() => (data ? buildInsights(data, rows, label) : []), [data, rows, label]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><span className="label">Loading…</span></div>;

  const st = data.stats;
  const today = todayIso();
  const thisPct = st.thisWeekTarget ? st.thisWeekPoints / st.thisWeekTarget : 0;
  const completedWeeks = st.weeks.filter((w) => addDays(w.start, 6) < today && w.target > 0).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="label">Statistics</div>
          <h1 className="h1">Last {weeks} weeks</h1>
          <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>{fmtRange(st.from, st.to)}</div>
        </div>
        <div className="rangebar">
          <div className="seg" role="group" aria-label="Range">
            {RANGES.map((r) => (
              <button key={r} aria-pressed={weeks === r} onClick={() => setWeeks(r)}>{r}w</button>
            ))}
          </div>
        </div>
      </div>

      {data.habits.length === 0 ? (
        <div className="empty">Add habits and log a few days — statistics show up here.</div>
      ) : (
        <>
          <div className="kpis">
            <Kpi label="This week" value={`${st.thisWeekPoints}/${st.thisWeekTarget}`} sub={`${pct(thisPct)} so far`} />
            <Kpi label="Avg completion" value={completedWeeks ? pct(st.avgPct) : "—"} sub={`over ${completedWeeks} finished week${completedWeeks === 1 ? "" : "s"}`} />
            <Kpi label="Perfect weeks" value={String(st.perfectWeeks)} sub="every target hit" />
            <Kpi label="Best week" value={st.bestWeekStart ? pct(st.bestWeekPct) : "—"} sub={st.bestWeekStart ? fmtRange(st.bestWeekStart, addDays(st.bestWeekStart, 6)) : ""} />
            <Kpi label="Logged" value={String(st.totalLogs)} sub="entries in range" />
            <Kpi label="Rest days" value={String(st.restDays)} sub="休日 taken" />
          </div>

          <div className="grid-2 section">
            <div className="card">
              <div className="section-head" style={{ marginBottom: 10 }}>
                <h2 className="h2">Weekly score</h2>
                <span className="label">points ÷ target</span>
              </div>
              <WeeklyBars weeks={st.weeks} today={today} />
              <div className="hint" style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                <span><i className="swatch" style={{ background: "var(--accent)" }} /> target hit</span>
                <span><i className="swatch" style={{ background: "var(--text-2)" }} /> below target</span>
                <span>▨ current week</span>
              </div>
            </div>
            <div className="card">
              <div className="section-head" style={{ marginBottom: 4 }}>
                <h2 className="h2">Analysis</h2>
              </div>
              <ul className="insights">
                {insights.map((t, i) => (
                  <li key={i}><span className="ix">{String(i + 1).padStart(2, "0")}</span><span>{t}</span></li>
                ))}
                {insights.length === 0 && <li><span className="ix">—</span><span className="dim">Log a couple of weeks to see patterns.</span></li>}
              </ul>
            </div>
          </div>

          <div className="card section">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <h2 className="h2">Daily activity</h2>
              <span className="label">share of habits done each day</span>
            </div>
            <Heatmap days={st.days} today={today} />
          </div>

          <div className="section">
            <div className="section-head">
              <h2 className="h2">By habit</h2>
              <div className="seg" role="group" aria-label="View">
                <button aria-pressed={view === "chart"} onClick={() => setView("chart")}>Visual</button>
                <button aria-pressed={view === "table"} onClick={() => setView("table")}>Numbers</button>
              </div>
            </div>
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Habit</th>
                    <th className="r">Weeks hit</th>
                    <th className="r">Avg / wk</th>
                    <th className="r hide-md">{"Days"}</th>
                    <th className="r">Streak</th>
                    <th className="r hide-md">Best</th>
                    {view === "chart" ? (
                      <>
                        <th className="hide-md">Weekly</th>
                        <th className="hide-md">By weekday</th>
                      </>
                    ) : (
                      <th className="r hide-md">Day streak</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ h, s }) => (
                    <tr key={h.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <i className="swatch" style={{ background: colorOf(h) }} />
                          <span>{label(h)}</span>
                          {h.kind === "AVOID" && <span className="avoid-tag">AVOID</span>}
                          {h.archived && <span className="avoid-tag">ARCHIVED</span>}
                        </div>
                      </td>
                      <td className="r num">{s.weeksHit}/{s.weeksCounted} <span className="muted">{s.weeksCounted ? pct(s.hitRate) : ""}</span></td>
                      <td className="r num">{s.avgPerWeek.toFixed(1)}<span className="muted">/{h.weeklyTarget}</span></td>
                      <td className="r num hide-md" title={h.kind === "AVOID" ? "clean days" : "logged days"}>{s.totalDays}</td>
                      <td className="r num">{s.currentWeekStreak}w</td>
                      <td className="r num hide-md">{s.longestWeekStreak}w</td>
                      {view === "chart" ? (
                        <>
                          <td className="hide-md"><Spark values={s.weekly} target={h.weeklyTarget} color={colorOf(h)} /></td>
                          <td className="hide-md" title={h.kind === "AVOID" ? "slips by weekday" : "logs by weekday"}>
                            <WeekdayBars counts={s.weekday} weekStart={me.weekStart} color={h.kind === "AVOID" ? "var(--bad)" : colorOf(h)} />
                          </td>
                        </>
                      ) : (
                        <td className="r num hide-md">{s.currentDayStreak}d <span className="muted">best {s.longestDayStreak}d</span></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ marginTop: 8 }}>
              Weeks hit counts finished weeks (plus this week once its target is reached). Streak = consecutive weeks on target.
              For AVOID habits, days = clean days and weekday bars show when slips happen.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="v">{value}</div>
      <div className="s">{sub}</div>
    </div>
  );
}

function buildInsights(data: StatsResponse, rows: { h: Habit; s: HabitStats }[], label: (h: Habit) => string): string[] {
  const out: string[] = [];
  const st = data.stats;
  const today = todayIso();
  const counted = rows.filter((r) => r.s.weeksCounted >= 2 && !r.h.archived);

  if (counted.length) {
    const best = [...counted].sort((a, b) => b.s.hitRate - a.s.hitRate || b.s.avgPerWeek - a.s.avgPerWeek)[0];
    out.push(`${label(best.h)} is your most reliable habit — target hit in ${best.s.weeksHit} of ${best.s.weeksCounted} weeks (${pct(best.s.hitRate)}).`);
    const worst = [...counted].sort((a, b) => a.s.hitRate - b.s.hitRate || a.s.avgPerWeek - b.s.avgPerWeek)[0];
    if (worst.h.id !== best.h.id && worst.s.hitRate < 0.6) {
      const suggested = Math.max(1, Math.round(worst.s.avgPerWeek + 0.5));
      const tip = worst.h.kind === "BUILD" && suggested < worst.h.weeklyTarget ? ` — a target of ${suggested} would match what you actually do` : "";
      const what = worst.h.kind === "AVOID" ? "clean days" : "days";
      out.push(`${label(worst.h)} needs attention: ${worst.s.avgPerWeek.toFixed(1)} of ${worst.h.weeklyTarget} ${what} per week, target hit ${pct(worst.s.hitRate)} of the time${tip}.`);
    }
  }

  // momentum: last 4 finished weeks vs the 4 before
  const finished = st.weeks.filter((w) => addDays(w.start, 6) < today && w.target > 0);
  if (finished.length >= 6) {
    const avg = (ws: typeof finished) => ws.reduce((a, w) => a + w.points / w.target, 0) / ws.length;
    const recent = finished.slice(-4), prior = finished.slice(-8, -4);
    if (prior.length >= 2) {
      const delta = Math.round((avg(recent) - avg(prior)) * 100);
      if (Math.abs(delta) >= 3) out.push(`Momentum is ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} points: last 4 weeks averaged ${pct(avg(recent))} vs ${pct(avg(prior))} before.`);
      else out.push(`Steady: the last 4 weeks averaged ${pct(avg(recent))}, about the same as before.`);
    }
  }

  // weekday patterns across BUILD habits
  const build = rows.filter((r) => r.h.kind === "BUILD");
  if (build.length) {
    const sum = [0, 0, 0, 0, 0, 0, 0];
    build.forEach((r) => r.s.weekday.forEach((v, i) => (sum[i] += v)));
    const total = sum.reduce((a, b) => a + b, 0);
    if (total >= 10) {
      const hi = sum.indexOf(Math.max(...sum)), lo = sum.indexOf(Math.min(...sum));
      out.push(`${dowName(hi)} is your strongest day (${Math.round((sum[hi] / total) * 100)}% of logs); ${dowName(lo)} is the quietest.`);
    }
  }

  // slips cluster
  rows.filter((r) => r.h.kind === "AVOID").forEach((r) => {
    const slips = r.s.weekday.reduce((a, b) => a + b, 0);
    if (slips >= 3) {
      const d = r.s.weekday.indexOf(Math.max(...r.s.weekday));
      out.push(`${label(r.h)}: ${slips} slips in range, most often on ${dowName(d)}s. Current clean run: ${r.s.currentDayStreak} day${r.s.currentDayStreak === 1 ? "" : "s"}.`);
    }
  });

  const streak = [...rows].filter((r) => !r.h.archived).sort((a, b) => b.s.currentWeekStreak - a.s.currentWeekStreak)[0];
  if (streak && streak.s.currentWeekStreak >= 2) {
    out.push(`${label(streak.h)} is on a ${streak.s.currentWeekStreak}-week streak${streak.s.currentWeekStreak >= streak.s.longestWeekStreak ? " — your longest yet" : ` (best: ${streak.s.longestWeekStreak})`}.`);
  }

  if (st.restDays > 0 && st.weeks.length >= 4) {
    out.push(`You took ${st.restDays} rest day${st.restDays === 1 ? "" : "s"} in this period.`);
  }
  return out.slice(0, 6);
}
