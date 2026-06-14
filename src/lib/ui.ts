import type { AlertSeverity, FindingStatus, TriageLevel } from "./types";

export const STATUS_STYLES: Record<FindingStatus, string> = {
  normal: "bg-emerald-100 text-emerald-800 border-emerald-200",
  borderline: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-sky-100 text-sky-800 border-sky-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

export const ALERT_STYLES: Record<AlertSeverity, string> = {
  info: "bg-sky-50 border-sky-200 text-sky-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  critical: "bg-red-50 border-red-200 text-red-900",
};

export const STATUS_LABEL: Record<FindingStatus, string> = {
  normal: "Normal",
  borderline: "Borderline",
  low: "Low",
  high: "High",
  critical: "Critical",
};

export const STATUS_DOT: Record<string, string> = {
  normal: "#059669",
  borderline: "#d97706",
  low: "#0284c7",
  high: "#ea580c",
  critical: "#dc2626",
};

export const TRIAGE: Record<
  TriageLevel,
  { box: string; icon: string; en: string; hi: string }
> = {
  emergency: {
    box: "bg-red-600 text-white border-red-700",
    icon: "🚑",
    en: "Seek emergency care now",
    hi: "तुरंत आपातकालीन सहायता लें",
  },
  urgent: {
    box: "bg-orange-500 text-white border-orange-600",
    icon: "⚠️",
    en: "See a doctor urgently",
    hi: "जल्द से जल्द डॉक्टर से मिलें",
  },
  soon: {
    box: "bg-amber-100 text-amber-900 border-amber-300",
    icon: "🗓️",
    en: "Book an appointment soon",
    hi: "जल्द ही अपॉइंटमेंट लें",
  },
  routine: {
    box: "bg-emerald-100 text-emerald-900 border-emerald-300",
    icon: "✅",
    en: "Routine — no rush",
    hi: "सामान्य — कोई जल्दी नहीं",
  },
};

// Action severity → card styling for the Today priority rail.
export const ACTION_STYLES: Record<
  "critical" | "warning" | "info",
  string
> = {
  critical: "border-red-300 bg-red-50",
  warning: "border-amber-300 bg-amber-50",
  info: "border-sky-200 bg-sky-50",
};

export function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600 border-emerald-500";
  if (s >= 60) return "text-amber-600 border-amber-500";
  if (s >= 40) return "text-orange-600 border-orange-500";
  return "text-red-600 border-red-500";
}
