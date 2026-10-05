"use client";

import { useState } from "react";
import type { HabitInput } from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { PALETTE, type Habit, type HabitKind } from "@/lib/types";

export default function HabitForm({ initial, onSubmit, onCancel, submitLabel, nextColor }: {
  initial?: Habit;
  onSubmit: (h: HabitInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  nextColor?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<HabitKind>(initial?.kind ?? "BUILD");
  const [target, setTarget] = useState(initial?.weeklyTarget ?? 3);
  const [color, setColor] = useState(initial?.color ?? nextColor ?? PALETTE[0]);
  const [isPrivate, setPrivate] = useState(initial?.isPrivate ?? false);
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayIso());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Give it a name");
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({ name: name.trim(), kind, weeklyTarget: target, color, isPrivate, alias: alias.trim(), startDate });
      if (!initial) {
        setName(""); setAlias(""); setPrivate(false); setKind("BUILD"); setTarget(3);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <div className="field full">
        <label className="label" htmlFor="hn">Name</label>
        <input id="hn" className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. 日本語勉強, Coding, 筋トレ" autoComplete="off" />
      </div>

      <div className="field">
        <span className="label">Type</span>
        <div className="seg" role="group" aria-label="Type">
          <button type="button" aria-pressed={kind === "BUILD"} onClick={() => setKind("BUILD")}>Build — do it</button>
          <button type="button" aria-pressed={kind === "AVOID"} onClick={() => { setKind("AVOID"); setTarget(7); }}>Avoid — don&apos;t</button>
        </div>
        <span className="hint">{kind === "BUILD" ? "A day counts when you log it." : "A day counts unless you log a slip."}</span>
      </div>

      <div className="field">
        <span className="label">Weekly target</span>
        <div className="seg" role="group" aria-label="Weekly target">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button type="button" key={n} aria-pressed={target === n} onClick={() => setTarget(n)}>{n}</button>
          ))}
        </div>
        <span className="hint">{target} point{target > 1 ? "s" : ""} available per week.</span>
      </div>

      <div className="field">
        <span className="label">Colour</span>
        <div className="swatches" role="group" aria-label="Colour">
          {PALETTE.map((c) => (
            <button type="button" key={c} style={{ background: c }} aria-pressed={color === c} aria-label={c} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="hs">Counting from</label>
        <input id="hs" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>

      <div className="field full" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <label className="check">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} />
          <span>Private — hide the name in discreet mode</span>
        </label>
        {isPrivate && (
          <div className="field" style={{ marginTop: 10, maxWidth: 360 }}>
            <label className="label" htmlFor="ha">Shown as</label>
            <input id="ha" className="input" value={alias} maxLength={40} onChange={(e) => setAlias(e.target.value)} placeholder="Habit A (default)" />
            <span className="hint">Pick something boring. Shown instead of the real name and in grey.</span>
          </div>
        )}
      </div>

      {err && <p className="error full">{err}</p>}
      <div className="full" style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
