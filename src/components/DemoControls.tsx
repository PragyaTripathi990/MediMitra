"use client";

import { useEffect, useState } from "react";

/**
 * Presenter-only demo control. Hidden by default.
 * Enable once with  http://localhost:3000/?demo=1  (it remembers via localStorage).
 * Disable with  ?demo=0  or the × button.
 * The audience never sees it unless you turn it on.
 */
export default function DemoControls() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("demo") === "1") localStorage.setItem("mm_demo", "1");
    if (p.get("demo") === "0") localStorage.removeItem("mm_demo");
    setShow(localStorage.getItem("mm_demo") === "1");
  }, []);

  if (!show) return null;

  async function reset() {
    setBusy(true);
    setDone(false);
    try {
      await fetch("/api/reset", { method: "POST" });
      setDone(true);
      setTimeout(() => window.location.reload(), 350);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-3 left-3 z-[60] flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-2.5 py-1.5 text-xs text-zinc-300 shadow-lg backdrop-blur">
      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">demo</span>
      <button
        onClick={reset}
        disabled={busy}
        className="rounded-full bg-teal-500 px-3 py-1 font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-50"
      >
        {done ? "✓ reset" : busy ? "…" : "↺ Reset data"}
      </button>
      <button
        onClick={() => {
          localStorage.removeItem("mm_session");
          window.location.href = "/";
        }}
        className="rounded-full border border-white/15 px-2.5 py-1 text-zinc-400 transition hover:bg-white/5"
      >
        ⏮ Start
      </button>
      <button
        onClick={() => {
          localStorage.removeItem("mm_demo");
          setShow(false);
        }}
        title="Hide demo controls"
        className="px-1 text-zinc-600 hover:text-zinc-300"
      >
        ×
      </button>
    </div>
  );
}
