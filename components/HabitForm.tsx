"use client";

import { useState } from "react";
import type { HabitInput } from "@/lib/api";
import { todayIso, weekStartOf } from "@/lib/dates";
import { useSession } from "@/lib/session";
import { PALETTE, type Habit, type HabitKind, type InputType } from "@/lib/types";

type OptRow = { orig: string | null; text: string };

const INPUTS: { v: InputType; label: string; hint: string }[] = [
  { v: "CHECK", label: "Checkbox", hint: "Tick the day. You can still add a note." },
  { v: "SELECT", label: "Dropdown", hint: "Pick one of your own options, e.g. Gym / Run / Swim. New options can also be created while logging." },
  { v: "TEXT", label: "Text", hint: "Write what you did. Any text earns the point." },
];

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
  const [inputType, setInputType] = useState<InputType>(initial?.inputType ?? "CHECK");
  const [multiSelect, setMultiSelect] = useState(initial?.multiSelect ?? false);
  const [opts, setOpts] = useState<OptRow[]>((initial?.options ?? []).map((o) => ({ orig: o, text: o })));
  const [newOpt, setNewOpt] = useState("");
  const [color, setColor] = useState(initial?.color ?? nextColor ?? PALETTE[0]);
  const [isPrivate, setPrivate] = useState(initial?.isPrivate ?? false);
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const { me } = useSession();
  // new habits count from the start of this week, so days already logged this week score
  const [startDate, setStartDate] = useState(initial?.startDate ?? weekStartOf(todayIso(), me.weekStart));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Give it a name");
    setBusy(true);
    setErr(null);
    try {
      const kept = opts.filter((o) => o.text.trim());
      const optionRenames: Record<string, string> = {};
      kept.forEach((o) => { if (o.orig && o.orig !== o.text.trim()) optionRenames[o.orig] = o.text.trim(); });
      await onSubmit({
        name: name.trim(), kind, inputType, weeklyTarget: target, color, isPrivate, alias: alias.trim(), startDate,
        options: kept.map((o) => o.text.trim()),
        optionRenames,
        multiSelect: inputType === "SELECT" && multiSelect,
      });
      if (!initial) {
        setName(""); setAlias(""); setPrivate(false); setKind("BUILD"); setTarget(3); setInputType("CHECK"); setOpts([]); setMultiSelect(false);
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

      <div className="field full">
        <span className="label">Logged as</span>
        <div className="seg" role="group" aria-label="Logged as">
          {INPUTS.map((i) => (
            <button type="button" key={i.v} aria-pressed={inputType === i.v} onClick={() => setInputType(i.v)}>{i.label}</button>
          ))}
        </div>
        <span className="hint">{INPUTS.find((i) => i.v === inputType)!.hint}</span>
      </div>

      {inputType === "SELECT" && (
        <div className="field full">
          <label className="check" style={{ marginBottom: 6 }}>
            <input type="checkbox" checked={multiSelect} onChange={(e) => setMultiSelect(e.target.checked)} />
            <span>Multi-select — allow several options on the same day</span>
          </label>
          <span className="label">Options</span>
          <div className="opt-editor">
            {opts.map((o, i) => (
              <div className="opt-row" key={i}>
                <input className="input" value={o.text} maxLength={60} aria-label={`Option ${i + 1}`}
                  onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                <button type="button" className="btn btn-sm" onClick={() => setOpts(opts.filter((_, j) => j !== i))} aria-label="Remove option">Remove</button>
              </div>
            ))}
            <div className="opt-row">
              <input className="input" value={newOpt} maxLength={60} placeholder="Add an option…"
                onChange={(e) => setNewOpt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = newOpt.trim();
                    if (t && !opts.some((x) => x.text.trim().toLowerCase() === t.toLowerCase())) setOpts([...opts, { orig: null, text: t }]);
                    setNewOpt("");
                  }
                }} />
              <button type="button" className="btn btn-sm" disabled={!newOpt.trim()} onClick={() => {
                const t = newOpt.trim();
                if (t && !opts.some((x) => x.text.trim().toLowerCase() === t.toLowerCase())) setOpts([...opts, { orig: null, text: t }]);
                setNewOpt("");
              }}>Add</button>
            </div>
          </div>
          <span className="hint">
            {initial ? "Renaming an option also renames it on past days. Removing one keeps past days as they are." : "Optional — you can also start empty and create options while logging."}
          </span>
        </div>
      )}

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
        <span className="hint">Logging an earlier day moves this back automatically.</span>
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
