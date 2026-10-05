"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, onSlowRequest } from "@/lib/api";
import { SessionProvider, useSession } from "@/lib/session";
import type { Me } from "@/lib/types";
import { EyeIcon, EyeOffIcon, LockIcon } from "./Icons";
import PinPad from "./PinPad";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/week", label: "Week" },
  { href: "/stats", label: "Stats" },
  { href: "/habits", label: "Habits" },
  { href: "/settings", label: "Settings" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    onSlowRequest(setSlow);
    api.me().then(setMe).catch(() => {});
  }, []);

  return (
    <>
      {me ? (
        <SessionProvider me={me}>
          <Chrome>{children}</Chrome>
        </SessionProvider>
      ) : (
        <div className="page"><span className="label">Loading…</span></div>
      )}
      {slow && <div className="slow-banner">Waking up the server — first load can take ~30s</div>}
    </>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { discreet, setDiscreet, requestReveal, locked, lock, unlock, me, pinPrompt, closePinPrompt, confirmReveal } = useSession();

  return (
    <>
      <header className="topbar">
        <Link href="/week" className="brand"><span className="brand-mark" />TALLY</Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? "page" : undefined}>{n.label}</Link>
          ))}
        </nav>
        <div className="topbar-right">
          <button
            className={`btn btn-sm ${discreet ? "discreet-on" : ""}`}
            onClick={() => (discreet ? requestReveal() : setDiscreet(true))}
            title="Toggle discreet mode ( \\ )"
            aria-pressed={discreet}
          >
            {discreet ? <EyeOffIcon /> : <EyeIcon />}
            <span className="hide-sm">{discreet ? "Discreet" : "Visible"}</span>
            <span className="kbd hide-sm">\</span>
          </button>
          <ThemeToggle />
          <button className="btn btn-sm btn-icon" onClick={lock} title={me.hasPin ? "Lock now (Esc Esc)" : "Set a PIN in Settings to enable locking"} aria-label="Lock">
            <LockIcon />
          </button>
        </div>
      </header>

      <div aria-hidden={locked}>{!locked && children}</div>

      <nav className="bottomnav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? "page" : undefined}>{n.label}</Link>
        ))}
      </nav>

      {locked && (
        <div className="lock" role="dialog" aria-modal aria-label="Locked">
          <div className="lock-box">
            <div className="brand" style={{ border: 0, padding: 0, justifyContent: "center" }}><span className="brand-mark" />TALLY</div>
            <p className="dim" style={{ margin: "14px 0 0", fontSize: 13 }}>Enter PIN to continue</p>
            <PinPad onSubmit={unlock} />
          </div>
        </div>
      )}

      {pinPrompt === "reveal" && !locked && (
        <>
          <div className="scrim" onClick={closePinPrompt} />
          <div className="modal" role="dialog" aria-modal aria-label="Reveal">
            <div className="modal-body">
              <div className="label">Leave discreet mode</div>
              <p className="dim" style={{ fontSize: 13, margin: "6px 0 0" }}>Enter your PIN to show private habits and notes.</p>
              <PinPad onSubmit={confirmReveal} />
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={closePinPrompt}>Cancel</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
