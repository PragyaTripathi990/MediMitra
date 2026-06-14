"use client";

import type { TrendPoint } from "@/lib/types";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// Colorful, gradient-filled, dated time-series chart (responsive via viewBox).
export function AreaChart({
  points,
  color = "#2dd4bf",
  threshold,
  height = 150,
}: {
  points: TrendPoint[];
  color?: string;
  threshold?: number;
  height?: number;
}) {
  if (!points.length) return null;
  const W = 340;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const vals = points.map((p) => p.value);
  const domain = threshold != null ? [...vals, threshold] : vals;
  let min = Math.min(...domain);
  let max = Math.max(...domain);
  const span = max - min || 1;
  min -= span * 0.12;
  max += span * 0.12;
  const range = max - min || 1;

  const x = (i: number) =>
    padL + (points.length > 1 ? (i * innerW) / (points.length - 1) : innerW / 2);
  const y = (v: number) => padT + innerH - ((v - min) / range) * innerH;

  const linePts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPts = `${x(0)},${padT + innerH} ${linePts} ${x(points.length - 1)},${padT + innerH}`;
  const gid = `area-${color.replace("#", "")}`;
  const labelEvery = Math.max(1, Math.ceil(points.length / 5));
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(x(i) - x(i - 1), y(points[i].value) - y(points[i - 1].value));
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* horizontal gridlines */}
      {[0, 0.5, 1].map((g) => (
        <line
          key={g}
          x1={padL}
          x2={W - padR}
          y1={padT + g * innerH}
          y2={padT + g * innerH}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* threshold */}
      {threshold != null && (
        <line
          x1={padL}
          x2={W - padR}
          y1={y(threshold)}
          y2={y(threshold)}
          stroke="#ef4444"
          strokeWidth="1.2"
          strokeDasharray="4 3"
          opacity="0.6"
        />
      )}

      {/* area fill */}
      <polygon points={areaPts} fill={`url(#${gid})`} />

      {/* line (animated draw) */}
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={
          {
            "--len": `${len}`,
            strokeDasharray: len,
            animation: "drawLine 1s ease both",
          } as React.CSSProperties
        }
      />

      {/* dots */}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2.8} fill={color} />
      ))}

      {/* x labels */}
      {points.map((p, i) =>
        i % labelEvery === 0 || i === points.length - 1 ? (
          <text
            key={`l${i}`}
            x={x(i)}
            y={H - 6}
            fill="rgba(255,255,255,0.45)"
            fontSize="9"
            textAnchor="middle"
            fontFamily="var(--font-geist-mono), monospace"
          >
            {shortDate(p.date)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export default AreaChart;
