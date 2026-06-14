"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ring } from "@/components/Ring";
import { Sparkline } from "@/components/Sparkline";
import { AreaChart } from "@/components/AreaChart";
import BookNow from "@/components/BookNow";
import ChatAssistant from "@/components/ChatAssistant";
import Landing from "@/components/Landing";
import LanguageSelect from "@/components/LanguageSelect";
import AuthModal from "@/components/AuthModal";
import { LANG_LOCALE, parseLang } from "@/lib/lang";
import {
  IconToday,
  IconTrends,
  IconFamily,
  IconPlan,
  IconRecords,
  IconSound,
  IconCalendar,
  IconSpark,
  IconPill,
} from "@/components/icons";
import type {
  FamilyMember,
  FamilySummary,
  Language,
  Timeline,
  TodayPayload,
} from "@/lib/types";

type Tab = "today" | "trends" | "family" | "plan" | "records";

const NAV: { key: Tab; en: string; hi: string; Icon: (p: { size?: number }) => React.ReactElement }[] = [
  { key: "today", en: "Today", hi: "आज", Icon: IconToday },
  { key: "trends", en: "Trends", hi: "रुझान", Icon: IconTrends },
  { key: "family", en: "Family", hi: "परिवार", Icon: IconFamily },
  { key: "plan", en: "Plan", hi: "योजना", Icon: IconPlan },
  { key: "records", en: "Records", hi: "रिकॉर्ड", Icon: IconRecords },
];

const ACT: Record<"critical" | "warning" | "info", string> = {
  critical: "border-red-500/30 bg-red-500/[0.08]",
  warning: "border-amber-500/30 bg-amber-500/[0.07]",
  info: "border-sky-500/25 bg-sky-500/[0.06]",
};
const DOT: Record<string, string> = {
  critical: "bg-red-400",
  warning: "bg-amber-400",
  info: "bg-sky-400",
};
const RANK: Record<string, number> = { normal: 0, borderline: 1, low: 2, high: 2, critical: 3 };

const QUOTES = [
  { en: "Small steps today, big health tomorrow.", hi: "आज छोटे कदम, कल बड़ी सेहत।" },
  { en: "Your future self will thank you for acting now.", hi: "अभी कदम उठाने के लिए भविष्य आपका आभारी होगा।" },
  { en: "Every healthy choice adds up.", hi: "हर स्वस्थ चुनाव मायने रखता है।" },
];
const AVATAR = ["bg-teal-500", "bg-indigo-400", "bg-amber-500"];
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl";
const PALETTE = ["#2dd4bf", "#818cf8", "#fbbf24", "#fb7185", "#38bdf8", "#34d399"];

