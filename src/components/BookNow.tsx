"use client";

import { useState } from "react";
import { IconMap, IconCalendar } from "@/components/icons";
import type { Language, TriageLevel } from "@/lib/types";

interface Hospital {
  name: string;
  rating: number;
  specialty: string;
  dLat: number; // offset from user (deg). ~0.009° ≈ 1km
  dLng: number;
}

// Prototype directory. Production → Google Places / hospital-network API.
const HOSPITALS: Hospital[] = [
  { name: "Apollo Clinic", rating: 4.7, specialty: "Diabetes & Endocrinology", dLat: 0.008, dLng: 0.005 },
  { name: "Fortis Health Centre", rating: 4.6, specialty: "Multispecialty", dLat: -0.014, dLng: 0.013 },
  { name: "Manipal Family Clinic", rating: 4.5, specialty: "General Medicine", dLat: 0.021, dLng: -0.012 },
  { name: "City Care Diabetes Centre", rating: 4.4, specialty: "Diabetes Care", dLat: -0.03, dLng: -0.025 },
  { name: "Sparsh Polyclinic", rating: 4.2, specialty: "General Practice", dLat: 0.04, dLng: 0.03 },
  { name: "Sunrise Medical Centre", rating: 3.9, specialty: "General", dLat: 0.02, dLng: 0.02 },
  { name: "Metro Heart Institute", rating: 4.8, specialty: "Cardiology", dLat: 0.06, dLng: 0.05 },
  { name: "Lifeline Multispeciality", rating: 4.5, specialty: "Multispecialty", dLat: -0.08, dLng: 0.06 },
];

// We never recommend a hospital below this rating — brokerage must not bias care.
const MIN_RATING = 4.3;
const RADII = [5, 10, 15, 25];

function km(dLat: number, dLng: number, lat: number) {
  const a = dLat * 110.574;
  const b = dLng * 111.32 * Math.cos((lat * Math.PI) / 180);
  return Math.sqrt(a * a + b * b);
}

