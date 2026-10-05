"use client";

import { useState } from "react";
import { fmtRange } from "@/lib/dates";
import { useSession } from "@/lib/session";
import type { Habit } from "@/lib/types";

/** Change one habit's target for one week only (holiday, sick day, trip…). */
export default function TargetEditor({ habit, weekStart, weekEnd, current, onSave, onClose }: {
  habit: Habit;
  weekStart: string;
  weekEnd: string;
  current: number;
  onSave: (target: number | null) => Promise<void>;
  onClose: () => void;
}) {
  const { label, colorOf } = useSession();
  const [target, setTarget] = useState(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const usual = habit.weeklyTarget;

  async function save(t: number | null) {
    setBusy(true);
    setErr(null);
    try {
      await onSave(t);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal aria-label="Target for this week"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); if (e.key === "Enter") save(target === usual ? null : target); }}>
        <div className="modal-body">
          <div className="label">Target for {fmtRange(weekStart, weekEnd)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 18px" }}>
            <i className="swatch" style={{ background: colorOf(habit), width: 10, height: 10 }} />
            <span className="h2">{label(habit)}</span>
          </div>

          <div className="stepper">
            <button className="btn" onClick={() => setTarget(Math.max(0, target - 1))} disabled={target <= 0} aria-label="Lower target">−</button>
            <div className="stepper-value">
              <span className="num">{target === 0 ? "Off" : target}</span>
              <span className="hint">{target === 0 ? "excused this week" : `of 7 days · usually ${usual}`}</span>
            </div>
            <button className="btn" onClick={() => setTarget(Math.min(7, target + 1))} disabled={target >= 7} aria-label="Raise target">+</button>
          </div>

          <p className="hint" style={{ margin: "14px 0 0" }}>
            Only this week changes — e.g. a public holiday takes the office target from {usual} to {Math.max(0, usual - 1)}.
            &quot;Off&quot; leaves the habit out of this week&apos;s total and streaks.
          </p>
          {err && <p className="error">{err}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => save(null)} disabled={busy || current === usual}>Reset to {usual}</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={() => save(target === usual ? null : target)} disabled={busy || target === current}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
