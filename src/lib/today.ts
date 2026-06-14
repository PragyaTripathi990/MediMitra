import {
  getPatients,
  getTimeline,
  getLatestAnalysis,
  getAppointments,
} from "./db";
import type {
  ActionSeverity,
  FamilySummary,
  Language,
  ReportAnalysis,
  Screening,
  Timeline,
  TodayAction,
  TodayPayload,
  TriageLevel,
  VitalGlance,
} from "./types";

// Map a metric to its recommended re-screening cadence (days).
const SCREENING_RULES: { keys: string[]; en: string; hi: string; everyDays: number }[] = [
  { keys: ["hba1c", "fastingbloodglucose"], en: "Blood sugar (HbA1c)", hi: "ब्लड शुगर (HbA1c)", everyDays: 90 },
  { keys: ["ldlcholesterol", "totalcholesterol", "triglycerides", "hdlcholesterol"], en: "Lipid profile", hi: "लिपिड प्रोफ़ाइल", everyDays: 180 },
  { keys: ["systolicbp"], en: "Blood pressure", hi: "रक्तचाप", everyDays: 30 },
  { keys: ["serumcreatinine", "egfr"], en: "Kidney function", hi: "किडनी जाँच", everyDays: 90 },
  { keys: ["hemoglobin"], en: "Complete blood count", hi: "सीबीसी", everyDays: 180 },
  { keys: ["tsh"], en: "Thyroid (TSH)", hi: "थायरॉइड (TSH)", everyDays: 180 },
  { keys: ["serumpotassium", "serumsodium"], en: "Electrolytes", hi: "इलेक्ट्रोलाइट्स", everyDays: 90 },
];

function buildScreenings(timeline: Timeline, language: Language): Screening[] {
  const out: Screening[] = [];
  for (const rule of SCREENING_RULES) {
    // latest date this category was measured
    let last = "";
    for (const m of timeline.metrics) {
      if (!rule.keys.includes(m.key)) continue;
      const d = m.points[m.points.length - 1].date;
      if (d > last) last = d;
    }
    if (!last) continue;
    const nextDue = new Date(
      new Date(last).getTime() + rule.everyDays * 86400000,
    ).toISOString();
    out.push({
      name: language === "hi" ? rule.hi : rule.en,
      everyDays: rule.everyDays,
      lastISO: last,
      nextDueISO: nextDue,
      overdue: new Date(nextDue).getTime() < Date.now(),
    });
  }
  // Overdue first, then soonest due.
  return out.sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      new Date(a.nextDueISO).getTime() - new Date(b.nextDueISO).getTime(),
  );
}

const L = (lang: Language, en: string, hi: string) => (lang === "hi" ? hi : en);

// First sentence, but don't break on "Mr." / "Dr." — only split after position 25.
function firstSentence(text: string): string {
  const s = text.trim();
  if (s.length <= 25) return s;
  const m = s.slice(25).search(/[.।]\s/);
  if (m >= 0) return s.slice(0, 25 + m + 1).trim();
  return s.length > 200 ? s.slice(0, 200).trim() + "…" : s;
}

interface Ranked extends TodayAction {
  priority: number;
}

function urgencyFromSeverity(s: ActionSeverity): TriageLevel {
  return s === "critical" ? "urgent" : s === "warning" ? "soon" : "routine";
}

function daysAgo(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86400000),
  );
}

/**
 * The ranking brain. MUST work with latestAnalysis === null (cold open) — it
 * then derives everything from the always-populated timeline + appointments.
 */
