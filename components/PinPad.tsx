"use client";

import { useEffect, useState } from "react";

/** Numeric PIN entry; works with a keyboard or by tapping. Calls onSubmit with 4–8 digits. */
export default function PinPad({ onSubmit, length = 8 }: { onSubmit: (pin: string) => Promise<void>; length?: number }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(p = pin) {
    if (p.length < 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wrong PIN");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < length ? p + e.key : p));
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter") go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "→"];
  return (
    <div>
      <div className="pin-dots" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <i key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      <p className="error" style={{ minHeight: 20, margin: "0 0 10px" }} role="alert">{error}</p>
      <div className="pinpad">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            disabled={busy}
            aria-label={k === "⌫" ? "Delete" : k === "→" ? "Unlock" : k}
            onClick={() => {
              if (k === "⌫") setPin((p) => p.slice(0, -1));
              else if (k === "→") go();
              else setPin((p) => (p.length < length ? p + k : p));
            }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
