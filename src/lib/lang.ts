import type { Language } from "./types";

// Single source of truth for the languages MediMitra speaks.
// The AI explanations (report analysis, chat, prescription notes, doctor summary)
// are produced in the selected language; UI chrome falls back to English/Hindi.

export const LANG_NAME: Record<Language, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
};

export const LANG_SCRIPT: Record<Language, string> = {
  en: "Latin",
  hi: "Devanagari",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
};

// Native labels for language pickers.
export const LANG_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "bn", label: "বাংলা" },
];

// BCP-47 locales for date formatting + speech synthesis.
export const LANG_LOCALE: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
};

const CODES: Language[] = ["en", "hi", "ta", "te", "bn"];

// Coerce arbitrary input (query param / request body) to a supported Language.
export function parseLang(value: unknown): Language {
  return CODES.includes(value as Language) ? (value as Language) : "en";
}

// A one-line instruction telling the model which language to answer in.
export function writeIn(language: Language): string {
  if (language === "en") return "Answer in clear, simple English.";
  return `Answer in simple, conversational ${LANG_NAME[language]} (${LANG_SCRIPT[language]} script). Keep test names, medicine names and numbers as patients see them (usually English).`;
}
