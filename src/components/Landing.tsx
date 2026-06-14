"use client";

import {
  IconSpark,
  IconTrends,
  IconFamily,
  IconPill,
  IconMap,
  IconSound,
} from "@/components/icons";
import LanguageSelect from "@/components/LanguageSelect";
import type { Language } from "@/lib/types";

const FEATURES = [
  { Icon: IconSpark, en: "Remembers everything", hi: "सब कुछ याद रखता है", den: "Every report, value, and medicine — one health memory you can ask.", dhi: "हर रिपोर्ट, वैल्यू और दवा — एक हेल्थ मेमोरी जिससे आप पूछ सकें।" },
  { Icon: IconTrends, en: "Forecasts risk", hi: "जोखिम का पूर्वानुमान", den: "Trends across years that project where your health is heading.", dhi: "वर्षों के रुझान जो बताते हैं आपकी सेहत किस ओर जा रही है।" },
  { Icon: IconFamily, en: "Manages the family", hi: "परिवार संभालता है", den: "Parents, spouse, kids — every member's health in one place.", dhi: "माता-पिता, जीवनसाथी, बच्चे — सबकी सेहत एक जगह।" },
  { Icon: IconPill, en: "Saves money", hi: "पैसे बचाता है", den: "Cheapest generics, govt-scheme eligibility, doctor-ready summaries.", dhi: "सस्ती जेनेरिक, सरकारी योजना पात्रता, डॉक्टर हेतु सारांश।" },
];

export default function Landing({
  onEnter,
  language,
  setLanguage,
}: {
  onEnter: () => void;
  language: Language;
  setLanguage: (l: Language) => void;
}) {
  const t = (en: string, hi: string) => (language === "hi" ? hi : en);

  return (
    <div className="dotgrid relative min-h-screen overflow-hidden text-zinc-200" style={{ background: "#060708" }}>
      <div className="aurora" />
      <div className="aurora2" />

      <div className="relative z-10 mx-auto max-w-5xl px-5">
        {/* Top bar */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 text-lg font-bold text-zinc-950">म</div>
            <span className="text-lg font-semibold tracking-tight text-white">MediMitra</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelect value={language} onChange={setLanguage} />
            <button onClick={onEnter} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200">
              {t("Log in", "लॉग इन")}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="rise pt-16 pb-12 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-teal-300">
            <IconSpark size={12} /> {t("AI health companion", "एआई स्वास्थ्य साथी")}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            {t("The Health Operating System for Indian families", "भारतीय परिवारों के लिए हेल्थ ऑपरेटिंग सिस्टम")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            {t(
              "MediMitra remembers, monitors, and manages your family's health over time — understand reports, forecast risks, book care, and order the cheapest medicines.",
              "MediMitra आपके परिवार की सेहत याद रखता, निगरानी करता और संभालता है — रिपोर्ट समझें, जोखिम जानें, अपॉइंटमेंट लें और सबसे सस्ती दवाएँ मँगाएँ।",
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={onEnter} className="rounded-xl bg-teal-500 px-6 py-3 text-base font-semibold text-zinc-950 shadow-[0_0_40px_-10px_rgba(45,212,191,0.6)] transition hover:bg-teal-400">
              {t("Open your dashboard →", "अपना डैशबोर्ड खोलें →")}
            </button>
            <button onClick={onEnter} className="rounded-xl border border-white/15 px-6 py-3 text-base font-medium text-zinc-200 transition hover:bg-white/5">
              {t("Try the demo family", "डेमो परिवार आज़माएँ")}
            </button>
          </div>
          <p className="mt-4 font-mono text-xs text-zinc-600">
            {t("No setup · English, हिंदी, தமிழ், తెలుగు, বাংলা · voice-enabled", "कोई सेटअप नहीं · अंग्रेज़ी, हिंदी, तमिल, तेलुगु, बांग्ला · वॉइस सक्षम")}
          </p>
        </section>

        {/* Feature grid */}
        <section className="rise grid gap-3 pb-16 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <div key={i} className="lift rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-300">
                <f.Icon size={20} />
              </div>
              <h3 className="font-semibold text-white">{t(f.en, f.hi)}</h3>
              <p className="mt-1 text-sm text-zinc-400">{t(f.den, f.dhi)}</p>
            </div>
          ))}
        </section>

        {/* Capability strip */}
        <section className="rise mb-20 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5"><IconMap size={14} /> {t("Find & book nearby care", "पास की देखभाल खोजें व बुक करें")}</span>
          <span className="inline-flex items-center gap-1.5"><IconPill size={14} /> {t("Order cheapest generics", "सबसे सस्ती जेनेरिक मँगाएँ")}</span>
          <span className="inline-flex items-center gap-1.5"><IconSound size={14} /> {t("Ask by voice", "आवाज़ से पूछें")}</span>
          <span className="inline-flex items-center gap-1.5"><IconSpark size={14} /> {t("🇮🇳 Ayushman Bharat aware", "🇮🇳 आयुष्मान भारत")}</span>
        </section>

        <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-600">
          {t(
            "MediMitra is informational and clinician-deferred — not a diagnostic device.",
            "MediMitra केवल जानकारी देता है — यह डॉक्टर का विकल्प नहीं है।",
          )}
        </footer>
      </div>
    </div>
  );
}
