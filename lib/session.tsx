"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { Habit, Me } from "./types";

/**
 * Discretion model
 *  - Discreet mode: private habits show their alias ("Habit A") in a neutral grey and every note is hidden.
 *  - Revealing (leaving discreet mode) asks for the PIN when one is set.
 *  - Lock: after N idle minutes, or on the panic key, the whole app is covered until the PIN is entered.
 *  - Panic: press Esc twice quickly → discreet mode on, and locked if a PIN exists.
 */
interface SessionCtx {
  me: Me;
  setMe: (m: Me) => void;
  discreet: boolean;
  setDiscreet: (on: boolean) => void;
  requestReveal: () => void;
  locked: boolean;
  lock: () => void;
  unlock: (pin: string) => Promise<void>;
  pinPrompt: "reveal" | null;
  closePinPrompt: () => void;
  confirmReveal: (pin: string) => Promise<void>;
  label: (h: Habit) => string;
  hidden: (h: Habit) => boolean;
  colorOf: (h: Habit) => string;
}

const Ctx = createContext<SessionCtx | null>(null);

const K_DISCREET = "tally.discreet";
const K_ACTIVE = "tally.lastActive";
const K_LOCKED = "tally.locked";

function ss(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {}
  return null;
}

export function SessionProvider({ me: initial, children }: { me: Me; children: React.ReactNode }) {
  const [me, setMe] = useState(initial);
  const [discreet, setDiscreetState] = useState<boolean>(() => {
    const saved = ss(K_DISCREET);
    return saved === null ? initial.discreetDefault : saved === "1";
  });
  const [locked, setLocked] = useState<boolean>(() => {
    if (!initial.hasPin) return false;
    if (ss(K_LOCKED) === "1") return true;
    const last = Number(ss(K_ACTIVE) || 0);
    return initial.lockMinutes > 0 && last > 0 && Date.now() - last > initial.lockMinutes * 60000;
  });
  const [pinPrompt, setPinPrompt] = useState<"reveal" | null>(null);
  const lastEsc = useRef(0);

  const setDiscreet = useCallback((on: boolean) => {
    setDiscreetState(on);
    ss(K_DISCREET, on ? "1" : "0");
  }, []);

  const lock = useCallback(() => {
    if (!me.hasPin) {
      setDiscreet(true);
      return;
    }
    setLocked(true);
    ss(K_LOCKED, "1");
  }, [me.hasPin, setDiscreet]);

  const unlock = useCallback(async (pin: string) => {
    await api.unlock(pin);
    setLocked(false);
    ss(K_LOCKED, null);
    ss(K_ACTIVE, String(Date.now()));
  }, []);

  const requestReveal = useCallback(() => {
    if (!discreet) return;
    if (me.hasPin) setPinPrompt("reveal");
    else setDiscreet(false);
  }, [discreet, me.hasPin, setDiscreet]);

  const confirmReveal = useCallback(async (pin: string) => {
    await api.unlock(pin);
    setPinPrompt(null);
    setDiscreet(false);
  }, [setDiscreet]);

  // idle tracking → auto-lock
  useEffect(() => {
    const mark = () => ss(K_ACTIVE, String(Date.now()));
    mark();
    const evts = ["pointerdown", "keydown", "scroll", "touchstart"];
    evts.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const iv = setInterval(() => {
      if (!me.hasPin || me.lockMinutes <= 0) return;
      const last = Number(ss(K_ACTIVE) || Date.now());
      if (Date.now() - last > me.lockMinutes * 60000) lock();
    }, 15000);
    return () => {
      evts.forEach((e) => window.removeEventListener(e, mark));
      clearInterval(iv);
    };
  }, [me.hasPin, me.lockMinutes, lock]);

  // keyboard: "\" toggles discreet, Esc Esc = panic
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "Escape") {
        const now = Date.now();
        if (now - lastEsc.current < 450) {
          setDiscreet(true);
          if (me.hasPin) lock();
          (document.activeElement as HTMLElement | null)?.blur?.();
        }
        lastEsc.current = now;
        return;
      }
      if (typing) return;
      if (e.key === "\\") {
        e.preventDefault();
        if (discreet) requestReveal();
        else setDiscreet(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [discreet, requestReveal, setDiscreet, lock, me.hasPin]);

  const label = useCallback((h: Habit) => (discreet && h.isPrivate ? h.alias : h.name), [discreet]);
  const hidden = useCallback((h: Habit) => discreet && h.isPrivate, [discreet]);
  const colorOf = useCallback((h: Habit) => (discreet && h.isPrivate ? "var(--muted-mark)" : h.color), [discreet]);

  return (
    <Ctx.Provider
      value={{
        me, setMe, discreet, setDiscreet, requestReveal, locked, lock, unlock,
        pinPrompt, closePinPrompt: () => setPinPrompt(null), confirmReveal, label, hidden, colorOf,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession(): SessionCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession outside SessionProvider");
  return c;
}
