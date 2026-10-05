"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import ThemeToggle from "./ThemeToggle";

// a fixed, decorative 5-week pattern for the left column
const PATTERN = [0,2,3,1,4,0,1, 2,3,3,4,2,0,0, 1,4,3,3,2,1,0, 3,4,4,2,3,0,1, 2,3,4,4,3,1,0];

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await api.login(email, password);
      else await api.register(email, password);
      router.replace("/week");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand" style={{ border: 0, padding: 0 }}>
          <span className="brand-mark" /> HABIT TRACKER
        </div>
        <div>
          <div className="auth-grid" aria-hidden>
            {PATTERN.map((v, i) => (
              <i key={i} style={{ background: `var(--heat-${v})` }} />
            ))}
          </div>
          <p style={{ fontSize: 26, lineHeight: 1.2, fontWeight: 600, maxWidth: "18ch", margin: "28px 0 14px", letterSpacing: "-0.01em" }}>
            A private ledger for what you do each week.
          </p>
          <ul className="dim" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6, fontSize: 13 }}>
            <li>— Weekly targets, scored automatically</li>
            <li>— Notes encrypted at rest</li>
            <li>— Discreet mode, PIN lock, panic key</li>
          </ul>
        </div>
        <div className="label">No trackers · No ads · Not indexed</div>
      </aside>
      <main className="auth-main" style={{ position: "relative" }}>
        <ThemeToggle className="auth-theme" />
        <form className="auth-form" onSubmit={submit}>
          <div className="label" style={{ marginBottom: 6 }}>{mode === "login" ? "Sign in" : "Create account"}</div>
          <h1 className="h1" style={{ marginBottom: 24 }}>{mode === "login" ? "Welcome back." : "Start a fresh ledger."}</h1>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pw">Password</label>
            <input id="pw" className="input" type="password" required minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "register" && <span className="hint">At least 8 characters.</span>}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 20, height: 40 }} disabled={busy}>
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <p className="dim" style={{ marginTop: 18, fontSize: 13 }}>
            {mode === "login" ? (
              <>No account? <Link href="/register">Create one</Link></>
            ) : (
              <>Already have one? <Link href="/login">Sign in</Link></>
            )}
          </p>
        </form>
      </main>
    </div>
  );
}
