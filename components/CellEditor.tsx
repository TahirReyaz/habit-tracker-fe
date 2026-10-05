"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import type { LogPayload } from "@/lib/api";
import type { Day, Entry, Habit } from "@/lib/types";
import { dowName, fmtShort, isoDow } from "@/lib/dates";
import { CloseIcon, PlusIcon } from "./Icons";

export type EditTarget = { type: "cell"; habit: Habit; date: string } | { type: "day"; date: string };

interface Props {
  target: EditTarget;
  entry?: Entry;
  day?: Day;
  isFuture: boolean;
  onClose: () => void;
  /** on=false removes the entry (and the point) */
  onSaveCell: (habit: Habit, date: string, on: boolean, payload: LogPayload) => Promise<void>;
  onSaveDay: (date: string, restDay: boolean, note: string) => Promise<void>;
}

export default function CellEditor({ target, entry, day, isFuture, onClose, onSaveCell, onSaveDay }: Props) {
  const { label, discreet, requestReveal, colorOf } = useSession();
  const habit = target.type === "cell" ? target.habit : null;
  const input = habit?.inputType ?? "CHECK";
  const avoid = habit?.kind === "AVOID";

  const [on, setOn] = useState<boolean>(habit ? Boolean(entry) : Boolean(day?.restDay));
  const [value, setValue] = useState<string>(entry?.value ?? "");
  const multi = Boolean(habit?.multiSelect);
  const [picked, setPicked] = useState<string[]>(entry?.values ?? []);
  const [note, setNote] = useState<string>((habit ? entry?.note : day?.note) ?? "");
  const [options, setOptions] = useState<string[]>(habit?.options ?? []);
  const [newOpt, setNewOpt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const hasHidden = discreet && Boolean(habit ? entry?.note || entry?.value : day?.note);

  function toggle(o: string) {
    if (multi) setPicked(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]);
    else setPicked(picked[0] === o ? [] : [o]);
  }

  useEffect(() => {
    if (!hasHidden && (input === "TEXT" || !habit)) textRef.current?.focus();
  }, [hasHidden, input, habit]);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      if (habit) {
        if (input === "CHECK") {
          // writing a note implies the day counts
          const effectiveOn = on || (note.trim().length > 0 && !entry);
          await onSaveCell(habit, target.date, effectiveOn, { note });
        } else if (input === "SELECT") {
          await onSaveCell(habit, target.date, picked.length > 0, { values: picked, note });
        } else {
          await onSaveCell(habit, target.date, value.trim().length > 0, { value: value.trim() || null });
        }
      } else {
        await onSaveDay(target.date, on, note);
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  function addOption() {
    const o = newOpt.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!o) return;
    const existing = options.find((x) => x.toLowerCase() === o.toLowerCase());
    if (!existing) setOptions([...options, o]);
    const chosen = existing ?? o;
    setPicked(multi ? (picked.includes(chosen) ? picked : [...picked, chosen]) : [chosen]);
    setNewOpt("");
  }

  const dateLabel = `${dowName(isoDow(target.date) - 1)}, ${fmtShort(target.date)}`;
  const disabled = isFuture && Boolean(habit);

  const hiddenBox = (
    <div className="empty" style={{ padding: 18 }}>
      Hidden in discreet mode.{" "}
      <button className="btn btn-sm" style={{ marginLeft: 6 }} onClick={requestReveal}>Reveal</button>
    </div>
  );

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside
        className="panel"
        role="dialog"
        aria-modal
        aria-label="Edit"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="panel-head">
          <div style={{ minWidth: 0 }}>
            <div className="label">{dateLabel}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              {habit && <span className="swatch" style={{ background: colorOf(habit), width: 10, height: 10 }} />}
              <span className="h2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {habit ? label(habit) : "Day"}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <div className="panel-body">
          {!habit && (
            <>
              <label className="check">
                <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
                <span>Rest day <span className="dim" style={{ fontFamily: "var(--jp)" }}>休日</span></span>
              </label>
              <div className="field" style={{ marginTop: 18 }}>
                <label className="label" htmlFor="note">Day note</label>
                {hasHidden ? hiddenBox : (
                  <textarea id="note" ref={textRef} className="textarea" rows={6} maxLength={2000}
                    placeholder="Anything about the day" value={note} onChange={(e) => setNote(e.target.value)} />
                )}
              </div>
            </>
          )}

          {habit && input === "CHECK" && (
            <>
              <div className="toggle-row" role="group" aria-label="Status">
                <button aria-pressed={!on} onClick={() => setOn(false)} disabled={disabled}>{avoid ? "Clean" : "Not done"}</button>
                <button aria-pressed={on} onClick={() => setOn(true)} disabled={disabled}>{avoid ? "Slipped" : "Done"}</button>
              </div>
              <NoteField hidden={hasHidden} hiddenBox={hiddenBox} note={note} setNote={setNote} disabled={disabled}
                label={avoid ? "What happened (optional)" : "Note (optional)"} />
            </>
          )}

          {habit && input === "SELECT" && (
            <>
              <div className="label" style={{ marginBottom: 8 }}>
                {avoid ? "What happened" : multi ? "Pick any" : "Pick one"}
                {multi && picked.length > 0 && <span className="muted"> · {picked.length} selected</span>}
              </div>
              {hasHidden ? hiddenBox : (
                <div className={`optgrid ${multi ? "multi" : ""}`} role={multi ? "group" : "radiogroup"} aria-label="Options">
                  {options.map((o) => (
                    <button key={o} role={multi ? "checkbox" : "radio"} aria-checked={picked.includes(o)} disabled={disabled}
                      onClick={() => toggle(o)}>{o}</button>
                  ))}
                  {options.length === 0 && <span className="hint" style={{ padding: "8px 0" }}>No options yet — create the first one below.</span>}
                </div>
              )}
              <div style={{ display: "flex", gap: 0, marginTop: 10 }}>
                <input className="input" placeholder="New option…" value={newOpt} maxLength={60} disabled={disabled}
                  onChange={(e) => setNewOpt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }} />
                <button className="btn" style={{ height: 36, borderLeft: 0 }} onClick={addOption} disabled={disabled || !newOpt.trim()}>
                  <PlusIcon /> Add
                </button>
              </div>
              <span className="hint">
                {multi ? "Pick as many as apply — any pick earns the day's point (once)." : "Picking an option earns the day's point."} New options are saved to this habit.
              </span>
              <NoteField hidden={hasHidden} hiddenBox={hiddenBox} note={note} setNote={setNote} disabled={disabled} label="Note (optional)" />
            </>
          )}

          {habit && input === "TEXT" && (
            <div className="field">
              <label className="label" htmlFor="val">{avoid ? "What happened" : "What you did"}</label>
              {hasHidden ? hiddenBox : (
                <textarea id="val" ref={textRef} className="textarea" rows={7} maxLength={2000} disabled={disabled}
                  placeholder={avoid ? "Describe the slip" : "e.g. Chapter 4 problems, 45 min"}
                  value={value} onChange={(e) => setValue(e.target.value)} />
              )}
              <span className="hint">Any text earns the day&apos;s point — leave it empty for no point.</span>
            </div>
          )}

          {disabled && <p className="hint" style={{ marginTop: 8 }}>This day hasn&apos;t happened yet.</p>}
          <p className="hint" style={{ marginTop: 14 }}>Encrypted before it is stored. <span className="kbd">Ctrl</span> <span className="kbd">Enter</span> to save.</p>
          {err && <p className="error">{err}</p>}
        </div>

        <div className="panel-foot">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            {habit && entry && input !== "CHECK" && (
              <button className="btn btn-danger" disabled={busy} onClick={async () => {
                setBusy(true);
                try { await onSaveCell(habit, target.date, false, {}); onClose(); }
                catch (e) { setErr(e instanceof Error ? e.message : "Could not clear"); setBusy(false); }
              }}>Clear</button>
            )}
          </div>
          <button className="btn btn-primary" onClick={save} disabled={busy || disabled}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </aside>
    </>
  );
}

function NoteField({ hidden, hiddenBox, note, setNote, disabled, label }: {
  hidden: boolean; hiddenBox: React.ReactNode; note: string; setNote: (s: string) => void; disabled: boolean; label: string;
}) {
  return (
    <div className="field" style={{ marginTop: 18 }}>
      <label className="label" htmlFor="note">{label}</label>
      {hidden ? hiddenBox : (
        <textarea id="note" className="textarea" rows={4} maxLength={2000} disabled={disabled}
          placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
      )}
    </div>
  );
}
