"use client";

import type { TrendPoint } from "@/lib/types";
import { STATUS_DOT } from "@/lib/ui";

export function Sparkline({
  points,
  direction = "rising",
  width = 200,
  height = 48,
  threshold,
  project = false,
}: {
  points: TrendPoint[];
  direction?: "rising" | "falling" | "stable";
  width?: number;
  height?: number;
  threshold?: number; // draws a dashed guide line at this value
  project?: boolean; // draws a dotted segment from the last point toward the threshold
}) {
  if (!points.length) return null;
  const vals = points.map((p) => p.value);
  const domain = threshold != null ? [...vals, threshold] : vals;
  const min = Math.min(...domain);
  const max = Math.max(...domain);
  const range = max - min || 1;
  const pad = 6;
  const innerW = width - pad * 2;
  const plotW = project ? innerW * 0.68 : innerW;
  const stepX = plotW / Math.max(1, points.length - 1);
  const yOf = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);

  const coords = points.map((p, i) => ({ x: pad + i * stepX, y: yOf(p.value), p }));
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    len += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y);
  }
  const stroke =
    direction === "rising"
      ? "#ea580c"
      : direction === "falling"
        ? "#0284c7"
        : "#0d9488";
  const last = coords[coords.length - 1];
  const projX = pad + innerW;
  const thY = threshold != null ? yOf(threshold) : 0;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {threshold != null && (
        <line
          x1={pad}
          y1={thY}
          x2={width - pad}
          y2={thY}
          stroke="#dc2626"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.55"
        />
      )}
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        style={
          {
            "--len": `${len}`,
            strokeDasharray: len,
            animation: "drawLine 0.9s ease both",
          } as React.CSSProperties
        }
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {project && threshold != null && (
        <line
          x1={last.x}
          y1={last.y}
          x2={projX}
          y2={thY}
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray="2 3"
          opacity="0.75"
        />
      )}
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={i === coords.length - 1 ? 4 : 2.5}
          fill={STATUS_DOT[c.p.status] ?? "#0d9488"}
        />
      ))}
      {project && threshold != null && (
        <circle cx={projX} cy={thY} r={3.5} fill="#dc2626" />
      )}
    </svg>
  );
}

export default Sparkline;