export function deriveActions(
  timeline: Timeline,
  latest: ReportAnalysis | null,
  appointments: { reason: string; whenISO: string; status: string }[],
  language: Language,
): TodayAction[] {
  const out: Ranked[] = [];
  const covered = new Set<string>();
  const upcoming = appointments.filter(
    (a) => new Date(a.whenISO).getTime() >= Date.now(),
  );

  // 1) Emergency / urgent triage (only when we have a fresh analysis)
  if (latest && (latest.triage.level === "emergency" || latest.triage.level === "urgent")) {
    out.push({
      id: "triage",
      kind: "triage",
      priority: latest.triage.level === "emergency" ? 0 : 1.2,
      severity: "critical",
      icon: latest.triage.level === "emergency" ? "🚑" : "⚠️",
      title: L(language, "Your latest report needs prompt attention", "आपकी रिपोर्ट पर तुरंत ध्यान दें"),
      detail: latest.triage.message,
      cta: {
        label: L(language, "Book now", "अभी बुक करें"),
        urgency: latest.triage.level,
        reason: L(language, "Urgent review of latest results", "ताज़ा नतीजों की तुरंत समीक्षा"),
      },
    });
  }

  // 2) HbA1c → diabetes projection (the headline; from timeline, always available)
  const proj = timeline.metrics.find((m) => m.projection);
  if (proj) {
    covered.add(proj.key);
    out.push({
      id: "projection",
      kind: "projection",
      priority: 1,
      severity: "critical",
      icon: "📈",
      title: L(
        language,
        "Your blood sugar is trending toward diabetes",
        "आपका ब्लड शुगर डायबिटीज़ की ओर बढ़ रहा है",
      ),
      detail: L(
        language,
        proj.projection ?? "Rising over your recent reports — acting now can change the course.",
        "हाल की रिपोर्टों में बढ़ोतरी — अभी कदम उठाने से रुख बदला जा सकता है।",
      ),
      cta: {
        label: L(language, "Book a review", "समीक्षा बुक करें"),
        urgency: "soon",
        reason: L(language, "Rising HbA1c trending toward diabetes", "बढ़ता HbA1c, डायबिटीज़ का जोखिम"),
      },
    });
  }

  // 3) Current breaches (high/critical) from timeline metrics
  for (const m of timeline.metrics) {
    if (covered.has(m.key)) continue;
    if (m.latestStatus !== "high" && m.latestStatus !== "critical") continue;
    covered.add(m.key);
    const sev: ActionSeverity = m.latestStatus === "critical" ? "critical" : "warning";
    const last = m.points[m.points.length - 1].value;
    out.push({
      id: `breach-${m.key}`,
      kind: "breach",
      priority: sev === "critical" ? 1.5 : 3,
      severity: sev,
      icon: sev === "critical" ? "🚨" : "⚠️",
      title: L(language, `${m.name} is ${m.latestStatus}`, `${m.name} ${m.latestStatus === "critical" ? "गंभीर रूप से अधिक" : "अधिक"} है`),
      detail: L(
        language,
        `Latest reading ${last} — above the healthy range.`,
        `पिछली रीडिंग ${last} — स्वस्थ सीमा से ऊपर।`,
      ),
      cta: null,
    });
    if (out.length >= 8) break;
  }

  // 4) Fresh-analysis alerts (interactions, etc.)
  if (latest) {
    latest.alerts.slice(0, 2).forEach((a, i) => {
      const sev: ActionSeverity =
        a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "info";
      out.push({
        id: `alert-${i}`,
        kind: "alert",
        priority: sev === "critical" ? 1.6 : sev === "warning" ? 3.2 : 5,
        severity: sev,
        icon: sev === "critical" ? "🚨" : sev === "warning" ? "⚠️" : "ℹ️",
        title: a.title,
        detail: a.detail,
        cta: null,
      });
    });
    // Lab-error flags
    latest.dataQualityFlags.slice(0, 1).forEach((d, i) => {
      out.push({
        id: `dq-${i}`,
        kind: "dataQuality",
        priority: 4,
        severity: "info",
        icon: "🔬",
        title: L(language, "Possible lab data error", "रिपोर्ट में संभावित त्रुटि"),
        detail: d,
        cta: null,
      });
    });
  }

  // 5) No follow-up booked while results need review
  const needsReview =
    !!proj ||
    timeline.metrics.some((m) => m.latestStatus === "high" || m.latestStatus === "critical") ||
    (latest?.followUp?.recommended ?? false);
  if (!upcoming.length && needsReview) {
    const lastReport = timeline.reports[timeline.reports.length - 1];
    const n = lastReport ? daysAgo(lastReport.date) : 0;
    out.push({
      id: "no-followup",
      kind: "no-followup",
      priority: 3.5,
      severity: "warning",
      icon: "🗓️",
      title: L(language, "No follow-up booked", "कोई फ़ॉलो-अप बुक नहीं"),
      detail: L(
        language,
        `Your last report was ${n} days ago and your numbers need review.`,
        `आपकी पिछली रिपोर्ट ${n} दिन पुरानी है और समीक्षा ज़रूरी है।`,
      ),
      cta: {
        label: L(language, "Book now", "अभी बुक करें"),
        urgency: "soon",
        reason: L(language, "Follow-up for abnormal results", "असामान्य नतीजों के लिए फ़ॉलो-अप"),
      },
    });
  }

  // 6) Rising INTO bad territory (skip "low" rising — that's recovery, not a concern)
  for (const m of timeline.metrics) {
    if (covered.has(m.key)) continue;
    if (
      m.direction !== "rising" ||
      m.latestStatus === "normal" ||
      m.latestStatus === "low"
    )
      continue;
    covered.add(m.key);
    out.push({
      id: `rising-${m.key}`,
      kind: "rising",
      priority: 5.5,
      severity: "info",
      icon: "📊",
      title: L(language, `${m.name} is creeping up`, `${m.name} बढ़ रहा है`),
      detail: L(language, "Worth keeping an eye on.", "ध्यान रखने योग्य।"),
      cta: null,
    });
    if (out.length >= 8) break;
  }

  // 7) Nothing pressing → an encouraging, positive card (improving patients)
  if (out.length === 0) {
    const improving = timeline.reports.length >= 2 &&
      timeline.reports[timeline.reports.length - 1].healthScore >
        timeline.reports[timeline.reports.length - 2].healthScore;
    out.push({
      id: "ontrack",
      kind: "ontrack",
      priority: 9,
      severity: "info",
      icon: improving ? "🌟" : "✅",
      title: improving
        ? L(language, "You're improving — keep it up!", "आप बेहतर हो रहे हैं — जारी रखें!")
        : L(language, "You're on track", "आप सही राह पर हैं"),
      detail: improving
        ? L(language, "Your recent results are moving in the right direction.", "आपके हाल के नतीजे सही दिशा में हैं।")
        : L(language, "Nothing urgent right now. Keep up your healthy habits.", "अभी कुछ ज़रूरी नहीं। अच्छी आदतें जारी रखें।"),
      cta: null,
    });
  }

  out.sort((a, b) => a.priority - b.priority);
  return out.slice(0, 5).map(({ priority: _p, ...rest }) => rest);
}