export default function Dashboard() {
  const [language, setLanguage] = useState<Language>("en");
  const [tab, setTab] = useState<Tab>("today");
  const [patients, setPatients] = useState<FamilyMember[]>([]);
  const [patient, setPatient] = useState("rakesh");
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [family, setFamily] = useState<FamilySummary[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", relation: "", age: "" });
  const [addBusy, setAddBusy] = useState(false);
  // Two workspaces: the shared "demo" family vs the user's personal account.
  const [realAcct, setRealAcct] = useState<{ id: string; name: string } | null>(null);
  const [view, setView] = useState<"demo" | "real">("demo");
  const [authOpen, setAuthOpen] = useState(false);

  const account = view === "real" && realAcct ? realAcct.id : "demo";
  const acctHeader = useCallback(() => ({ "x-mm-account": account }), [account]);

  const t = (en: string, hi: string) => (language === "hi" ? hi : en);

  const reloadPatients = useCallback(
    () => fetch("/api/patients", { headers: acctHeader() }).then((r) => r.json()).then((d) => setPatients(d.patients ?? [])).catch(() => {}),
    [acctHeader],
  );
  const reloadFamily = useCallback(
    (lang: Language) =>
      fetch(`/api/family?lang=${lang}`, { headers: acctHeader() }).then((r) => r.json()).then((d) => setFamily(d.members ?? [])).catch(() => {}),
    [acctHeader],
  );

  useEffect(() => {
    setAuthed(localStorage.getItem("mm_session") === "1");
    setAuthReady(true);
    const rid = localStorage.getItem("mm_real_id");
    const rname = localStorage.getItem("mm_real_name");
    if (rid && rname) setRealAcct({ id: rid, name: rname });
    // Always boot into the Demo workspace (presenter-safe). The personal
    // account stays available via the toggle; we just don't auto-resume it.
    const params = new URLSearchParams(window.location.search);
    const tp = params.get("tab");
    if (tp && ["today", "trends", "family", "plan", "records"].includes(tp)) {
      setTab(tp as Tab);
    }
    if (params.get("lang")) setLanguage(parseLang(params.get("lang")));
  }, []);

  // (Re)load the roster whenever the active account changes.
  useEffect(() => {
    reloadPatients();
  }, [reloadPatients]);

  // Keep the selected patient valid for the current account / after a removal.
  useEffect(() => {
    if (patients.length && !patients.some((p) => p.id === patient)) {
      setPatient(patients[0].id);
    }
  }, [patients, patient]);

  const load = useCallback(async (p: string, lang: Language) => {
    try {
      const [td, tl] = await Promise.all([
        fetch(`/api/today?patient=${p}&lang=${lang}`, { headers: acctHeader() }).then((r) => r.json()),
        fetch(`/api/timeline?patient=${p}&lang=${lang}`, { headers: acctHeader() }).then((r) => r.json()),
      ]);
      setToday(td as TodayPayload);
      setTimeline(tl as Timeline);
    } catch {
      /* keep */
    }
  }, [acctHeader]);

  useEffect(() => {
    load(patient, language);
  }, [patient, language, load]);

  useEffect(() => {
    reloadFamily(language);
  }, [language, patient, reloadFamily]);

  function goDemo() {
    setView("demo");
    localStorage.setItem("mm_view", "demo");
  }
  function goPersonal() {
    if (!realAcct) { setAuthOpen(true); return; }
    setView("real");
    localStorage.setItem("mm_view", "real");
  }
  function onAuthSuccess(acct: { id: string; name: string }) {
    localStorage.setItem("mm_real_id", acct.id);
    localStorage.setItem("mm_real_name", acct.name);
    localStorage.setItem("mm_view", "real");
    setRealAcct(acct);
    setView("real");
    setAuthOpen(false);
    setTab("today");
  }
  function signOutAccount() {
    localStorage.removeItem("mm_real_id");
    localStorage.removeItem("mm_real_name");
    localStorage.setItem("mm_view", "demo");
    setRealAcct(null);
    setView("demo");
  }

  async function addMember() {
    if (!addForm.name.trim() || addBusy) return;
    setAddBusy(true);
    try {
      await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...acctHeader() },
        body: JSON.stringify({ name: addForm.name, relation: addForm.relation, age: addForm.age }),
      });
      setAddForm({ name: "", relation: "", age: "" });
      setAddOpen(false);
      await Promise.all([reloadPatients(), reloadFamily(language)]);
    } finally {
      setAddBusy(false);
    }
  }

  async function removeMember(id: string) {
    if (!window.confirm(t("Remove this family member and all their records?", "इस सदस्य और उनके सभी रिकॉर्ड हटाएँ?"))) return;
    await fetch(`/api/family?id=${id}`, { method: "DELETE", headers: acctHeader() });
    await Promise.all([reloadPatients(), reloadFamily(language)]);
  }

  useEffect(() => {
    const onFocus = () => load(patient, language);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [patient, language, load]);

  function readAloud(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_LOCALE[language];
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  function formatSlot(iso: string) {
    return new Date(iso).toLocaleString(LANG_LOCALE[language], {
      weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    });
  }
  function shortDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  const current = patients.find((p) => p.id === patient);
  const langQ = language !== "en" ? `&lang=${language}` : "";
  const langQ1 = language !== "en" ? `lang=${language}` : "";
  const quote = QUOTES[(today?.reportCount ?? 0) % QUOTES.length];

  // ---------- tab renderers ----------
  function TodayTab() {
    if (!today) return <Spinner />;
    return (
      <div className="space-y-4">
        <div
          className="shimmer flex items-center gap-2 rounded-2xl p-3.5 text-sm font-medium text-teal-100 ring-1 ring-teal-500/25"
          style={{
            backgroundImage:
              "linear-gradient(110deg, rgba(45,212,191,0.16), rgba(99,102,241,0.10) 40%, rgba(45,212,191,0.16) 80%)",
          }}
        >
          <IconSpark size={15} /> <span>{t(quote.en, quote.hi)}</span>
        </div>

        {/* Hero: ring + verdict + projection */}
        <div className={`${card} p-5`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Ring value={today.healthScore} delta={today.scoreDelta} label={t("Health", "स्कोर")} />
            <div className="flex-1">
              <div className="mb-2 flex items-start gap-2">
                <p className="flex-1 leading-relaxed text-zinc-200">{today.verdictLine}</p>
                <button onClick={() => readAloud(today.verdictLine)} className="shrink-0 rounded-full border border-white/15 p-2 text-zinc-300 hover:bg-white/5" title={t("Listen", "सुनें")}>
                  <IconSound size={16} />
                </button>
              </div>
              {today.projectedSparkline && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
                  <Sparkline points={today.projectedSparkline.points} direction="rising" threshold={today.projectedSparkline.threshold} project width={130} height={52} />
                  <p className="text-xs font-medium text-amber-200">⚡ {today.projection}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Priority rail */}
        {today.actions.length > 0 && (
          <div>
            <SectionLabel>{t("Needs your attention", "ध्यान देने योग्य")}</SectionLabel>
            <div className="space-y-2.5">
              {today.actions.map((a, idx) =>
                a.cta ? (
                  // Prominent card for actionable items (with Book CTA)
                  <div key={a.id} className={`lift rounded-2xl border p-4 ${ACT[a.severity]}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[a.severity]}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-100">{a.title}</p>
                        <p className="mt-0.5 text-sm text-zinc-400">{a.detail}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                          <BookNow patient={patient} urgency={a.cta.urgency} reason={a.cta.reason} language={language} label={a.cta.label} />
                          {idx === 0 && (
                            <button onClick={() => readAloud(`${a.title}. ${a.detail}`)} className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5">
                              <IconSound size={13} /> {t("Listen", "सुनें")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Compact tappable row for informational flags
                  <Link
                    key={a.id}
                    href={`/upload?patient=${patient}${langQ}`}
                    className={`lift flex items-center gap-3 rounded-xl border px-4 py-2.5 ${ACT[a.severity]}`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[a.severity]}`} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-zinc-100">{a.title}</span>
                      <span className="ml-2 text-xs text-zinc-500">{a.detail}</span>
                    </div>
                    <span className="shrink-0 text-zinc-600">→</span>
                  </Link>
                ),
              )}
            </div>
          </div>
        )}

        {today.nextAppointment && (
          <div className={`${card} p-4`}>
            <SectionLabel>{t("Next appointment", "अगली अपॉइंटमेंट")}</SectionLabel>
            <p className="flex items-center gap-2 font-semibold text-zinc-100">
              <IconCalendar size={16} /> {formatSlot(today.nextAppointment.whenISO)}
              {today.nextAppointment.hospital ? ` · ${today.nextAppointment.hospital}` : ""}
            </p>
            <p className="text-sm text-zinc-400">{today.nextAppointment.reason}</p>
          </div>
        )}

        {today.screenings.length > 0 && (
          <div className={`${card} p-4`}>
            <SectionLabel>{t("Checkup reminders", "जाँच रिमाइंडर")}</SectionLabel>
            <div className="space-y-2">
              {today.screenings.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-zinc-200">{s.name}</span>
                  {s.overdue ? (
                    <span className="shrink-0 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">
                      {t("Overdue", "समय बीता")} ·{" "}
                      {new Date(s.nextDueISO).toLocaleDateString(LANG_LOCALE[language], { day: "numeric", month: "short" })}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-zinc-500">
                      {t("due", "नियत")}{" "}
                      {new Date(s.nextDueISO).toLocaleDateString(LANG_LOCALE[language], { day: "numeric", month: "short", year: "2-digit" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AddReport />
      </div>
    );
  }

  function TrendsTab() {
    if (!timeline) return <Spinner />;
    const metrics = timeline.metrics;
    const improved: string[] = [];
    const worsened: string[] = [];
    for (const m of metrics) {
      if (m.points.length < 2) continue;
      const f = RANK[m.points[0].status] ?? 0;
      const l = RANK[m.points[m.points.length - 1].status] ?? 0;
      const label = `${m.name} (${m.points[0].value} → ${m.points[m.points.length - 1].value})`;
      if (l < f) improved.push(label);
      else if (l > f) worsened.push(label);
    }
    return (
      <div className="space-y-4">
        <SectionLabel>{t("Health trajectory", "स्वास्थ्य दिशा")}</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((m, i) => (
            <div key={m.key} className={`${card} lift p-4`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">{m.name}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-sm font-bold tabular-nums"
                  style={{ color: PALETTE[i % PALETTE.length], backgroundColor: `${PALETTE[i % PALETTE.length]}1a` }}
                >
                  {m.points[0].value} → {m.points[m.points.length - 1].value}
                </span>
              </div>
              <AreaChart
                points={m.points}
                color={PALETTE[i % PALETTE.length]}
                threshold={m.key === "hba1c" ? 6.5 : undefined}
                height={140}
              />
              {m.projection && <p className="mt-1 text-xs text-amber-300">⚡ {m.projection}</p>}
            </div>
          ))}
        </div>

        {(improved.length > 0 || worsened.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`${card} p-4`}>
              <p className="mb-2 text-sm font-semibold text-emerald-300">{t("Improved", "सुधार")}</p>
              {improved.length ? (
                <ul className="space-y-1 text-sm text-zinc-300">{improved.map((x, i) => <li key={i}>↑ {x}</li>)}</ul>
              ) : (
                <p className="text-sm text-zinc-500">{t("No improvements yet.", "अभी कोई सुधार नहीं।")}</p>
              )}
            </div>
            <div className={`${card} p-4`}>
              <p className="mb-2 text-sm font-semibold text-red-300">{t("Worsened", "गिरावट")}</p>
              {worsened.length ? (
                <ul className="space-y-1 text-sm text-zinc-300">{worsened.map((x, i) => <li key={i}>↓ {x}</li>)}</ul>
              ) : (
                <p className="text-sm text-zinc-500">{t("Nothing worsened. 🎉", "कुछ नहीं बिगड़ा।")}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function FamilyTab() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">{t("Manage your whole family's health in one place.", "अपने पूरे परिवार की सेहत एक जगह संभालें।")}</p>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="shrink-0 rounded-full border border-teal-500/40 bg-teal-500/10 px-3.5 py-1.5 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/20"
          >
            {addOpen ? t("Close", "बंद करें") : `+ ${t("Add member", "सदस्य जोड़ें")}`}
          </button>
        </div>

        {addOpen && (
          <form
            onSubmit={(e) => { e.preventDefault(); addMember(); }}
            className={`${card} panel-in grid gap-3 p-4 sm:grid-cols-[2fr_1.4fr_0.8fr_auto]`}
          >
            <input
              autoFocus
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("Full name", "पूरा नाम")}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-500/50"
            />
            <input
              value={addForm.relation}
              onChange={(e) => setAddForm((f) => ({ ...f, relation: e.target.value }))}
              placeholder={t("Relation (e.g. Mother)", "रिश्ता (जैसे माँ)")}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-500/50"
            />
            <input
              value={addForm.age}
              onChange={(e) => setAddForm((f) => ({ ...f, age: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
              inputMode="numeric"
              placeholder={t("Age", "उम्र")}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-500/50"
            />
            <button
              type="submit"
              disabled={!addForm.name.trim() || addBusy}
              className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition enabled:hover:bg-teal-400 disabled:opacity-40"
            >
              {addBusy ? "…" : t("Add", "जोड़ें")}
            </button>
          </form>
        )}

        <div className="grid items-start gap-3 sm:grid-cols-2">
          {family.map((m) => (
            <div
              key={m.id}
              className={`${card} lift group relative flex items-center gap-4 p-4 ${m.id === patient ? "ring-1 ring-teal-500/40" : ""}`}
            >
              {family.length > 1 && (
                <button
                  onClick={() => removeMember(m.id)}
                  title={t("Remove", "हटाएँ")}
                  className="absolute right-2.5 top-2.5 z-10 hidden h-6 w-6 place-items-center rounded-full border border-white/10 text-zinc-500 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 group-hover:grid"
                >
                  ×
                </button>
              )}
              <button onClick={() => { setPatient(m.id); setTab("today"); }} className="flex flex-1 items-center gap-4 text-left">
                <Ring value={m.score} size={64} stroke={7} delta={m.delta} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-100">{m.name}</p>
                  <p className="text-xs text-zinc-400">{m.relation} · {m.age}</p>
                  {m.lastVisitISO && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {t("Last visit", "पिछली विज़िट")} {shortDate(m.lastVisitISO)}{m.lastReportType ? ` · ${m.lastReportType}` : ""}
                    </p>
                  )}
                  {m.reportCount === 0 ? (
                    <p className="mt-1.5 text-xs text-teal-400/80">{t("No records yet — add a report", "अभी कोई रिकॉर्ड नहीं — रिपोर्ट जोड़ें")}</p>
                  ) : m.topAlert ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${DOT[m.severity]}`} /> {m.topAlert}
                    </p>
                  ) : null}
                  {m.hasUpcoming && <p className="mt-1 text-xs text-teal-400">{t("Appointment booked", "अपॉइंटमेंट बुक")}</p>}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function PlanTab() {
    if (!today) return <Spinner />;
    if (!today.hasAnalysis)
      return (
        <Empty>
          {t("Add a report to get a personalised plan.", "योजना के लिए रिपोर्ट जोड़ें।")}
        </Empty>
      );
    return (
      <div className="space-y-4">
        {today.plan && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`${card} p-4`}>
              <p className="mb-2 font-semibold text-emerald-300">{t("Eat", "आहार")}</p>
              <ul className="space-y-1.5 text-sm text-zinc-300">{today.plan.diet.slice(0, 5).map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
            <div className={`${card} p-4`}>
              <p className="mb-2 font-semibold text-emerald-300">{t("Move", "कसरत")}</p>
              <ul className="space-y-1.5 text-sm text-zinc-300">{today.plan.activity.slice(0, 5).map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          </div>
        )}
        {today.medicines.length > 0 && (
          <div className={`${card} p-4`}>
            <p className="mb-2 font-semibold text-zinc-100">{t("Medicines & savings", "दवाएँ और बचत")}</p>
            <div className="space-y-2">
              {today.medicines.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-teal-300">{m.topic}:</span> <span className="text-zinc-300">{m.suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {today.scheme && (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.08] p-4">
            <p className="font-semibold text-indigo-200">🇮🇳 {today.scheme.scheme}</p>
            <p className="mt-1 text-sm text-zinc-300">{today.scheme.note}</p>
          </div>
        )}
      </div>
    );
  }

  function RecordsTab() {
    if (!timeline) return <Spinner />;
    const reps = [...timeline.reports].reverse();
    const passport = `MediMitra Health Passport — ${current?.name ?? "Patient"} | Score ${today?.healthScore ?? "-"} | ${today?.projection ?? ""}`;
    return (
      <div className="space-y-4">
        <SectionLabel>{t("Your records", "आपके रिकॉर्ड")}</SectionLabel>
        <div className={`${card} p-4`}>
          <div className="space-y-3">
            {reps.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
                  {i < reps.length - 1 && <span className="my-0.5 h-7 w-px bg-white/10" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">{r.reportType}</p>
                  <p className="text-xs text-zinc-500">{shortDate(r.date)}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-300">
                  {r.healthScore}
                </span>
              </div>
            ))}
          </div>
        </div>

        {today?.nextAppointment && (
          <div className={`${card} p-4`}>
            <SectionLabel>{t("Upcoming visit", "आगामी विज़िट")}</SectionLabel>
            <p className="flex items-center gap-2 text-sm text-zinc-200">
              <IconCalendar size={15} /> {formatSlot(today.nextAppointment.whenISO)}
              {today.nextAppointment.hospital ? ` · ${today.nextAppointment.hospital}` : ""}
            </p>
          </div>
        )}

        {/* Health Passport QR */}
        <div className={`${card} flex items-center gap-4 p-4`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&bgcolor=20-24-28&color=255-255-255&data=${encodeURIComponent(passport)}`}
            alt="Health passport QR"
            width={88}
            height={88}
            className="rounded-lg bg-white/5"
          />
          <div>
            <p className="font-semibold text-zinc-100">{t("Health Passport", "हेल्थ पासपोर्ट")}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {t("Show this to any new doctor — your summary travels with you.", "किसी भी नए डॉक्टर को दिखाएँ — आपका सारांश आपके साथ।")}
            </p>
          </div>
        </div>

        <AddReport />
      </div>
    );
  }

  function AddReport() {
    return (
      <div className={`${card} border-dashed p-5 text-center`}>
        <p className="text-sm text-zinc-300">
          {t(`New report for ${current?.name.split(" ")[0] ?? "this member"}?`, "नई रिपोर्ट है?")}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <Link href={`/upload?patient=${patient}${langQ}`} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400">
            {t("Upload report", "रिपोर्ट अपलोड")}
          </Link>
          <Link href={`/upload?patient=${patient}&sample=1${langQ}`} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/5">
            {t("Try a sample", "नमूना आज़माएँ")}
          </Link>
        </div>
        <Link
          href={`/prescription?${langQ1}`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-400 hover:underline"
        >
          {t("Have a prescription? Order medicines", "पर्चा है? दवाएँ मँगाएँ")} →
        </Link>
      </div>
    );
  }

  if (!authReady) {
    return <div className="min-h-screen" style={{ background: "#060708" }} />;
  }
  if (!authed) {
    return (
      <Landing
        onEnter={() => {
          localStorage.setItem("mm_session", "1");
          setAuthed(true);
        }}
        language={language}
        setLanguage={setLanguage}
      />
    );
  }

  return (
    <div className="dotgrid relative min-h-screen text-zinc-200" style={{ background: "#060708" }}>
      <div className="aurora" />
      <div className="aurora2" />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={onAuthSuccess} language={language} />
      <div className="relative z-10 mx-auto flex max-w-6xl">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 p-5 md:flex">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-500 text-lg font-bold text-zinc-950">म</div>
            <span className="text-lg font-semibold tracking-tight text-white">MediMitra</span>
          </div>
          <nav className="space-y-1">
            {NAV.map(({ key, en, hi, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${tab === key ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"}`}
              >
                <Icon size={18} /> {t(en, hi)}
              </button>
            ))}
            <Link
              href={`/prescription?${langQ1}`}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-200"
            >
              <IconPill size={18} /> {t("Meds", "दवाएँ")}
            </Link>
          </nav>
          <div className="mt-auto space-y-2">
            {/* Workspace toggle: shared demo family vs your personal account */}
            <div className="flex overflow-hidden rounded-xl border border-white/10 text-xs">
              <button
                onClick={goDemo}
                className={`flex-1 px-2 py-1.5 font-medium transition ${view === "demo" ? "bg-teal-500 text-zinc-950" : "text-zinc-400 hover:bg-white/5"}`}
              >
                {t("Demo", "डेमो")}
              </button>
              <button
                onClick={goPersonal}
                className={`flex-1 truncate px-2 py-1.5 font-medium transition ${view === "real" ? "bg-teal-500 text-zinc-950" : "text-zinc-400 hover:bg-white/5"}`}
              >
                {realAcct ? realAcct.name.split(" ")[0] : t("My family", "मेरा परिवार")}
              </button>
            </div>
            {view === "demo" ? (
              <p className="px-1 text-[11px] leading-snug text-zinc-500">
                {t("Demo data · ", "डेमो डेटा · ")}
                <button onClick={goPersonal} className="text-teal-400 hover:underline">
                  {realAcct ? t("switch to yours", "अपना देखें") : t("add your own →", "अपना जोड़ें →")}
                </button>
              </p>
            ) : (
              <p className="px-1 text-[11px] leading-snug text-zinc-500">
                {t("Signed in · ", "साइन इन · ")}<span className="text-zinc-300">{realAcct?.name}</span>{" · "}
                <button onClick={signOutAccount} className="text-teal-400 hover:underline">{t("sign out", "साइन आउट")}</button>
              </p>
            )}
            <LanguageSelect value={language} onChange={setLanguage} className="w-full [&>select]:w-full" />
            <button
              onClick={() => {
                localStorage.removeItem("mm_session");
                setAuthed(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300"
            >
              {t("Log out", "लॉग आउट")}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-8">
          {/* Top header */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 md:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500 text-base font-bold text-zinc-950">म</div>
              <span className="font-semibold text-white">MediMitra</span>
            </div>
            <h1 className="hidden text-3xl font-bold tracking-tight text-white md:block">
              {t(NAV.find((n) => n.key === tab)!.en, NAV.find((n) => n.key === tab)!.hi)}
            </h1>
            <div className="flex items-center gap-2">
              {/* family avatars */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {patients.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setPatient(p.id)}
                    title={`${p.name} · ${p.relation}`}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-zinc-950 transition ${AVATAR[i % AVATAR.length]} ${p.id === patient ? "ring-2 ring-white/70" : "opacity-70 hover:opacity-100"}`}
                  >
                    {initials(p.name)}
                  </button>
                ))}
              </div>
              <div className="md:hidden">
                <LanguageSelect value={language} onChange={setLanguage} />
              </div>
            </div>
          </div>

          {current && (
            <p className="mb-4 text-sm text-zinc-400">
              {current.name} · {current.age} · {current.relation}
            </p>
          )}

          <div key={tab} className="rise">
            {tab === "today" && <TodayTab />}
            {tab === "trends" && <TrendsTab />}
            {tab === "family" && <FamilyTab />}
            {tab === "plan" && <PlanTab />}
            {tab === "records" && <RecordsTab />}
          </div>

          <footer className="mt-10 text-center text-xs text-zinc-600">
            {t(
              "MediMitra is not a doctor and does not diagnose. Always consult a qualified professional.",
              "MediMitra डॉक्टर नहीं है और निदान नहीं देता। हमेशा योग्य चिकित्सक से परामर्श करें।",
            )}
          </footer>
        </main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-white/10 bg-[#0c0f12]/95 backdrop-blur md:hidden">
        {NAV.map(({ key, en, hi, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${tab === key ? "text-teal-400" : "text-zinc-500"}`}
          >
            <Icon size={20} /> {t(en, hi)}
          </button>
        ))}
        <Link
          href={`/prescription?${langQ1}`}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] text-zinc-500"
        >
          <IconPill size={20} /> {t("Meds", "दवाएँ")}
        </Link>
      </nav>

      <ChatAssistant patient={patient} language={language} />
    </div>
  );
}

function Spinner() {
  return (
    <div className="grid min-h-64 place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-teal-400" />
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
      <span className="inline-block h-1.5 w-1.5 rounded-[2px] bg-teal-500/70" />
      {children}
    </h2>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}
