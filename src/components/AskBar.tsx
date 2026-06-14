"use client";

import { useRef, useState } from "react";
import { IconSpark, IconSound } from "@/components/icons";
import type { Language } from "@/lib/types";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

const EXAMPLES: { en: string; hi: string }[] = [
  { en: "When did my HbA1c start rising?", hi: "मेरा HbA1c कब से बढ़ रहा है?" },
  { en: "Which reports show high cholesterol?", hi: "किन रिपोर्टों में कोलेस्ट्रॉल अधिक है?" },
  { en: "What has changed since my last report?", hi: "पिछली रिपोर्ट से क्या बदला है?" },
];

export default function AskBar({
  patient,
  language,
}: {
  patient: string;
  language: Language;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  const t = (en: string, hi: string) => (language === "hi" ? hi : en);

  async function ask(question: string) {
    const query = question.trim();
    if (!query || loading) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient, question: query, language }),
      });
      const d = await res.json();
      setAnswer(d.answer || d.error || "No answer.");
    } catch {
      setAnswer(t("Could not answer right now.", "अभी उत्तर नहीं मिल सका।"));
    } finally {
      setLoading(false);
    }
  }

  function toggleVoice() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = language === "hi" ? "hi-IN" : "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQ(transcript);
      ask(transcript);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language === "hi" ? "hi-IN" : "en-US";
    window.speechSynthesis.speak(u);
  }

  const voiceAvailable =
    typeof window !== "undefined" &&
    !!(
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    );

  return (
    <div className="rounded-2xl border border-teal-500/25 bg-white/[0.04] p-1.5 backdrop-blur-xl shadow-[0_0_40px_-12px_rgba(45,212,191,0.35)]">
      <form
        onSubmit={(e) => { e.preventDefault(); ask(q); }}
        className="flex items-center gap-2"
      >
        <span className="pl-2 text-teal-400">
          <IconSpark size={18} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Ask your health memory anything…", "अपनी हेल्थ मेमोरी से कुछ भी पूछें…")}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        {voiceAvailable && (
          <button
            type="button"
            onClick={toggleVoice}
            title={t("Speak", "बोलें")}
            className={`rounded-full p-2 transition ${listening ? "animate-pulse bg-red-500/20 text-red-300" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`}
          >
            <MicIcon />
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-40"
        >
          {loading ? "…" : t("Ask", "पूछें")}
        </button>
      </form>

      {!answer && !loading && (
        <div className="flex flex-wrap gap-1.5 px-1.5 pb-1.5 pt-1">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => { setQ(t(ex.en, ex.hi)); ask(t(ex.en, ex.hi)); }}
              className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-teal-500/40 hover:text-teal-300"
            >
              {t(ex.en, ex.hi)}
            </button>
          ))}
        </div>
      )}

      {(loading || answer) && (
        <div className="m-1 mt-1.5 rounded-xl border border-white/10 bg-black/30 p-3.5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/10 border-t-teal-400" />
              {t("Searching your records…", "आपके रिकॉर्ड खोजे जा रहे हैं…")}
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm leading-relaxed text-zinc-200">{answer}</p>
              <button
                onClick={() => answer && speak(answer)}
                className="shrink-0 rounded-full border border-white/15 p-1.5 text-zinc-400 hover:bg-white/5"
                title={t("Listen", "सुनें")}
              >
                <IconSound size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  );
}
