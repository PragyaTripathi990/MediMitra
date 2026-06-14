"use client";

import type { Language } from "@/lib/types";
import { LANG_OPTIONS } from "@/lib/lang";

/** Compact dark language picker (5 languages). Used across every surface. */
export default function LanguageSelect({
  value,
  onChange,
  className = "",
}: {
  value: Language;
  onChange: (l: Language) => void;
  className?: string;
}) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <svg className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        aria-label="Language"
        className="cursor-pointer appearance-none rounded-full border border-white/15 bg-white/[0.05] py-1.5 pl-7 pr-7 text-sm font-medium text-zinc-200 outline-none transition hover:bg-white/[0.09] focus:border-teal-500/50"
      >
        {LANG_OPTIONS.map((o) => (
          <option key={o.code} value={o.code} className="bg-zinc-900 text-zinc-100">
            {o.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2.5 h-3 w-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