export function buildTodayPayload(
  patientId: string,
  language: Language,
): TodayPayload {
  const timeline = getTimeline(patientId);
  const latest = getLatestAnalysis(patientId);
  const appointments = getAppointments(patientId);

  const reports = timeline.reports;
  const last = reports[reports.length - 1];
  const prev = reports[reports.length - 2];
  const healthScore = last ? last.healthScore : null;
  const scoreDelta = last && prev ? last.healthScore - prev.healthScore : null;

  const hba1c = timeline.metrics.find((m) => m.key === "hba1c" && m.projection);
  const projection =
    timeline.metrics.find((m) => m.projection)?.projection ?? null;

  const vitals: VitalGlance[] = timeline.metrics.slice(0, 3).map((m) => ({
    name: m.name,
    value: m.points[m.points.length - 1].value,
    status: m.latestStatus,
    direction: m.direction,
    points: m.points,
  }));

  const upcoming = appointments
    .filter((a) => new Date(a.whenISO).getTime() >= Date.now())
    .sort((a, b) => new Date(a.whenISO).getTime() - new Date(b.whenISO).getTime());

  const verdictLine =
    (latest?.summary ? firstSentence(latest.summary) : "") ||
    L(
      language,
      "Your numbers are drifting up — small steps now can keep you out of the diabetes range.",
      "आपके आँकड़े बढ़ रहे हैं — अभी छोटे कदम आपको डायबिटीज़ से दूर रख सकते हैं।",
    );

  return {
    hasAnalysis: latest !== null,
    healthScore,
    scoreDelta,
    verdictLine,
    projection,
    projectedSparkline: hba1c
      ? { points: hba1c.points, threshold: 6.5 }
      : null,
    actions: deriveActions(timeline, latest, appointments, language),
    vitals,
    nextAppointment: upcoming[0] ?? null,
    reportCount: reports.length,
    plan: latest ? latest.lifestylePlan : null,
    medicines: latest ? latest.medicineGuidance : [],
    scheme: latest?.schemeEligibility?.likely ? latest.schemeEligibility : null,
    screenings: buildScreenings(timeline, language),
  };
}

export function getFamilySummaries(language: Language): FamilySummary[] {
  return getPatients().map((m) => {
    const p = buildTodayPayload(m.id, language);
    const top = p.actions[0];
    const reports = getTimeline(m.id).reports;
    const last = reports[reports.length - 1] ?? null;
    return {
      id: m.id,
      name: m.name,
      relation: m.relation,
      age: m.age,
      score: p.healthScore,
      delta: p.scoreDelta,
      topAlert: top ? top.title : null,
      severity: top ? top.severity : "info",
      hasUpcoming: !!p.nextAppointment,
      lastVisitISO: last ? last.date : null,
      lastReportType: last ? last.reportType : null,
      reportCount: reports.length,
    };
  });
}
