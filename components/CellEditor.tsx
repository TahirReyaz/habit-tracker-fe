"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import type { Day, Entry, Habit } from "@/lib/types";
import { dowName, fmtShort, isoDow } from "@/lib/dates";
import { CloseIcon } from "./Icons";

export type EditTarget = { type: "cell"; habit: Habit; date: string } | { type: "day"; date: string };

interface Props {
  target: EditTarget;
  entry?: Entry;
  day?: Day;
  isFuture: boolean;
  onClose: () => void;
  onSaveCell: (habit: Habit, date: string, on: boolean, note: string) => Promise<void>;
  onSaveDay: (date: string, restDay: boolean, note: string) => Promise<void>;
}

export default function CellEditor({ target, entry, day, isFuture, onClose, onSaveCell, onSaveDay }: Props) {
  const { label, discreet, requestReveal, colorOf } = useSession();
  const isCell = target.type === "cell";
  const [on, setOn] = useState<boolean>(isCell ? Boolean(entry) : Boolean(day?.restDay));
  const [note, setNote] = useState<string>((isCell ? entry?.note : day?.note) ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const noteHidden = discreet && Boolean(isCell ? entry?.note : day?.note);

  useEffect(() => {
    if (!noteHidden) ref.current?.focus();
  }, [noteHidden]);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      if (target.type === "cell") {
        // writing a note implies the day counts
        const effectiveOn = on || (note.trim().length > 0 && !entry);
        await onSaveCell(target.habit, target.date, effectiveOn, note);
      } else {
        await onSaveDay(target.date, on, note);
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  const avoid = isCell && target.habit.kind === "AVOID";
  const dateLabel = `${dowName(isoDow(target.date) - 1)}, ${fmtShort(target.date)}`;

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
              {isCell && <span className="swatch" style={{ background: colorOf(target.habit), width: 10, height: 10 }} />}
              <span className="h2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isCell ? label(target.habit) : "Day"}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <div className="panel-body">
          {isCell ? (
            <div className="toggle-row" role="group" aria-label="Status">
              <button aria-pressed={!on} onClick={() => setOn(false)} disabled={isFuture}>{avoid ? "Clean" : "Not done"}</button>
              <button aria-pressed={on} onClick={() => setOn(true)} disabled={isFuture}>{avoid ? "Slipped" : "Done"}</button>
            </div>
          ) : (
            <label className="check">
              <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
              <span>Rest day <span className="dim" style={{ fontFamily: "var(--jp)" }}>休日</span></span>
            </label>
          )}
          {isFuture && isCell && <p className="hint" style={{ marginTop: 8 }}>This day hasn&apos;t happened yet.</p>}

          <div className="field" style={{ marginTop: 18 }}>
            <label className="label" htmlFor="note">{isCell ? (avoid ? "What happened" : "What you did") : "Day note"}</label>
            {noteHidden ? (
              <div className="empty" style={{ padding: 18 }}>
                Note hidden in discreet mode.{" "}
                <button className="btn btn-sm" style={{ marginLeft: 6 }} onClick={requestReveal}>Reveal</button>
              </div>
            ) : (
              <textarea
                id="note"
                ref={ref}
                className="textarea"
                rows={6}
                maxLength={2000}
                placeholder={isCell ? (avoid ? "Optional" : "e.g. Chapter 4 problems, 45 min") : "Anything about the day"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isFuture && isCell}
              />
            )}
            <span className="hint">Notes are encrypted before they are stored. <span className="kbd">Ctrl</span> <span className="kbd">Enter</span> to save.</span>
          </div>
          {err && <p className="error">{err}</p>}
        </div>

        <div className="panel-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || (isFuture && isCell)}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </aside>
    </>
  );
}
