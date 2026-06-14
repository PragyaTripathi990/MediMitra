"use client";

import { useEffect, useState } from "react";

// Oura-style gradient score ring with count-up + glow.
export function Ring({
  value,
  size = 140,
  stroke = 12,
  label,
  delta,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  delta?: number | null;
}) {
  const [disp, setDisp] = useState(0);

  useEffect(() => {
    if (value == null) {
      setDisp(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 850;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisp(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Guarantee it lands on the real value even if rAF is throttled/frozen.
    const safety = setTimeout(() => setDisp(value), dur + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [value]);

  const v = value ?? 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, disp)) / 100;
  const dash = c * pct;
  const id = `ring-grad-${size}-${stroke}`;
  const stops =
    v >= 70
      ? ["#34d399", "#10b981"]
      : v >= 50
        ? ["#fbbf24", "#f59e0b"]
        : ["#fb923c", "#ef4444"];

  const numberPx = Math.round(size * 0.3);
  const small = size < 90;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stops[0]} />
            <stop offset="100%" stopColor={stops[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ filter: `drop-shadow(0 0 6px ${stops[0]}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-bold tabular-nums text-white"
          style={{ fontSize: numberPx, lineHeight: 1 }}
        >
          {value == null ? "—" : disp}
        </span>
        {label && !small && (
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            {label}
          </span>
        )}
        {delta != null && (
          <span
            className={`mt-0.5 font-semibold tabular-nums ${small ? "text-[10px]" : "text-xs"} ${delta < 0 ? "text-red-400" : delta > 0 ? "text-emerald-400" : "text-zinc-400"}`}
          >
            {delta < 0 ? "▼" : delta > 0 ? "▲" : "→"} {Math.abs(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

export default Ring;
