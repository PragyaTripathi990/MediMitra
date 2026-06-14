"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TimelineView from "@/components/Timeline";
import LanguageSelect from "@/components/LanguageSelect";
import { STATUS_LABEL, STATUS_STYLES, TRIAGE, scoreColor } from "@/lib/ui";
import { parseLang, LANG_LOCALE } from "@/lib/lang";
import type { Finding, Language, ReportAnalysis, Timeline } from "@/lib/types";

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl";
const alertDark = (sev: string) =>
  sev === "critical"
    ? "border-red-500/30 bg-red-500/10 text-red-100"
    : sev === "warning"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : "border-sky-500/25 bg-sky-500/10 text-sky-100";

export default function UploadPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [patient, setPatient] = useState("rakesh");
  const [patientContext, setPatientContext] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReportAnalysis | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [booking, setBooking] = useState<{
    whenISO: string;
    reason: string;
    doctorSummary: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (en: string, hi: string) => (language === "hi" ? hi : en);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image (PNG, JPEG, or WebP).");
      return;
    }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function loadSample(
    autoAnalyze = false,
    lang: Language = language,
    pat: string = patient,
  ) {
    setError(null);
    setAnalysis(null);
    setBooking(null);
    try {
      const res = await fetch("/sample-report.png");
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      setImageDataUrl(dataUrl);
      setFileName("sample-report.png");
      const ctx = "54, type-2 diabetes, currently on Metformin and Telmisartan";
      setPatientContext((prev) => (prev.trim() ? prev : ctx));
      if (autoAnalyze) await analyze(dataUrl, lang, ctx, pat);
    } catch {
      setError("Could not load the sample report.");
    }
  }

  async function analyze(
    srcDataUrl?: string,
    lang: Language = language,
    ctx?: string,
    pat: string = patient,
  ) {
    const img = srcDataUrl ?? imageDataUrl;
    if (!img) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setBooking(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: img,
          language: lang,
          patientContext: ctx ?? patientContext,
          patient: pat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setAnalysis(data.analysis as ReportAnalysis);
      try {
        const tl = await fetch(`/api/timeline?patient=${pat}&lang=${lang}`).then((r) => r.json());
        setTimeline(tl as Timeline);
      } catch {
        /* timeline is best-effort */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lang: Language = parseLang(params.get("lang"));
    const pat = params.get("patient") || "rakesh";
    if (params.get("lang")) setLanguage(lang);
    setPatient(pat);
    if (params.get("sample") === "1") loadSample(true, lang, pat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function readAloud(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_LOCALE[language];
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }

  async function bookFollowUp() {
    if (!analysis) return;
    setBookingLoading(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urgency: analysis.triage.level,
          reason: analysis.followUp.reason || "Follow-up consultation",
          language,
          patient,
        }),
      });
      const data = await res.json();
      setBooking({
        whenISO: data.appointment.whenISO,
        reason: data.appointment.reason,
        doctorSummary: data.doctorSummary || "",
      });
    } catch {
      setError("Could not book the appointment.");
    } finally {
      setBookingLoading(false);
    }
  }

  function formatSlot(iso: string) {
    return new Date(iso).toLocaleString(LANG_LOCALE[language], {
      weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    });
  }

  function printSummary(text: string) {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const safe = text.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
    w.document.write(
      `<title>MediMitra — Visit Summary</title><pre style="font-family:Georgia,serif;white-space:pre-wrap;padding:36px;line-height:1.55;font-size:14px;color:#0f2e2a">${safe}</pre>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="dotgrid relative min-h-screen text-zinc-200" style={{ background: "#060708" }}>
      <div className="aurora" />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5">
              ← {t("Today", "टुडे")}
            </Link>
            <h1 className="text-lg font-bold tracking-tight text-white">{t("Add a report", "रिपोर्ट जोड़ें")}</h1>
          </div>
          <LanguageSelect value={language} onChange={setLanguage} />
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
          {/* Left: input */}
          <section className="space-y-4 md:sticky md:top-6 md:self-start">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] p-6 text-center transition hover:border-teal-500/50 hover:bg-white/[0.05]"
            >
              {imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageDataUrl} alt="Report preview" className="max-h-64 w-auto rounded-lg" />
              ) : (
                <>
                  <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-teal-500/15 text-2xl">📄</div>
                  <p className="font-medium text-zinc-100">{t("Upload your lab report", "अपनी रिपोर्ट अपलोड करें")}</p>
                  <p className="mt-1 text-xs text-zinc-500">{t("Tap to choose or drag a photo / screenshot", "फ़ोटो चुनें या खींचें")}</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>

            <div className="flex items-center justify-between gap-2">
              {fileName ? <p className="truncate text-xs text-zinc-500">{fileName}</p> : <span />}
              <button onClick={() => loadSample(false)} className="shrink-0 text-xs font-medium text-teal-400 underline-offset-2 hover:underline">
                {t("Try a sample report", "नमूना रिपोर्ट आज़माएँ")}
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-200">{t("About you (optional)", "आपके बारे में (वैकल्पिक)")}</label>
              <textarea
                value={patientContext}
                onChange={(e) => setPatientContext(e.target.value)}
                rows={3}
                placeholder={t("e.g. 54, type-2 diabetes, on Metformin & Telmisartan", "जैसे 54 वर्ष, टाइप-2 डायबिटीज़, Metformin व Telmisartan")}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-500/50"
              />
              <p className="mt-1 text-xs text-zinc-500">{t("Including current medicines lets MediMitra check for interactions.", "मौजूदा दवाएँ बताने से टकराव की जाँच होती है।")}</p>
            </div>

            <button
              onClick={() => analyze()}
              disabled={!imageDataUrl || loading}
              className="w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-zinc-950 transition enabled:hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? t("Reading your report…", "रिपोर्ट पढ़ी जा रही है…") : t("Explain my report", "मेरी रिपोर्ट समझाएँ")}
            </button>

            {analysis && (
              <Link href="/" className="block rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-center text-sm font-semibold text-teal-200 transition hover:bg-teal-500/15">
                ✓ {t("Today view updated — back to Today", "टुडे अपडेट हुआ — वापस जाएँ")}
              </Link>
            )}

            {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          </section>

          {/* Right: results */}
          <section className="space-y-4">
            {!analysis && !loading && (
              <div className={`${card} grid h-full min-h-64 place-items-center p-8 text-center text-zinc-500`}>
                <p>{t("Your full health briefing will appear here.", "आपकी पूरी रिपोर्ट यहाँ दिखेगी।")}</p>
              </div>
            )}

            {loading && (
              <div className={`${card} grid h-full min-h-64 place-items-center p-8`}>
                <div className="flex flex-col items-center gap-3 text-zinc-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-teal-400" />
                  <p className="text-sm">{t("MediMitra is reading your report…", "MediMitra रिपोर्ट पढ़ रहा है…")}</p>
                </div>
              </div>
            )}

            {analysis && (
              <>
                <div className={`flex items-center gap-3 rounded-2xl border p-4 ${TRIAGE[analysis.triage.level].box}`}>
                  <span className="text-2xl">{TRIAGE[analysis.triage.level].icon}</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide">{t(TRIAGE[analysis.triage.level].en, TRIAGE[analysis.triage.level].hi)}</p>
                    <p className="text-sm opacity-95">{analysis.triage.message}</p>
                  </div>
                </div>

                <div className={`${card} p-5`}>
                  <div className="flex items-start gap-4">
                    <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 bg-white/[0.04] ${scoreColor(Number(analysis.healthScore))}`}>
                      <span className="text-xl font-extrabold leading-none text-white">{Math.round(Number(analysis.healthScore))}</span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-teal-400">{analysis.reportType} · {t("Health score", "स्कोर")}</p>
                          <h2 className="font-semibold text-zinc-100">{t("In plain words", "सरल शब्दों में")}</h2>
                        </div>
                        <button onClick={() => readAloud(analysis.summary)} className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5">🔊 {t("Listen", "सुनें")}</button>
                      </div>
                      <p className="leading-relaxed text-zinc-300">{analysis.summary}</p>
                    </div>
                  </div>
                </div>

                {timeline && <TimelineView timeline={timeline} language={language} />}

                {analysis.dataQualityFlags.length > 0 && (
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                    <p className="font-semibold text-purple-200">🔬 {t("Possible lab data errors detected", "संभावित त्रुटियाँ मिलीं")}</p>
                    <ul className="mt-1 space-y-1 text-sm text-purple-100/85">
                      {analysis.dataQualityFlags.map((d, i) => <li key={i} className="flex gap-2"><span>•</span>{d}</li>)}
                    </ul>
                  </div>
                )}

                {analysis.alerts.length > 0 && (
                  <div className="space-y-2">
                    {analysis.alerts.map((a, i) => (
                      <div key={i} className={`rounded-xl border p-3 ${alertDark(a.severity)}`}>
                        <p className="flex items-center gap-2 font-semibold">
                          <span>{a.severity === "critical" ? "🚨" : a.severity === "warning" ? "⚠️" : "ℹ️"}</span>{a.title}
                        </p>
                        <p className="mt-1 text-sm opacity-90">{a.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {analysis.findings.length > 0 && (
                  <div className={`${card} p-5`}>
                    <h3 className="mb-3 font-semibold text-zinc-100">{t("Your results", "आपके नतीजे")}</h3>
                    <div className="space-y-3">
                      {analysis.findings.map((f: Finding, i) => (
                        <div key={i} className="rounded-xl border border-white/10 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-zinc-100">{f.name}</span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[f.status]}`}>{STATUS_LABEL[f.status]}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-zinc-400">
                            <span className="font-mono font-semibold text-zinc-200">{f.value}</span>
                            <span className="text-zinc-500">{t("Normal:", "सामान्य:")} {f.referenceRange}</span>
                          </div>
                          <p className="mt-1.5 text-sm text-zinc-400">{f.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(analysis.lifestylePlan.diet.length > 0 || analysis.lifestylePlan.activity.length > 0) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
                      <h3 className="mb-2 font-semibold text-emerald-300">🍛 {t("Diet plan", "आहार योजना")}</h3>
                      <ul className="space-y-1.5 text-sm text-zinc-300">{analysis.lifestylePlan.diet.map((d, i) => <li key={i}>{d}</li>)}</ul>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
                      <h3 className="mb-2 font-semibold text-emerald-300">🏃 {t("Activity", "गतिविधि")}</h3>
                      <ul className="space-y-1.5 text-sm text-zinc-300">{analysis.lifestylePlan.activity.map((d, i) => <li key={i}>{d}</li>)}</ul>
                    </div>
                  </div>
                )}

                {analysis.medicineGuidance.length > 0 && (
                  <div className={`${card} p-5`}>
                    <h3 className="mb-2 font-semibold text-zinc-100">💰 {t("Medicine & cost tips", "दवा और बचत सुझाव")}</h3>
                    <div className="space-y-2">
                      {analysis.medicineGuidance.map((m, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-teal-300">{m.topic}:</span> <span className="text-zinc-300">{m.suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.schemeEligibility.likely && (
                  <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.08] p-4">
                    <h3 className="font-semibold text-indigo-200">🇮🇳 {analysis.schemeEligibility.scheme}</h3>
                    <p className="mt-1 text-sm text-zinc-300">{analysis.schemeEligibility.note}</p>
                  </div>
                )}

                {analysis.questionsForDoctor.length > 0 && (
                  <div className={`${card} p-5`}>
                    <h3 className="mb-2 font-semibold text-zinc-100">{t("Questions to ask your doctor", "डॉक्टर से पूछने के प्रश्न")}</h3>
                    <ul className="space-y-1.5">
                      {analysis.questionsForDoctor.map((q, i) => <li key={i} className="flex gap-2 text-sm text-zinc-300"><span className="text-teal-400">→</span>{q}</li>)}
                    </ul>
                  </div>
                )}

                {analysis.followUp.recommended && (
                  <div className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.08] p-5">
                    <h3 className="font-semibold text-zinc-100">{t("Suggested follow-up", "सुझाई गई फ़ॉलो-अप")}</h3>
                    <p className="mt-1 text-sm text-zinc-300">{analysis.followUp.reason}</p>
                    <p className="mt-1 text-xs font-medium text-teal-400">{t("Urgency:", "तात्कालिकता:")} {analysis.followUp.urgency}</p>
                    {booking ? (
                      <div className="mt-3 space-y-3">
                        <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300">
                          ✓ {t("Appointment booked for", "अपॉइंटमेंट बुक:")} <span className="font-bold">{formatSlot(booking.whenISO)}</span>
                        </p>
                        {booking.doctorSummary && (
                          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wide text-teal-400">{t("Doctor-ready visit summary", "डॉक्टर हेतु सारांश")}</span>
                              <button onClick={() => printSummary(booking.doctorSummary)} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5">🖨 {t("Print", "प्रिंट")}</button>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{booking.doctorSummary}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={bookFollowUp} disabled={bookingLoading} className="mt-3 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-50">
                        {bookingLoading ? t("Booking…", "बुक हो रहा है…") : t("Book follow-up + prep doctor summary", "फ़ॉलो-अप बुक करें + सारांश")}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <footer className="mt-10 rounded-xl bg-white/[0.03] p-4 text-center text-xs text-zinc-500">
          {t(
            "MediMitra helps you understand your reports. It is not a doctor and does not provide a diagnosis. Always consult a qualified healthcare professional.",
            "MediMitra आपकी रिपोर्ट समझने में मदद करता है। यह डॉक्टर नहीं है। हमेशा योग्य चिकित्सक से परामर्श करें।",
          )}
        </footer>
      </div>
    </div>
  );
}
