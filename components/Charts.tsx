"use client";

import { useState } from "react";
import { addDays, dowShort, fmtRange, fmtShort, weekNumber } from "@/lib/dates";
import type { DayCell, WeekScore } from "@/lib/types";

type Tip = { x: number; y: number; text: string } | null;

function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  const show = (e: React.PointerEvent | React.FocusEvent, text: string) => {
    const r = (e.currentTarget as Element).getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top, text });
  };
  const node = tip ? (
    <div className="chart-tip" style={{ left: Math.min(Math.max(8, tip.x - 90), window.innerWidth - 200), top: tip.y - 34 }}>{tip.text}</div>
  ) : null;
  return { show, hide: () => setTip(null), node };
}

/** Weekly completion as square-ended columns against a 100% reference line. */
export function WeeklyBars({ weeks, today }: { weeks: WeekScore[]; today: string }) {
  const { show, hide, node } = useTip();
  const H = 180, padL = 34, padB = 22, padT = 8;
  const W = 720;
  const n = weeks.length;
  const slot = (W - padL) / Math.max(n, 1);
  const bw = Math.max(3, Math.min(28, slot - 2));
  const y = (p: number) => padT + (H - padT - padB) * (1 - Math.min(p, 1));
  const labelEvery = n > 26 ? 8 : n > 12 ? 4 : n > 6 ? 2 : 1;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Weekly completion">
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeDasharray={g === 1 ? "4 3" : undefined} />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{g * 100}%</text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const p = w.target ? w.points / w.target : 0;
          const x = padL + i * slot + (slot - bw) / 2;
          const partial = addDays(w.start, 6) >= today;
          const h = Math.max(p > 0 ? 2 : 0, y(0) - y(p));
          const text = `W${weekNumber(w.start)} · ${fmtRange(w.start, addDays(w.start, 6))} · ${w.points}/${w.target} (${Math.round(p * 100)}%)${partial ? " · in progress" : ""}`;
          return (
            <g key={w.start}>
              <rect
                x={padL + i * slot} y={padT} width={slot} height={H - padT - padB} fill="transparent"
                onPointerEnter={(e) => show(e, text)} onPointerLeave={hide}
                tabIndex={0} onFocus={(e) => show(e, text)} onBlur={hide}
              />
              <rect x={x} y={y(0) - h} width={bw} height={h} fill={partial ? "url(#hatch)" : p >= 1 ? "var(--accent)" : "var(--text-2)"} pointerEvents="none" />
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">{fmtShort(w.start)}</text>
              )}
            </g>
          );
        })}
        <defs>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill="var(--surface-3)" />
            <line x1="0" y1="0" x2="0" y2="4" stroke="var(--text-2)" strokeWidth="2" />
          </pattern>
        </defs>
      </svg>
      {node}
    </div>
  );
}

/** Calendar heatmap: columns are weeks, rows are weekdays (in the user's week order). */
export function Heatmap({ days, today }: { days: DayCell[]; today: string }) {
  const { show, hide, node } = useTip();
  const weeks: DayCell[][] = [];
  days.forEach((d, i) => {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  });
  // pixel-sized cells (not scaled) so labels stay small; fewer weeks → bigger cells
  const cell = weeks.length <= 13 ? 22 : weeks.length <= 27 ? 16 : 11, gap = 3;
  const W = 30 + weeks.length * (cell + gap);
  const H = 7 * (cell + gap) + 18;
  const level = (d: DayCell) => {
    if (d.possible === 0 || d.done === 0) return 0;
    return Math.max(1, Math.min(4, Math.ceil((d.done / d.possible) * 4)));
  };
  const rowLabel = (r: number) => dowShort(days[r]?.date ?? "2026-01-05");

  return (
    <div style={{ position: "relative", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }} role="img" aria-label="Daily activity heatmap">
        {[0, 2, 4, 6].map((r) => (
          <text key={r} x={0} y={r * (cell + gap) + cell / 2 + 3} fontSize="9" fill="var(--muted)">{rowLabel(r)}</text>
        ))}
        {weeks.map((wk, c) =>
          wk.map((d, r) => {
            const x = 30 + c * (cell + gap), yy = r * (cell + gap);
            const future = d.date > today;
            const text = `${dowShort(d.date)} ${fmtShort(d.date)} · ${d.done}/${d.possible} done${d.slips ? ` · ${d.slips} slip${d.slips > 1 ? "s" : ""}` : ""}${d.rest ? " · rest day" : ""}`;
            return (
              <g key={d.date} onPointerEnter={(e) => !future && show(e, text)} onPointerLeave={hide}>
                <rect x={x} y={yy} width={cell} height={cell}
                  fill={future ? "transparent" : `var(--heat-${level(d)})`}
                  stroke={future ? "var(--line)" : d.date === today ? "var(--text)" : "none"} strokeWidth={1} />
                {d.rest && !future && <line x1={x + 2} y1={yy + cell - 2} x2={x + cell - 2} y2={yy + 2} stroke="var(--text-2)" strokeWidth={1.5} />}
              </g>
            );
          })
        )}
        {weeks.map((wk, c) => {
          const first = wk[0];
          const prev = weeks[c - 1]?.[0];
          if (!first || (prev && first.date.slice(5, 7) === prev.date.slice(5, 7))) return null;
          return <text key={first.date} x={30 + c * (cell + gap)} y={H - 3} fontSize="9" fill="var(--muted)">{fmtShort(first.date).split(" ")[0]}</text>;
        })}
      </svg>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, fontSize: 11 }} className="muted">
        Less {[0, 1, 2, 3, 4].map((l) => <i key={l} style={{ width: 10, height: 10, background: `var(--heat-${l})`, display: "inline-block" }} />)} More
        <span style={{ marginLeft: 12 }}>╱ rest day</span>
      </div>
      {node}
    </div>
  );
}

/** Small weekly points bars for one habit, relative to its target. */
export function Spark({ values, target, color }: { values: number[]; target: number; color: string }) {
  const W = 120, H = 24, n = values.length || 1;
  const bw = W / n;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden style={{ display: "block" }}>
      <line x1={0} x2={W} y1={1} y2={1} stroke="var(--line)" strokeDasharray="2 2" />
      {values.map((v, i) => {
        const h = Math.max(v > 0 ? 1.5 : 0, (Math.min(v, target) / target) * (H - 2));
        return <rect key={i} x={i * bw + 0.5} y={H - h} width={Math.max(1, bw - 1)} height={h} fill={v >= target ? color : "var(--text-2)"} opacity={v >= target ? 1 : 0.55} />;
      })}
    </svg>
  );
}

/** Seven tiny columns, Mon..Sun reordered to the user's week start. */
export function WeekdayBars({ counts, weekStart, color }: { counts: number[]; weekStart: number; color: string }) {
  const order = Array.from({ length: 7 }, (_, i) => (weekStart - 1 + i) % 7);
  const max = Math.max(1, ...counts);
  return (
    <svg viewBox="0 0 70 24" width={70} height={24} aria-hidden style={{ display: "block" }}>
      {order.map((d, i) => {
        const h = (counts[d] / max) * 22;
        return <rect key={d} x={i * 10} y={24 - Math.max(h, counts[d] ? 1.5 : 0)} width={8} height={Math.max(h, counts[d] ? 1.5 : 0)} fill={color} />;
      })}
      <line x1={0} x2={70} y1={23.5} y2={23.5} stroke="var(--line-strong)" />
    </svg>
  );
}
