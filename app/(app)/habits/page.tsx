"use client";

import { useEffect, useState } from "react";
import HabitForm from "@/components/HabitForm";
import { api } from "@/lib/api";
import { fmtShort } from "@/lib/dates";
import { useSession } from "@/lib/session";
import { PALETTE, type Habit } from "@/lib/types";

export default function HabitsPage() {
  const { label, colorOf, discreet } = useSession();
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.habits().then(setHabits).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (!habits) return <div className="page">{error ? <p className="error">{error}</p> : <span className="label">Loading…</span>}</div>;

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const totalTarget = active.reduce((a, h) => a + h.weeklyTarget, 0);

  async function move(id: string, dir: -1 | 1) {
    const ids = active.map((h) => h.id);
    const i = ids.indexOf(id), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const order = [...ids, ...archived.map((h) => h.id)];
    setHabits(order.map((x, pos) => ({ ...habits!.find((h) => h.id === x)!, position: pos })));
    await api.reorderHabits(order).catch((e) => setError(e.message));
  }

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  const row = (h: Habit, i: number, list: Habit[]) => (
    <div key={h.id}>
      <div className={`hrow ${h.archived ? "archived" : ""}`}>
        <div className="order">
          {!h.archived && (
            <>
              <button onClick={() => move(h.id, -1)} disabled={i === 0} aria-label="Move up">▲</button>
              <button onClick={() => move(h.id, 1)} disabled={i === list.length - 1} aria-label="Move down">▼</button>
            </>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="swatch" style={{ background: colorOf(h), width: 10, height: 10 }} />
            <span style={{ fontWeight: 500 }}>{label(h)}</span>
            {h.isPrivate && <span className="avoid-tag">PRIVATE</span>}
            {h.kind === "AVOID" && <span className="avoid-tag">AVOID</span>}
          </div>
          <div className="meta">
            <span>{h.weeklyTarget}/wk</span>
            <span>since {fmtShort(h.startDate)}</span>
            {h.isPrivate && !discreet && <span>shown as “{h.alias}”</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {!h.archived && <button className="btn btn-sm" onClick={() => setEditing(editing === h.id ? null : h.id)}>{editing === h.id ? "Close" : "Edit"}</button>}
          <button className="btn btn-sm" onClick={() => act(() => api.updateHabit(h.id, { archived: !h.archived }))}>{h.archived ? "Restore" : "Archive"}</button>
          {h.archived && (
            confirmDel === h.id ? (
              <button className="btn btn-sm btn-danger" onClick={() => act(() => api.deleteHabit(h.id))}>Delete forever + history</button>
            ) : (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(h.id)}>Delete</button>
            )
          )}
        </div>
      </div>
      {editing === h.id && (
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
          {discreet && h.isPrivate ? (
            <p className="dim" style={{ margin: 0 }}>Leave discreet mode to edit a private habit.</p>
          ) : (
            <HabitForm
              initial={h}
              submitLabel="Save changes"
              onCancel={() => setEditing(null)}
              onSubmit={async (v) => { await api.updateHabit(h.id, v); setEditing(null); await load(); }}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div>
          <div className="label">Habits</div>
          <h1 className="h1">Your columns</h1>
          <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>
            {active.length} active · <span className="num">{totalTarget}</span> points available per week
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="hlist">
        {active.length === 0 && <div style={{ padding: 18 }} className="dim">Nothing yet — add your first habit below.</div>}
        {active.map((h, i) => row(h, i, active))}
      </div>

      <div className="section card">
        <div className="section-head"><h2 className="h2">Add a habit</h2></div>
        <HabitForm
          submitLabel="Add habit"
          nextColor={PALETTE[habits.length % PALETTE.length]}
          onSubmit={async (v) => { await api.createHabit(v); await load(); }}
        />
      </div>

      {archived.length > 0 && (
        <div className="section">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </button>
          {showArchived && <div className="hlist" style={{ marginTop: 10 }}>{archived.map((h, i) => row(h, i, archived))}</div>}
          <p className="hint">Archived habits disappear from the week view but keep their history in Stats. Deleting removes all history.</p>
        </div>
      )}
    </div>
  );
}
