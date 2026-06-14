"use client";

import type { Language, MetricTrend, Timeline } from "@/lib/types";
import { Sparkline } from "@/components/Sparkline";

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const ARROW: Record<MetricTrend["direction"], string> = {
  rising: "↑",
  falling: "↓",
  stable: "→",
};

export default function TimelineView({
  timeline,
  language,
}: {
  timeline: Timeline;
  language: Language;
}) {
  const t = (en: string, hi: string) => (language === "hi" ? hi : en);
  if (timeline.reports.length < 2) return null;

  const projection = timeline.metrics.find((m) => m.projection)?.projection;

  return (
    <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-teal-900">
          📈 {t("Your health over time", "समय के साथ आपका स्वास्थ्य")}
        </h3>
        <span className="text-xs text-teal-700/60">
          {timeline.reports.length} {t("reports", "रिपोर्ट")}
        </span>
      </div>

      {/* Headline projection (the thing a chatbot can't do) */}
      {projection && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="text-base">⚡</span>
          <span className="font-medium">{projection}</span>
        </div>
      )}

      {/* Health score trend */}
      <div className="mb-4 flex items-end gap-3">
        {timeline.reports.map((r, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-sm font-bold text-teal-800">
              {r.healthScore}
            </span>
            <span className="text-[10px] text-teal-700/50">
              {shortDate(r.date)}
            </span>
          </div>
        ))}
        <span className="mb-3 text-xs text-teal-700/50">
          {t("health score", "स्वास्थ्य स्कोर")}
        </span>
      </div>

      {/* Per-metric trends */}
      <div className="grid gap-3 sm:grid-cols-2">
        {timeline.metrics.slice(0, 6).map((m) => (
          <div key={m.key} className="rounded-xl border border-teal-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-teal-900">
                {m.name}
              </span>
              <span
                className={`text-sm font-bold ${
                  m.direction === "rising"
                    ? "text-orange-600"
                    : m.direction === "falling"
                      ? "text-sky-600"
                      : "text-teal-600"
                }`}
              >
                {ARROW[m.direction]}{" "}
                {m.points[0].value} → {m.points[m.points.length - 1].value}
              </span>
            </div>
            <Sparkline points={m.points} direction={m.direction} />
          </div>
        ))}
      </div>
    </div>
  );
}
