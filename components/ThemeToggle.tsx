"use client";

import { useEffect, useState } from "react";
import { effectiveTheme, onThemeChange, setThemePref } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./Icons";

/** One-click light/dark switch. "System" is still available in Settings. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const sync = () => setTheme(effectiveTheme());
    sync();
    return onThemeChange(sync);
  }, []);

  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className={`btn btn-sm btn-icon ${className}`}
      onClick={() => setThemePref(next)}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
    >
      {/* render nothing until mounted so server and client markup match */}
      {theme === null ? null : theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