export default function BookNow({
  patient,
  urgency,
  reason,
  language,
  label,
}: {
  patient: string;
  urgency: TriageLevel;
  reason: string;
  language: Language;
  label: string;
}) {
  const t = (en: string, hi: string) => (language === "hi" ? hi : en);
  const [stage, setStage] = useState<"idle" | "choosing" | "booking" | "booked">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [radius, setRadius] = useState(5);
  const [result, setResult] = useState<{
    whenISO: string;
    hospital: string;
    mapHref: string;
    doctorSummary: string;
  } | null>(null);

  function openPicker() {
    setStage("choosing");
    setGeoMsg(t("Finding your location…", "आपका स्थान खोजा जा रहा है…"));
    if (!navigator.geolocation) {
      setGeoMsg(t("Showing top-rated hospitals", "बेहतरीन रेटेड अस्पताल"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoMsg(t("Verified hospitals near you", "आपके पास सत्यापित अस्पताल"));
      },
      () => setGeoMsg(t("Location off — top-rated hospitals", "स्थान बंद — बेहतरीन रेटेड")),
      { timeout: 5000 },
    );
  }

  async function book(h: Hospital) {
    setStage("booking");
    const mapHref = coords
      ? `https://www.google.com/maps/search/?api=1&query=${coords.lat + h.dLat},${coords.lng + h.dLng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}`;
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient, urgency, reason, language, hospital: h.name }),
      });
      const d = await res.json();
      setResult({
        whenISO: d.appointment.whenISO,
        hospital: h.name,
        mapHref,
        doctorSummary: d.doctorSummary || "",
      });
      setStage("booked");
    } catch {
      setGeoMsg(t("Booking failed. Try again.", "बुकिंग विफल।"));
      setStage("choosing");
    }
  }

  function formatSlot(iso: string) {
    return new Date(iso).toLocaleString(language === "hi" ? "hi-IN" : "en-IN", {
      weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    });
  }

  function addToCalendar(whenISO: string, hospital: string) {
    const fmt = (iso: string) =>
      new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const start = fmt(whenISO);
    const end = fmt(new Date(new Date(whenISO).getTime() + 30 * 60000).toISOString());
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MediMitra//EN", "BEGIN:VEVENT",
      `DTSTART:${start}`, `DTEND:${end}`,
      `SUMMARY:${reason}${hospital ? ` @ ${hospital}` : ""}`,
      "DESCRIPTION:Appointment booked via MediMitra",
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Appointment tomorrow", "END:VALARM",
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Appointment in 2 hours", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "medimitra-appointment.ics";
    a.click();
    URL.revokeObjectURL(url);
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

  if (stage === "idle") {
    return (
      <button
        onClick={openPicker}
        className="rounded-lg bg-teal-500 px-3.5 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400"
      >
        {label}
      </button>
    );
  }

  if (stage === "booked" && result) {
    return (
      <div className="mt-1 w-full space-y-2">
        <div className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          ✓ {t("Booked at", "बुक हुआ:")} <span className="font-semibold text-emerald-200">{result.hospital}</span> · {formatSlot(result.whenISO)}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href={result.mapHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-zinc-300 hover:bg-white/5">
            <IconMap size={13} /> {t("Directions", "रास्ता")}
          </a>
          <button onClick={() => addToCalendar(result.whenISO, result.hospital)} className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-zinc-300 hover:bg-white/5">
            <IconCalendar size={13} /> {t("Add to calendar + reminder", "कैलेंडर + रिमाइंडर")}
          </button>
        </div>
        {result.doctorSummary && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-teal-400">{t("Doctor-ready summary", "डॉक्टर हेतु सारांश")}</span>
              <button onClick={() => printSummary(result.doctorSummary)} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5">{t("Print", "प्रिंट")}</button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{result.doctorSummary}</p>
          </div>
        )}
      </div>
    );
  }

  // choosing / booking — apply radius + the rating guardrail
  const withDist = HOSPITALS.map((h) => ({ h, dist: coords ? km(h.dLat, h.dLng, coords.lat) : null }));
  const inRadius = withDist.filter((x) => x.dist == null || x.dist <= radius);
  const shown = inRadius.filter((x) => x.h.rating >= MIN_RATING).sort((a, b) => b.h.rating - a.h.rating);
  const hiddenLow = inRadius.length - shown.length;

  return (
    <div className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-teal-300">{geoMsg}</p>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          ★ {MIN_RATING}+ {t("verified only", "केवल सत्यापित")}
        </span>
      </div>

      {/* radius selector */}
      {coords && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">{t("Within", "दायरा")}</span>
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${radius === r ? "bg-teal-500 text-zinc-950" : "border border-white/10 text-zinc-400 hover:bg-white/5"}`}
            >
              {r}km
            </button>
          ))}
        </div>
      )}

      {coords && (
        <iframe
          title="Nearby hospitals map"
          src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=${radius <= 5 ? 14 : radius <= 10 ? 13 : 12}&output=embed`}
          className="mb-2.5 h-32 w-full rounded-lg border border-white/10"
          loading="lazy"
        />
      )}

      <div className="space-y-1.5">
        {shown.length === 0 ? (
          <p className="py-3 text-center text-xs text-zinc-500">
            {t(`No verified hospitals within ${radius} km — try a wider radius.`, `${radius} किमी में कोई सत्यापित अस्पताल नहीं — दायरा बढ़ाएँ।`)}
          </p>
        ) : (
          shown.map(({ h, dist }) => (
            <button
              key={h.name}
              disabled={stage === "booking"}
              onClick={() => book(h)}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left transition hover:bg-white/5 disabled:opacity-50"
            >
              <span>
                <span className="text-sm font-medium text-zinc-100">{h.name}</span>
                <span className="block text-xs text-zinc-400">★ {h.rating} · {h.specialty}{dist != null ? ` · ${dist.toFixed(1)} km` : ""}</span>
              </span>
              <span className="shrink-0 rounded-md bg-teal-500 px-2.5 py-1 text-xs font-semibold text-zinc-950">{stage === "booking" ? "…" : t("Book", "बुक")}</span>
            </button>
          ))
        )}
        {hiddenLow > 0 && (
          <p className="pt-1 text-center text-[11px] text-zinc-600">
            {t(`${hiddenLow} nearby hospital(s) hidden — below our ★${MIN_RATING} quality bar.`, `${hiddenLow} अस्पताल छिपाए गए — गुणवत्ता मानक से कम।`)}
          </p>
        )}
      </div>
    </div>
  );
}
