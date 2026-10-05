// Theme preference lives on this device only (localStorage) and is applied as <html data-theme>.
// "system" removes the attribute so prefers-color-scheme decides.

export type ThemePref = "system" | "dark" | "light";
const KEY = "tally.theme";
const EVENT = "tally:theme";

export function getThemePref(): ThemePref {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** The theme actually on screen right now. */
export function effectiveTheme(): "dark" | "light" {
  const pref = getThemePref();
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function setThemePref(t: ThemePref) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {}
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Calls fn whenever the preference or the OS scheme changes. Returns an unsubscribe function. */
export function onThemeChange(fn: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  window.addEventListener(EVENT, fn);
  mq.addEventListener("change", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    mq.removeEventListener("change", fn);
  };
}
