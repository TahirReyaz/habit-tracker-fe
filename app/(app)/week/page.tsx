"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import CellEditor, { type EditTarget } from "@/components/CellEditor";
import { ChevL, ChevR } from "@/components/Icons";
import { api } from "@/lib/api";
import { addDays, dowShort, fmtRange, parseIso, weekNumber } from "@/lib/dates";
import { scoreWeek } from "@/lib/score";
import { useSession } from "@/lib/session";
import type { Entry, Habit, Week } from "@/lib/types";

export default function WeekPage() {
  return (
    <Suspense fallback={<div className="page"><span className="label">Loading…</span></div>}>
      <WeekView />
    </Suspense>
  );
}

const key = (habitId: string, date: string) => `${habitId}|${date}`;

function WeekView() {
  const router = useRouter();
  const params = useSearchParams();
  const d = params.get("d") ?? undefined;
  const { label, colorOf, discreet } = useSession();

  const [week, setWeek] = useState<Week | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [mobileDay, setMobileDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const w = await api.week(d);
      setWeek(w);
      setError(null);
      setMobileDay((cur) => (cur && cur >= w.start && cur <= w.end ? cur : w.today >= w.start && w.today <= w.end ? w.today : w.start));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
  }, [d]);

  useEffect(() => {
    load();
  }, [load]);

  const entries = useMemo(() => {
    const m = new Map<string, Entry>();
    week?.entries.forEach((e) => m.set(key(e.habitId, e.date), e));
    return m;
  }, [week]);

  const score = useMemo(() => (week ? scoreWeek(week.habits, week.entries, week.start, week.today) : null), [week]);

  const go = (date: string | null) => router.push(date ? `/week?d=${date}` : "/week");

  // optimistic toggle
  const setCell = useCallback(async (habit: Habit, date: string, on: boolean, note: string | null) => {
    if (!week) return;
    const prev = week;
    const others = week.entries.filter((e) => !(e.habitId === habit.id && e.date === date));
    const next = on ? [...others, { habitId: habit.id, date, note: note?.trim() || null }] : others;
    setWeek({ ...week, entries: next });
    try {
      if (on) await api.log(habit.id, date, note);
      else await api.unlog(habit.id, date);
    } catch (e) {
      setWeek(prev);
      throw e;
    }
  }, [week]);

  const quickToggle = (habit: Habit, date: string) => {
    const existing = entries.get(key(habit.id, date));
    setCell(habit, date, !existing, existing?.note ?? null).catch((e) => setError(e.message));
  };

  const saveDay = async (date: string, restDay: boolean, note: string) => {
    const dd = await api.setDay(date, { restDay, note });
    setWeek((w) => (w ? { ...w, days: w.days.map((x) => (x.date === date ? dd : x)) } : w));
  };

  if (error && !week) return <div className="page"><p className="error">{error}</p></div>;
  if (!week || !score) return <div className="page"><span className="label">Loading…</span></div>;

  const isThisWeek = week.today >= week.start && week.today <= week.end;
  const startedHabits = week.habits.filter((h) => score.scores.find((s) => s.habitId === h.id)?.started);
  const sc = (id: string) => score.scores.find((s) => s.habitId === id)!;

  // keyboard navigation inside the ledger
  const onGridKey = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return;
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const mv = moves[e.key];
    if (mv) {
      e.preventDefault();
      const nx = document.querySelector<HTMLElement>(`[data-r="${r + mv[0]}"][data-c="${c + mv[1]}"]`);
      nx?.focus();
    } else if (e.key === " ") {
      e.preventDefault();
      const date = addDays(week.start, r);
      const h = week.habits[c];
      if (h && date <= week.today) quickToggle(h, date);
    }
  };

  const editEntry = edit?.type === "cell" ? entries.get(key(edit.habit.id, edit.date)) : undefined;
  const editDay = edit ? week.days.find((x) => x.date === edit.date) : undefined;

  return (
    <div className="page">
      <div className="week-head">
        <div>
          <div className="week-title">
            <h1 className="h1">{isThisWeek ? "This week" : fmtRange(week.start, week.end)}</h1>
            <span className="wk">W{String(weekNumber(week.start)).padStart(2, "0")} · {parseIso(week.start).getFullYear()}</span>
          </div>
          <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>{fmtRange(week.start, week.end)}</div>
        </div>
        <div className="week-nav" style={{ display: "flex", gap: 6, justifySelf: "start" }}>
          <button className="btn btn-sm btn-icon" onClick={() => go(addDays(week.start, -7))} aria-label="Previous week"><ChevL /></button>
          <button className="btn btn-sm" onClick={() => go(null)} disabled={isThisWeek}>Today</button>
          <button className="btn btn-sm btn-icon" onClick={() => go(addDays(week.start, 7))} aria-label="Next week"><ChevR /></button>
        </div>
        <div className="week-score">
          <div className="label">Points</div>
          <div className="big">{score.points}<span className="of">/{score.target}</span></div>
        </div>
      </div>

      {week.habits.length === 0 ? (
        <div className="empty">
          <p style={{ margin: "0 0 14px" }}>No habits yet. Add the columns you track — each with a weekly target.</p>
          <Link href="/habits" className="btn btn-primary">Add habits</Link>{" "}
          <Link href="/settings#import" className="btn">Import from Notion</Link>
        </div>
      ) : (
        <>
          <div className="scorebar" role="img" aria-label={`${score.points} of ${score.target} points`}>
            {startedHabits.map((h) => {
              const s = sc(h.id);
              return (
                <div key={h.id} style={{ flexGrow: h.weeklyTarget }} title={`${label(h)} ${s.points}/${s.target}`}>
                  <i style={{ width: `${(s.points / s.target) * 100}%`, background: colorOf(h) }} />
                </div>
              );
            })}
          </div>

          {/* desktop ledger */}
          <div className="ledger-wrap">
            <table className="ledger" onKeyDown={onGridKey}>
              <colgroup>
                <col className="col-day" />
                {week.habits.map((h) => <col key={h.id} />)}
                <col className="col-total" />
              </colgroup>
              <thead>
                <tr>
                  <th><span className="label">Day</span></th>
                  {week.habits.map((h) => {
                    const s = sc(h.id);
                    const hit = s.points >= s.target;
                    return (
                      <th key={h.id} style={{ opacity: s.started ? 1 : 0.5 }}>
                        <div className="hhead">
                          <div className="hhead-name">
                            <i className="swatch" style={{ background: colorOf(h) }} />
                            <span style={{ fontFamily: "var(--sans), var(--jp)" }}>{label(h)}</span>
                          </div>
                          <div className="hhead-meta">
                            <span className={hit ? "hit" : ""}>{s.points}/{s.target}{hit ? " ✓" : ""}</span>
                            {h.kind === "AVOID" && <span className="avoid-tag">AVOID</span>}
                          </div>
                          <div className="progress"><i style={{ width: `${(s.points / s.target) * 100}%`, background: colorOf(h) }} /></div>
                        </div>
                      </th>
                    );
                  })}
                  <th style={{ textAlign: "right" }}><span className="label">Done</span></th>
                </tr>
              </thead>
              <tbody>
                {week.days.map((day, r) => {
                  const future = day.date > week.today;
                  const doneCount = week.habits.filter((h) => h.kind === "BUILD" && entries.has(key(h.id, day.date))).length;
                  return (
                    <tr key={day.date} className={`${day.date === week.today ? "is-today" : ""} ${future ? "is-future" : ""} ${day.restDay ? "is-rest" : ""}`}>
                      <td className="daycell" onClick={() => setEdit({ type: "day", date: day.date })}>
                        <div className="d1">
                          <span className="dow">{dowShort(day.date)}</span>
                          <span className="dnum">{parseIso(day.date).getDate()}</span>
                        </div>
                        {day.restDay && <span className="rest">休日 rest</span>}
                        {day.note && !discreet && <div className="dnote">{day.note}</div>}
                      </td>
                      {week.habits.map((h, c) => {
                        const e = entries.get(key(h.id, day.date));
                        const on = Boolean(e);
                        const color = colorOf(h);
                        return (
                          <td key={h.id} className={`cell ${on ? "on" : ""}`} style={{ ["--hc" as string]: color }}>
                            <button
                              className="cell-btn"
                              data-r={r}
                              data-c={c}
                              disabled={future}
                              onClick={() => setEdit({ type: "cell", habit: h, date: day.date })}
                              aria-label={`${label(h)}, ${day.date}, ${on ? (h.kind === "AVOID" ? "slipped" : "done") : "empty"}`}
                            >
                              <span
                                className={`tick ${on ? "on" : ""} ${h.kind === "AVOID" ? "slip" : ""}`}
                                style={on ? { background: color } : undefined}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (!future) quickToggle(h, day.date);
                                }}
                              />
                              {e?.note ? (
                                discreet ? <span className="cell-note redacted" aria-label="hidden note" /> : <span className="cell-note">{e.note}</span>
                              ) : (
                                <span />
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="total">{future ? "" : doneCount}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td><span className="label">Total</span></td>
                  {week.habits.map((h) => {
                    const s = sc(h.id);
                    return <td key={h.id} className={s.points >= s.target ? "" : "dim"}>{s.points}/{s.target}</td>;
                  })}
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{score.points}/{score.target}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="hint hide-sm" style={{ marginTop: 10 }}>
            Click a square to tick · click a cell to add a note · <span className="kbd">←</span><span className="kbd">→</span><span className="kbd">↑</span><span className="kbd">↓</span> move · <span className="kbd">Space</span> tick · <span className="kbd">\</span> discreet · <span className="kbd">Esc</span><span className="kbd">Esc</span> panic
          </p>

          {/* mobile day view */}
          {mobileDay && (
            <MobileDay
              week={week}
              day={mobileDay}
              setDay={setMobileDay}
              entries={entries}
              scores={score.scores}
              onToggle={quickToggle}
              onOpen={(h) => setEdit({ type: "cell", habit: h, date: mobileDay })}
              onOpenDay={() => setEdit({ type: "day", date: mobileDay })}
            />
          )}
        </>
      )}

      {error && week && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

      {edit && (
        <CellEditor
          key={edit.type === "cell" ? key(edit.habit.id, edit.date) : edit.date}
          target={edit}
          entry={editEntry}
          day={editDay}
          isFuture={edit.date > week.today}
          onClose={() => setEdit(null)}
          onSaveCell={(h, date, on, note) => setCell(h, date, on, note)}
          onSaveDay={saveDay}
        />
      )}
    </div>
  );
}

function MobileDay(props: {
  week: Week;
  day: string;
  setDay: (d: string) => void;
  entries: Map<string, Entry>;
  scores: { habitId: string; points: number; target: number }[];
  onToggle: (h: Habit, date: string) => void;
  onOpen: (h: Habit) => void;
  onOpenDay: () => void;
}) {
  const { week, day, setDay, entries, scores, onToggle, onOpen, onOpenDay } = props;
  const { label, colorOf, discreet } = useSession();
  const future = day > week.today;
  const meta = week.days.find((x) => x.date === day);
  const buildCount = week.habits.filter((h) => h.kind === "BUILD").length || 1;

  return (
    <div>
      <div className="daystrip">
        {week.days.map((x) => {
          const n = week.habits.filter((h) => h.kind === "BUILD" && entries.has(key(h.id, x.date))).length;
          return (
            <button key={x.date} aria-pressed={x.date === day} className={x.date === week.today ? "today" : ""} onClick={() => setDay(x.date)}>
              <span className="ds-dow">{dowShort(x.date)}</span>
              <span className="ds-n">{parseIso(x.date).getDate()}</span>
              <span className="ds-c" style={{ background: n ? `var(--heat-${Math.min(4, Math.ceil((n / buildCount) * 4))})` : "transparent" }} />
            </button>
          );
        })}
      </div>
      <div className="dl-day">
        <span>{meta?.restDay ? <span className="rest" style={{ fontFamily: "var(--jp)" }}>休日 rest day</span> : <span className="label">{dowShort(day)} · {day}</span>}</span>
        <button className="btn btn-sm" onClick={onOpenDay}>Day note</button>
      </div>
      <div className="daylist">
        {week.habits.map((h) => {
          const e = entries.get(key(h.id, day));
          const on = Boolean(e);
          const s = scores.find((x) => x.habitId === h.id)!;
          const color = colorOf(h);
          return (
            <div key={h.id} className={`dl-row ${on ? "on" : ""}`} style={{ ["--hc" as string]: color }}>
              <button className="dl-tick" disabled={future} onClick={() => onToggle(h, day)} aria-label={`Toggle ${label(h)}`}>
                <span className={`tick ${on ? "on" : ""} ${h.kind === "AVOID" ? "slip" : ""}`} style={on ? { background: color } : undefined} />
              </button>
              <button className="dl-main" disabled={future} onClick={() => onOpen(h)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="swatch" style={{ background: color }} />
                  <span style={{ fontWeight: 500 }}>{label(h)}</span>
                  {h.kind === "AVOID" && <span className="avoid-tag">AVOID</span>}
                </div>
                {e?.note && (
                  discreet ? <span className="cell-note redacted" style={{ height: 14, marginTop: 6, display: "block" }} />
                  : <div className="cell-note dim" style={{ marginTop: 4 }}>{e.note}</div>
                )}
              </button>
              <div className="dl-pts">{s.points}/{s.target}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
