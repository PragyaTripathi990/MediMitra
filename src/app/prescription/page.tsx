"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconPill } from "@/components/icons";
import LanguageSelect from "@/components/LanguageSelect";
import { parseLang } from "@/lib/lang";
import type { Language, PrescriptionResult } from "@/lib/types";

export default function PrescriptionPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrescriptionResult | null>(null);
  const [choice, setChoice] = useState<Record<number, "brand" | "generic">>({});
  const [ordered, setOrdered] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = (en: string, hi: string) => (language === "hi" ? hi : en);
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const lang = parseLang(p.get("lang"));
    if (p.get("lang")) setLanguage(lang);
    if (p.get("sample") === "1") loadSample(true, lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setImageDataUrl(r.result as string);
    r.readAsDataURL(file);
  }

  async function loadSample(auto = false, lang: Language = language) {
    setError(null);
    setResult(null);
    setOrdered(false);
    const res = await fetch("/sample-prescription.png");
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    setImageDataUrl(dataUrl);
    if (auto) await analyze(dataUrl, lang);
  }

  async function analyze(src?: string, lang: Language = language) {
    const img = src ?? imageDataUrl;
    if (!img) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setOrdered(false);
    try {
      const res = await fetch("/api/prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img, language: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read the prescription.");
      const r = data as PrescriptionResult;
      setResult(r);
      // default every med to the generic (the saving)
      const c: Record<number, "brand" | "generic"> = {};
      r.medicines.forEach((_, i) => (c[i] = "generic"));
      setChoice(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  const meds = result?.medicines ?? [];
  const total = meds.reduce(
    (s, m, i) => s + (choice[i] === "brand" ? m.cheapestBrand.price : m.generic.price),
    0,
  );
  const brandTotal = meds.reduce((s, m) => s + m.cheapestBrand.price, 0);
  const saved = brandTotal - total;

  return (
    <div
      className="min-h-screen text-zinc-200"
      style={{ background: "radial-gradient(900px 420px at 50% -8%, rgba(45,212,191,0.10), transparent), #0a0c0e" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5">
              ← {t("Today", "आज")}
            </Link>
            <h1 className="flex items-center gap-2 text-lg font-bold text-white">
              <IconPill size={18} /> {t("Order medicines", "दवाएँ मँगाएँ")}
            </h1>
          </div>
          <LanguageSelect value={language} onChange={setLanguage} />
        </header>

        {!result && !loading && (
          <div className="space-y-5">
            {/* Doctor inbox — prescriptions auto-arrive from connected clinics (ABDM) */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{t("Doctor inbox", "डॉक्टर इनबॉक्स")}</p>
                <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold text-teal-300">1 {t("new", "नया")}</span>
              </div>
              <button
                onClick={() => loadSample(true)}
                className="panel-in group flex w-full items-center gap-4 rounded-2xl border border-teal-500/30 bg-teal-500/[0.06] p-4 text-left transition hover:bg-teal-500/[0.1]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-200">PM</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-zinc-100">{t("Dr. Priya Menon", "डॉ. प्रिया मेनन")}</p>
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">{t("via ABDM", "ABDM द्वारा")}</span>
                  </div>
                  <p className="truncate text-xs text-zinc-400">{t("Apollo Clinic · Diabetes follow-up · 4 medicines", "अपोलो क्लिनिक · डायबिटीज़ फ़ॉलो-अप · 4 दवाएँ")}</p>
                  <p className="mt-0.5 text-[11px] text-teal-400">{t("New prescription arrived · just now", "नया पर्चा आया · अभी")}</p>
                </div>
                <span className="hidden shrink-0 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition group-hover:bg-teal-400 sm:block">{t("Review & order", "देखें व मँगाएँ")} →</span>
              </button>
            </div>

            {/* Manual upload — the fallback */}
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-zinc-600">
              <span className="h-px flex-1 bg-white/10" /> {t("or upload manually", "या स्वयं अपलोड करें")} <span className="h-px flex-1 bg-white/10" />
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] p-8 text-center transition hover:border-teal-500/50 hover:bg-white/[0.05]"
            >
              {imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageDataUrl} alt="Prescription" className="max-h-72 rounded-lg" />
              ) : (
                <>
                  <div className="mb-2 text-zinc-500"><IconPill size={32} /></div>
                  <p className="font-medium text-zinc-100">{t("Upload your doctor's prescription", "डॉक्टर का पर्चा अपलोड करें")}</p>
                  <p className="mt-1 text-xs text-zinc-500">{t("We'll find the cheapest way to buy each medicine.", "हर दवा का सबसे सस्ता विकल्प ढूँढेंगे।")}</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
            <div className="flex items-center justify-between">
              <button onClick={() => loadSample(false)} className="text-xs font-medium text-teal-400 hover:underline">
                {t("Try a sample prescription", "नमूना पर्चा आज़माएँ")}
              </button>
              <button
                onClick={() => analyze()}
                disabled={!imageDataUrl}
                className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-40"
              >
                {t("Read & price it", "पढ़ें और दाम देखें")}
              </button>
            </div>
            {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          </div>
        )}

        {loading && (
          <div className="grid min-h-64 place-items-center">
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-teal-400" />
              <p className="text-sm">{t("Reading the prescription…", "पर्चा पढ़ा जा रहा है…")}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4 pb-28">
            {result.doctorNote && (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">
                <span className="font-semibold text-zinc-100">{t("Doctor's note: ", "डॉक्टर की सलाह: ")}</span>
                {result.doctorNote}
              </p>
            )}

            {meds.map((m, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-100">{m.name}</p>
                    <p className="text-xs text-zinc-400">{m.dosage} · {m.frequency} · {m.durationDays} {t("days", "दिन")}</p>
                  </div>
                  {m.savings > 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      {t("save", "बचत")} {inr(m.savings)}
                    </span>
                  )}
                </div>
                {m.purpose && <p className="mt-1.5 text-sm text-zinc-400">{m.purpose}</p>}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => setChoice((c) => ({ ...c, [i]: "generic" }))}
                    className={`rounded-xl border p-3 text-left transition ${choice[i] === "generic" ? "border-teal-500/60 bg-teal-500/10" : "border-white/10 hover:bg-white/5"}`}
                  >
                    <p className="text-xs uppercase tracking-wide text-emerald-300">{t("Generic", "जेनेरिक")}</p>
                    <p className="text-sm font-medium text-zinc-100">{m.generic.name}</p>
                    <p className="text-lg font-bold tabular-nums text-white">{inr(m.generic.price)}</p>
                  </button>
                  <button
                    onClick={() => setChoice((c) => ({ ...c, [i]: "brand" }))}
                    className={`rounded-xl border p-3 text-left transition ${choice[i] === "brand" ? "border-teal-500/60 bg-teal-500/10" : "border-white/10 hover:bg-white/5"}`}
                  >
                    <p className="text-xs uppercase tracking-wide text-zinc-400">{t("Branded", "ब्रांडेड")}</p>
                    <p className="text-sm font-medium text-zinc-100">{t("cheapest at", "सबसे सस्ता")} {m.cheapestBrand.pharmacy}</p>
                    <p className="text-lg font-bold tabular-nums text-white">{inr(m.cheapestBrand.price)}</p>
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                  {t("Prices across", "दाम:")} {m.brandQuotes.map((q) => `${q.pharmacy} ${inr(q.price)}`).join(" · ")}
                </p>
              </div>
            ))}

            <p className="text-center text-[11px] text-zinc-600">
              {t(
                "Prices are illustrative (prototype). A production build connects to 1mg / Netmeds / PharmEasy live pricing.",
                "दाम केवल उदाहरण हैं। उत्पादन संस्करण 1mg / Netmeds से लाइव दाम लेगा।",
              )}
            </p>
          </div>
        )}
      </div>

      {/* Sticky order bar */}
      {result && meds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#0c0f12]/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <p className="text-lg font-bold tabular-nums text-white">{inr(total)}</p>
              {saved > 0 && <p className="text-xs text-emerald-400">{t("You save", "आप बचाते हैं")} {inr(saved)} {t("with generics", "जेनेरिक से")}</p>}
            </div>
            {ordered ? (
              <span className="rounded-lg bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300">
                ✓ {t("Order placed · delivery in 2 days", "ऑर्डर हो गया · 2 दिन में डिलीवरी")}
              </span>
            ) : (
              <button
                onClick={() => setOrdered(true)}
                className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400"
              >
                {t("Place order", "ऑर्डर करें")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
