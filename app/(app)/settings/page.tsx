"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { parseNotion, type ParsedImport } from "@/lib/notionImport";
import { useSession } from "@/lib/session";
import { getThemePref, onThemeChange, setThemePref, type ThemePref } from "@/lib/theme";

type Theme = ThemePref;

export default function SettingsPage() {
  const router = useRouter();
  const { me, setMe, setDiscreet } = useSession();
  const [msg, setMsg] = useState<{ k: string; text: string; err?: boolean } | null>(null);
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const sync = () => setTheme(getThemePref());
    sync();
    return onThemeChange(sync); // stays in step with the toggle in the top bar
  }, []);

  const flash = (k: string, text: string, err = false) => setMsg({ k, text, err });
  const Note = ({ k }: { k: string }) => (msg?.k === k ? <p className={msg.err ? "error" : "hint"} style={{ margin: "8px 0 0" }}>{msg.text}</p> : null);

  async function save(k: string, patch: Parameters<typeof api.settings>[0]) {
    try { setMe(await api.settings(patch)); flash(k, "Saved."); } catch (e) { flash(k, (e as Error).message, true); }
  }

  function applyTheme(t: Theme) {
    setThemePref(t);
  }

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div>
          <div className="label">Settings</div>
          <h1 className="h1">Account &amp; privacy</h1>
          <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>{me.email}</div>
        </div>
      </div>

      <div className="label" style={{ margin: "0 0 8px" }}>Privacy</div>
      <div className="settings">
        <Row title="Discreet by default" desc="Open the app with private habit names swapped for their aliases and all notes hidden. Toggle any time with \ — revealing needs your PIN if one is set.">
          <label className="check">
            <input type="checkbox" checked={me.discreetDefault} onChange={(e) => { save("discreet", { discreetDefault: e.target.checked }); if (e.target.checked) setDiscreet(true); }} />
            <span>Start in discreet mode</span>
          </label>
          <Note k="discreet" />
        </Row>
        <PinRow />
        <Row title="Auto-lock" desc="Cover the app after this much inactivity. Requires a PIN. Press Esc twice to lock instantly.">
          <div className="seg" role="group" aria-label="Auto-lock">
            {[0, 1, 5, 15, 30].map((m) => (
              <button key={m} disabled={!me.hasPin} aria-pressed={me.lockMinutes === m} onClick={() => save("lock", { lockMinutes: m })}>
                {m === 0 ? "Off" : `${m}m`}
              </button>
            ))}
          </div>
          {!me.hasPin && <p className="hint" style={{ margin: "8px 0 0" }}>Set a PIN first.</p>}
          <Note k="lock" />
        </Row>
        <Row title="What's protected" desc="">
          <ul className="dim" style={{ margin: 0, paddingLeft: 16, fontSize: 13, display: "grid", gap: 4 }}>
            <li>Habit names and every note are AES-256-GCM encrypted in the database.</li>
            <li>The tab title never changes; pages are excluded from search engines.</li>
            <li>No analytics, no third-party scripts. Session cookie is httpOnly.</li>
          </ul>
        </Row>
      </div>

      <div className="label" style={{ margin: "28px 0 8px" }}>Preferences</div>
      <div className="settings">
        <Row title="Week starts on" desc="Changes how weeks are grouped and scored.">
          <div className="seg" role="group" aria-label="Week start">
            <button aria-pressed={me.weekStart === 1} onClick={() => save("ws", { weekStart: 1 })}>Monday</button>
            <button aria-pressed={me.weekStart === 7} onClick={() => save("ws", { weekStart: 7 })}>Sunday</button>
          </div>
          <Note k="ws" />
        </Row>
        <Row title="Theme" desc="Stored on this device only. The sun/moon button in the top bar switches light and dark directly.">
          <div className="seg" role="group" aria-label="Theme">
            {(["system", "dark", "light"] as Theme[]).map((t) => (
              <button key={t} aria-pressed={theme === t} onClick={() => applyTheme(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </Row>
      </div>

      <div className="label" style={{ margin: "28px 0 8px" }} id="import">Data</div>
      <div className="settings">
        <ImportRow />
        <Row title="Export" desc="Download everything as JSON — decrypted, so keep the file somewhere safe.">
          <button className="btn" onClick={async () => {
            const data = await api.exportData();
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
            const a = document.createElement("a");
            a.href = url; a.download = `tally-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
            URL.revokeObjectURL(url);
          }}>Download export</button>
        </Row>
      </div>

      <div className="label" style={{ margin: "28px 0 8px" }}>Account</div>
      <div className="settings">
        <PasswordRow />
        <Row title="Sign out" desc="Ends the session on this device.">
          <button className="btn" onClick={async () => { await api.logout(); try { sessionStorage.clear(); } catch {} router.replace("/login"); router.refresh(); }}>Sign out</button>
        </Row>
        <DeleteRow onDone={() => { try { sessionStorage.clear(); } catch {} router.replace("/register"); router.refresh(); }} />
      </div>
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="srow">
      <div>
        <div style={{ fontWeight: 500 }}>{title}</div>
        {desc && <div className="desc">{desc}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PinRow() {
  const { me, setMe } = useSession();
  const [pin, setPin] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);

  async function submit(remove: boolean) {
    try {
      setMe(await api.setPin(remove ? null : pin, pw));
      setPin(""); setPw("");
      setMsg({ t: remove ? "PIN removed." : "PIN saved." });
    } catch (e) { setMsg({ t: (e as Error).message, err: true }); }
  }

  return (
    <Row title="PIN" desc="4–8 digits. Used to unlock the app and to leave discreet mode. Your password is required to change it.">
      <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <div className="label">{me.hasPin ? "PIN is set" : "No PIN"}</div>
        <input className="input" inputMode="numeric" pattern="\d{4,8}" maxLength={8} placeholder={me.hasPin ? "New PIN" : "PIN"} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <input className="input" type="password" placeholder="Account password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary btn-sm" disabled={pin.length < 4 || !pw} onClick={() => submit(false)}>{me.hasPin ? "Change PIN" : "Set PIN"}</button>
          {me.hasPin && <button className="btn btn-sm" disabled={!pw} onClick={() => submit(true)}>Remove</button>}
        </div>
        {msg && <p className={msg.err ? "error" : "hint"} style={{ margin: 0 }}>{msg.t}</p>}
      </div>
    </Row>
  );
}

function PasswordRow() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  return (
    <Row title="Password" desc="At least 8 characters.">
      <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <input className="input" type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <input className="input" type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} />
        <div><button className="btn btn-sm" disabled={!cur || next.length < 8} onClick={async () => {
          try { await api.changePassword(cur, next); setCur(""); setNext(""); setMsg({ t: "Password changed." }); }
          catch (e) { setMsg({ t: (e as Error).message, err: true }); }
        }}>Change password</button></div>
        {msg && <p className={msg.err ? "error" : "hint"} style={{ margin: 0 }}>{msg.t}</p>}
      </div>
    </Row>
  );
}

function DeleteRow({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Row title="Delete account" desc="Permanently deletes your account, habits, entries and notes. This cannot be undone.">
      {!open ? (
        <button className="btn btn-danger" onClick={() => setOpen(true)}>Delete account…</button>
      ) : (
        <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
          <input className="input" type="password" placeholder="Confirm with your password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-danger btn-sm" disabled={!pw} onClick={async () => {
              try { await api.deleteAccount(pw); onDone(); } catch (e) { setErr((e as Error).message); }
            }}>Delete everything</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          {err && <p className="error" style={{ margin: 0 }}>{err}</p>}
        </div>
      )}
    </Row>
  );
}

function ImportRow() {
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(f: File | undefined) {
    setErr(null); setDone(null); setParsed(null);
    if (!f) return;
    try { setParsed(parseNotion(await f.text())); } catch (e) { setErr((e as Error).message); }
  }

  function setHabit(i: number, patch: Partial<ParsedImport["habits"][number]>) {
    if (!parsed) return;
    setParsed({ ...parsed, habits: parsed.habits.map((h, j) => (j === i ? { ...h, ...patch } : h)) });
  }

  async function run() {
    if (!parsed) return;
    setBusy(true);
    try {
      const r = await api.importData({
        habits: parsed.habits.map(({ name, weeklyTarget, kind }) => ({ name, weeklyTarget, kind })),
        entries: parsed.entries,
        restDays: parsed.restDays,
      });
      setDone(`Imported ${r.entriesImported} entries, created ${r.habitsCreated} habits, marked ${r.restDays} rest days.`);
      setParsed(null);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  return (
    <Row title="Import from Notion" desc="In Notion: ••• → Export → Markdown & CSV, unzip, then pick the database .csv. Each filled cell becomes a logged day with the text as its note. 休日 cells mark rest days. “0/5” rows set weekly targets.">
      <label className="file-pick">
        <input type="file" accept=".csv,text/csv" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <span className="btn" role="button">Choose CSV…</span>
        <span className="hint">Parsed in your browser; nothing is uploaded until you confirm.</span>
      </label>
      {err && <p className="error">{err}</p>}
      {done && <p className="hint">{done}</p>}
      {parsed && (
        <div style={{ marginTop: 12, border: "1px solid var(--line)" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)" }} className="hint">
            {parsed.entries.length} entries · {parsed.restDays.length} rest days · date column “{parsed.dateColumn}”
          </div>
          <table className="data">
            <thead><tr><th>Column</th><th className="r">Logged</th><th>Target</th><th>Type</th></tr></thead>
            <tbody>
              {parsed.habits.map((h, i) => (
                <tr key={h.name}>
                  <td style={{ fontFamily: "var(--sans), var(--jp)" }}>{h.name}</td>
                  <td className="r num">{h.logged}</td>
                  <td>
                    <select className="select" style={{ height: 28, width: 64 }} value={h.weeklyTarget} onChange={(e) => setHabit(i, { weeklyTarget: +e.target.value })}>
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="select" style={{ height: 28, width: 96 }} value={h.kind} onChange={(e) => setHabit(i, { kind: e.target.value as "BUILD" | "AVOID" })}>
                      <option value="BUILD">Build</option>
                      <option value="AVOID">Avoid</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: 10, display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={run}>{busy ? "Importing…" : "Import"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setParsed(null)}>Cancel</button>
          </div>
        </div>
      )}
    </Row>
  );
}
