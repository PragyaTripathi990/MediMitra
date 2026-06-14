"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export default function ChatAssistant({
  patient,
  language,
}: {
  patient: string;
  language: Language;
}) {
  const t = (en: string, hi: string) => (language === "hi" ? hi : en);
  const greeting: Msg = {
    role: "assistant",
    content: t(
      "Hi! I'm MediMitra. Ask me anything about your health records — like your cholesterol, sugar trend, or what changed since your last report.",
      "नमस्ते! मैं MediMitra हूँ। अपने रिकॉर्ड के बारे में कुछ भी पूछें — कोलेस्ट्रॉल, शुगर का रुझान, या पिछली रिपोर्ट से क्या बदला।",
    ),
  };

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  // Reset greeting when language changes (only if no real conversation yet).
  useEffect(() => {
    setMessages((m) => (m.length <= 1 ? [greeting] : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const chips = [
    { en: "My cholesterol?", hi: "मेरा कोलेस्ट्रॉल?" },
    { en: "Sugar trend?", hi: "शुगर का रुझान?" },
    { en: "What changed?", hi: "क्या बदला?" },
  ];

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient, language, messages: next }),
      });
      const d = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: d.reply || d.error || t("Sorry, try again.", "क्षमा करें, फिर प्रयास करें।") },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: t("Couldn't reach the assistant.", "असिस्टेंट से संपर्क नहीं हो सका।") },
      ]);
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
      send(transcript);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  const voiceAvailable =
    typeof window !== "undefined" &&
    !!(
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    );

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fab-pulse fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-teal-500 text-zinc-950 shadow-lg transition hover:bg-teal-400 md:bottom-6 md:right-6"
        aria-label="Open assistant"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-6A8.4 8.4 0 1121 11.5z" /></svg>
        )}
      </button>

      {open && (
        <div className="panel-in fixed bottom-36 right-4 z-50 flex h-[64vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f12]/95 shadow-2xl backdrop-blur-xl md:bottom-24 md:right-6">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500 text-sm font-bold text-zinc-950">म</span>
            <div>
              <p className="text-sm font-semibold text-white">MediMitra</p>
              <p className="text-[11px] text-teal-400">{t("Health assistant · online", "स्वास्थ्य सहायक · ऑनलाइन")}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`msg-in flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <span className="mr-2 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-teal-500/20 text-[11px] font-bold text-teal-300">म</span>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-teal-500 text-zinc-950"
                      : "rounded-bl-sm bg-white/[0.06] text-zinc-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <span className="mr-2 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-teal-500/20 text-[11px] font-bold text-teal-300">म</span>
                <div className="typing flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white/[0.06] px-3.5 py-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Suggestion chips (only before conversation) */}
          {messages.length <= 1 && !loading && (
            <div className="flex flex-wrap gap-1.5 px-3.5 pb-2">
              {chips.map((c, i) => (
                <button
                  key={i}
                  onClick={() => send(t(c.en, c.hi))}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-teal-500/40 hover:text-teal-300"
                >
                  {t(c.en, c.hi)}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-white/10 p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Ask anything…", "कुछ भी पूछें…")}
              className="min-w-0 flex-1 rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
            />
            {voiceAvailable && (
              <button
                type="button"
                onClick={toggleVoice}
                className={`rounded-full p-2 transition ${listening ? "animate-pulse bg-red-500/20 text-red-300" : "text-zinc-400 hover:bg-white/5"}`}
                aria-label="Voice"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-500 text-zinc-950 transition hover:bg-teal-400 disabled:opacity-40"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
