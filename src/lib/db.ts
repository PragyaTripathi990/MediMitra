import Database from "better-sqlite3";
import path from "path";
import { LANG_LOCALE } from "./lang";
import type {
  FamilyMember,
  Language,
  MetricTrend,
  ReportAnalysis,
  ReportSummaryRow,
  Timeline,
  TrendPoint,
} from "./types";

// The default demo family — seeded once into the `patients` table.
// After seeding, the table is the source of truth (members can be added/removed).
export const FAMILY: FamilyMember[] = [
  { id: "rakesh", name: "Rakesh Sharma", relation: "You", age: 54 },
  { id: "sunita", name: "Sunita Sharma", relation: "Wife", age: 49 },
  { id: "mohan", name: "Mohan Sharma", relation: "Father", age: 78 },
];

export function getPatients(): FamilyMember[] {
  const db = getDb(); // ensure seeded
  const rows = db
    .prepare(
      "SELECT id, name, relation, age FROM patients ORDER BY sort_order ASC, created_at ASC",
    )
    .all() as FamilyMember[];
  return rows.length ? rows : FAMILY;
}

// Slug an id from a name, keeping it unique against existing patients.
function uniquePatientId(db: Database.Database, name: string): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "member";
  const exists = (id: string) =>
    !!db.prepare("SELECT 1 FROM patients WHERE id = ?").get(id);
  if (!exists(base)) return base;
  for (let i = 2; i < 999; i++) {
    const candidate = `${base}-${i}`;
    if (!exists(candidate)) return candidate;
  }
  return `${base}-${Math.floor(performance.now())}`;
}

export function addPatient(
  name: string,
  relation: string,
  age: number,
): FamilyMember {
  const db = getDb();
  const id = uniquePatientId(db, name);
  const maxOrder =
    (
      db.prepare("SELECT MAX(sort_order) as m FROM patients").get() as {
        m: number | null;
      }
    ).m ?? 0;
  const nowISO = new Date(Date.now()).toISOString();
  db.prepare(
    "INSERT INTO patients (id, name, relation, age, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, name.trim(), relation.trim() || "Family", Math.round(age) || 0, maxOrder + 1, nowISO);
  return { id, name: name.trim(), relation: relation.trim() || "Family", age: Math.round(age) || 0 };
}

export function removePatient(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM metrics WHERE patient_id = ?").run(id);
  db.prepare("DELETE FROM reports WHERE patient_id = ?").run(id);
  db.prepare("DELETE FROM appointments WHERE patient_id = ?").run(id);
  db.prepare("DELETE FROM patients WHERE id = ?").run(id);
}

// ---- connection ----
let _db: Database.Database | null = null;

// On serverless hosts (Vercel) the project dir is read-only — only /tmp is
// writable — so the DB must live there. Locally it sits in the project root.
// Override explicitly with MEDIMITRA_DB_PATH (e.g. a mounted volume in prod).
const DB_PATH =
  process.env.MEDIMITRA_DB_PATH ||
  (process.env.VERCEL ? "/tmp/medimitra.db" : path.join(process.cwd(), "medimitra.db"));

function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      report_date TEXT NOT NULL,
      report_type TEXT,
      health_score INTEGER,
      summary TEXT,
      analysis_json TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      patient_id TEXT NOT NULL,
      report_date TEXT NOT NULL,
      name TEXT,
      norm_key TEXT,
      value_num REAL,
      status TEXT,
      reference_range TEXT
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      reason TEXT,
      when_iso TEXT,
      status TEXT,
      hospital TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      relation TEXT,
      age INTEGER,
      sort_order INTEGER,
      created_at TEXT
    );
  `);
  seedPatientsIfEmpty(_db);
  seedIfEmpty(_db);
  return _db;
}

// Seed the default family roster (independent of the reports seed, so it also
// populates on a DB that already had reports before the patients table existed).
function seedPatientsIfEmpty(db: Database.Database) {
  const count = (
    db.prepare("SELECT COUNT(*) as c FROM patients").get() as { c: number }
  ).c;
  if (count > 0) return;
  const ins = db.prepare(
    "INSERT INTO patients (id, name, relation, age, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  FAMILY.forEach((m, i) => ins.run(m.id, m.name, m.relation, m.age, i, "2024-01-01T00:00:00.000Z"));
}

// ---- helpers ----
export function normKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // drop parentheticals
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseNum(value: string): number | null {
  const m = value.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// ---- write ----
export function insertReport(
  patientId: string,
  reportDateISO: string,
  analysis: ReportAnalysis,
): number {
  const db = getDb();
  const day = reportDateISO.slice(0, 10);
  // Replace any report for the same patient + day (keeps demo timeline clean).
  const dupes = db
    .prepare(
      "SELECT id FROM reports WHERE patient_id = ? AND substr(report_date,1,10) = ?",
    )
    .all(patientId, day) as { id: number }[];
  for (const d of dupes) {
    db.prepare("DELETE FROM metrics WHERE report_id = ?").run(d.id);
    db.prepare("DELETE FROM reports WHERE id = ?").run(d.id);
  }

  const info = db
    .prepare(
      `INSERT INTO reports (patient_id, report_date, report_type, health_score, summary, analysis_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      patientId,
      reportDateISO,
      analysis.reportType,
      Math.round(Number(analysis.healthScore) || 0),
      analysis.summary,
      JSON.stringify(analysis),
      reportDateISO,
    );
  const reportId = Number(info.lastInsertRowid);

  const insMetric = db.prepare(
    `INSERT INTO metrics (report_id, patient_id, report_date, name, norm_key, value_num, status, reference_range)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const f of analysis.findings) {
    const num = parseNum(f.value);
    if (num === null) continue;
    insMetric.run(
      reportId,
      patientId,
      reportDateISO,
      f.name,
      normKey(f.name),
      num,
      f.status,
      f.referenceRange,
    );
  }
  return reportId;
}

// ---- read / trends ----
function linearProjectDays(
  points: TrendPoint[],
  threshold: number,
): number | null {
  // Least-squares slope of value vs. days-since-first; days until `threshold`.
  const t0 = new Date(points[0].date).getTime();
  const xs = points.map((p) => (new Date(p.date).getTime() - t0) / 86400000);
  const ys = points.map((p) => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den; // per day
  const latest = ys[ys.length - 1];
  if (slope <= 0 || latest >= threshold) return null;
  return (threshold - latest) / slope;
}

function monthYear(iso: string, locale = "en-US"): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function getTimeline(patientId: string, language: Language = "en"): Timeline {
  const db = getDb();
  const reportRows = db
    .prepare(
      "SELECT report_date as date, report_type as reportType, health_score as healthScore FROM reports WHERE patient_id = ? ORDER BY report_date ASC",
    )
    .all(patientId) as ReportSummaryRow[];

  const metricRows = db
    .prepare(
      "SELECT name, norm_key, report_date, value_num, status FROM metrics WHERE patient_id = ? ORDER BY report_date ASC",
    )
    .all(patientId) as {
    name: string;
    norm_key: string;
    report_date: string;
    value_num: number;
    status: string;
  }[];

  const byKey = new Map<
    string,
    { name: string; points: TrendPoint[] }
  >();
  for (const r of metricRows) {
    if (!byKey.has(r.norm_key))
      byKey.set(r.norm_key, { name: r.name, points: [] });
    const entry = byKey.get(r.norm_key)!;
    entry.name = r.name; // latest name wins
    entry.points.push({
      date: r.report_date,
      value: r.value_num,
      status: r.status,
    });
  }

  const metrics: MetricTrend[] = [];
  for (const [key, { name, points }] of byKey) {
    if (points.length < 2) continue;
    const first = points[0].value;
    const last = points[points.length - 1].value;
    const direction =
      last > first * 1.02 ? "rising" : last < first * 0.98 ? "falling" : "stable";

    let projection: string | undefined;
    if (key === "hba1c") {
      const days = linearProjectDays(points, 6.5);
      if (days !== null && days < 1500) {
        const eta = new Date(
          new Date(points[points.length - 1].date).getTime() +
            days * 86400000,
        ).toISOString();
        const my = monthYear(eta, LANG_LOCALE[language]);
        projection =
          language === "hi"
            ? `इसी गति से, HbA1c डायबिटीज़ सीमा (6.5%) तक ${my} के आसपास पहुँच जाएगा।`
            : `At this pace, HbA1c reaches the diabetes threshold (6.5%) around ${my}.`;
      }
    }

    metrics.push({
      key,
      name,
      points,
      direction,
      latestStatus: points[points.length - 1].status,
      projection,
    });
  }

  // Most-changed metrics first.
  metrics.sort((a, b) => {
    const ca = Math.abs(a.points[a.points.length - 1].value - a.points[0].value);
    const cb = Math.abs(b.points[b.points.length - 1].value - b.points[0].value);
    return cb - ca;
  });

  return { reports: reportRows, metrics };
}

// ---- appointments (Phase 3) ----
export function getLatestAnalysis(
  patientId: string,
  language: Language = "en",
): ReportAnalysis | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT analysis_json FROM reports WHERE patient_id = ? AND analysis_json != '{}' ORDER BY report_date DESC LIMIT 1",
    )
    .get(patientId) as { analysis_json: string } | undefined;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.analysis_json) as ReportAnalysis & {
      __seed?: string;
    };
    // Seeded reports store a marker; resolve to the in-code analysis, with
    // Hindi overrides merged when the user is viewing in Hindi. Real uploads
    // (no marker) are returned as stored, in whatever language they were made.
    if (parsed.__seed && SEED_ANALYSIS[parsed.__seed]) {
      const base = SEED_ANALYSIS[parsed.__seed];
      return language === "hi" && SEED_HI[parsed.__seed]
        ? { ...base, ...SEED_HI[parsed.__seed] }
        : base;
    }
    return parsed as ReportAnalysis;
  } catch {
    return null;
  }
}

export function getAppointments(patientId: string): {
  reason: string;
  whenISO: string;
  status: string;
}[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT reason, when_iso as whenISO, status, hospital FROM appointments WHERE patient_id = ? ORDER BY when_iso ASC",
    )
    .all(patientId) as {
    reason: string;
    whenISO: string;
    status: string;
    hospital?: string;
  }[];
}

export function bookAppointment(
  patientId: string,
  reason: string,
  whenISO: string,
  hospital?: string,
): number {
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO appointments (patient_id, reason, when_iso, status, hospital, created_at) VALUES (?, ?, ?, 'confirmed', ?, ?)",
    )
    .run(patientId, reason, whenISO, hospital ?? null, whenISO);
  return Number(info.lastInsertRowid);
}

// ---- seed family history ----
interface SeedFinding {
  name: string;
  value: string;
  ref: string;
  status: string;
}

// A full analysis attached to each member's MOST RECENT seeded report, so the
// Plan tab and the medicines/scheme cards are populated on first load (without
// it, getLatestAnalysis returns null and Plan shows the empty state).
const SEED_ANALYSIS: Record<string, ReportAnalysis> = {
  rakesh: {
    reportType: "Glycemic + Lipid Panel",
    summary:
      "Your blood sugar and cholesterol are drifting into the at-risk range — but small, consistent changes now can keep you out of the diabetes zone.",
    healthScore: 42,
    triage: {
      level: "soon",
      message: "Book a review with your physician in the next 1–2 weeks to discuss your rising HbA1c and lipids.",
    },
    findings: [
      { name: "HbA1c (Glycated Hb)", value: "6.4 %", referenceRange: "4.0 – 5.6", status: "high", explanation: "Your 3-month average blood sugar is in the pre-diabetes range, close to the 6.5% diabetes threshold." },
      { name: "Fasting Blood Glucose", value: "132 mg/dL", referenceRange: "70 – 100", status: "high", explanation: "Morning sugar is above normal, consistent with insulin resistance." },
      { name: "LDL Cholesterol", value: "152 mg/dL", referenceRange: "< 100", status: "high", explanation: "‘Bad’ cholesterol is high, which adds to heart risk alongside high sugar." },
      { name: "Triglycerides", value: "210 mg/dL", referenceRange: "< 150", status: "high", explanation: "Blood fats are elevated, often linked to refined carbs and sugar." },
      { name: "Serum Potassium", value: "5.6 mmol/L", referenceRange: "3.5 – 5.1", status: "high", explanation: "Potassium is slightly high — worth rechecking, especially if you take BP medication." },
    ],
    alerts: [
      { severity: "warning", title: "Pre-diabetes trending toward diabetes", detail: "HbA1c has risen steadily over two years and is projected to cross 6.5% by mid-2026." },
      { severity: "warning", title: "Combined sugar + lipid risk", detail: "High LDL and triglycerides together with high sugar raise cardiovascular risk; diet changes help both." },
    ],
    dataQualityFlags: [],
    lifestylePlan: {
      diet: [
        "Swap white rice for millets (bajra, ragi) or brown rice at least once a day.",
        "Replace fried snacks with roasted chana, sprouts, or a handful of nuts.",
        "Add dal and a green sabzi to every meal; cut sugary chai to once a day.",
        "Avoid sweets, soft drinks and packaged juices — they spike sugar and triglycerides.",
        "Use mustard or rice-bran oil and keep total oil under ~3 tsp/day.",
      ],
      activity: [
        "30-min brisk walk after dinner, daily — the single best step for blood sugar.",
        "Surya Namaskar — 10 rounds, 4×/week to improve insulin sensitivity.",
        "Light resistance work (squats, wall push-ups), 2×/week.",
        "Stand and stretch for 3 minutes every hour if you sit for long periods.",
      ],
    },
    medicineGuidance: [
      { topic: "Metformin (generic)", suggestion: "The generic costs ₹30–60/month vs ₹150+ for some brands — same molecule. Ask your doctor before any change." },
      { topic: "Statin for high LDL", suggestion: "If your doctor starts a statin, generic atorvastatin is ₹40–80/month. Informational only — not a prescription." },
    ],
    schemeEligibility: {
      likely: true,
      scheme: "Ayushman Bharat (PM-JAY)",
      note: "Chronic diabetes/cardiac care may be covered if your household is eligible — worth checking your ABHA-linked status.",
    },
    questionsForDoctor: [
      "Should I start medication now, or try 3 months of lifestyle change first?",
      "Why is my potassium high — could it be my BP medicine, and should it be rechecked?",
      "What HbA1c target should I aim for at my next test?",
    ],
    followUp: { recommended: true, urgency: "within 2 weeks", reason: "Review rising HbA1c, high LDL/triglycerides and borderline-high potassium." },
  },
  sunita: {
    reportType: "CBC + Thyroid + Vitamin Panel",
    summary:
      "Great progress — your hemoglobin, thyroid and vitamin D have all improved over the past two years and are now in the healthy range.",
    healthScore: 80,
    triage: { level: "routine", message: "Keep up your current routine and recheck at your next routine visit." },
    findings: [
      { name: "Hemoglobin", value: "12.3 g/dL", referenceRange: "12.0 – 15.5", status: "normal", explanation: "Your anemia has resolved — hemoglobin is back in the healthy range." },
      { name: "TSH", value: "3.1 mIU/L", referenceRange: "0.4 – 4.0", status: "normal", explanation: "Thyroid function has normalized from earlier high values." },
      { name: "Vitamin D", value: "36 ng/mL", referenceRange: "30 – 100", status: "normal", explanation: "Vitamin D is now sufficient after being deficient." },
    ],
    alerts: [
      { severity: "info", title: "Sustained improvement", detail: "All three markers have trended into the normal range — continue your iron-rich diet and sunlight exposure." },
    ],
    dataQualityFlags: [],
    lifestylePlan: {
      diet: [
        "Keep iron up with palak, methi, beetroot, jaggery and dates.",
        "Pair iron foods with lemon or amla (vitamin C) to absorb more iron.",
        "Continue vitamin-D foods: fortified milk, eggs, mushrooms.",
        "A glass of milk or bowl of curd daily supports calcium alongside vitamin D.",
      ],
      activity: [
        "20–30 min walk in morning sunlight, daily — helps vitamin D naturally.",
        "Yoga or stretching, 3×/week for general well-being.",
      ],
    },
    medicineGuidance: [
      { topic: "Iron / Vitamin D supplements", suggestion: "If continued, generic ferrous + cholecalciferol are very low cost. Confirm dose with your doctor." },
    ],
    schemeEligibility: { likely: false, scheme: "", note: "" },
    questionsForDoctor: [
      "Can I now reduce or stop my iron / vitamin D supplements?",
      "How often should I recheck my thyroid going forward?",
    ],
    followUp: { recommended: false, urgency: "routine", reason: "Markers improved into the healthy range; routine follow-up is sufficient." },
  },
  mohan: {
    reportType: "Renal + BP Panel",
    summary:
      "Your kidney function and blood pressure need attention — creatinine is rising and eGFR is falling, which calls for a check-up soon.",
    healthScore: 44,
    triage: { level: "soon", message: "See your physician within 1–2 weeks to review kidney function and blood pressure control." },
    findings: [
      { name: "Serum Creatinine", value: "1.7 mg/dL", referenceRange: "0.7 – 1.3", status: "high", explanation: "Creatinine is above normal, suggesting reduced kidney filtration." },
      { name: "eGFR", value: "50 mL/min", referenceRange: "> 90", status: "low", explanation: "Estimated filtration rate is reduced — early-stage kidney impairment." },
      { name: "Systolic BP", value: "155 mmHg", referenceRange: "< 130", status: "high", explanation: "Blood pressure is high, which can further strain the kidneys." },
      { name: "Fasting Blood Glucose", value: "124 mg/dL", referenceRange: "70 – 100", status: "high", explanation: "Sugar is mildly high and can also affect the kidneys over time." },
    ],
    alerts: [
      { severity: "warning", title: "Declining kidney function", detail: "Creatinine up and eGFR down over recent reports — important to control BP and review medications." },
      { severity: "warning", title: "Blood pressure not at target", detail: "Systolic BP is consistently above 130; better control protects the kidneys." },
    ],
    dataQualityFlags: [],
    lifestylePlan: {
      diet: [
        "Reduce salt: avoid pickles, papad, namkeen and packaged foods to protect kidneys and BP.",
        "Limit very high-potassium foods (coconut water, banana) until potassium is reviewed.",
        "Choose moderate protein from dal and curd; avoid excess red meat.",
        "Stay hydrated with plain water unless your doctor has advised a fluid limit.",
      ],
      activity: [
        "Gentle 20–30 min walk daily, as tolerated.",
        "Pranayama / slow breathing, 10 min/day, to help manage blood pressure.",
      ],
    },
    medicineGuidance: [
      { topic: "BP medication adherence", suggestion: "Taking BP medicine at the same time daily protects the kidneys. Generic options are low cost — review with your doctor." },
    ],
    schemeEligibility: {
      likely: true,
      scheme: "Ayushman Bharat (PM-JAY)",
      note: "Kidney and hypertension care may be covered for eligible households — check your ABHA-linked status.",
    },
    questionsForDoctor: [
      "Is my kidney decline fast enough to need a nephrologist?",
      "Are any of my current medicines hard on the kidneys?",
      "What home blood-pressure number should I aim for?",
    ],
    followUp: { recommended: true, urgency: "within 2 weeks", reason: "Review rising creatinine, falling eGFR and high blood pressure." },
  },
};

// Hindi overrides for the patient-facing fields shown on Today + Plan.
// Merged over the English base when language === "hi". Test/medicine names and
// numbers stay in English (Latin), matching how patients read their reports.
const SEED_HI: Record<string, Partial<ReportAnalysis>> = {
  rakesh: {
    summary:
      "आपका ब्लड शुगर और कोलेस्ट्रॉल जोखिम वाली सीमा की ओर बढ़ रहे हैं — लेकिन अभी छोटे, नियमित बदलाव आपको डायबिटीज़ से दूर रख सकते हैं।",
    triage: { level: "soon", message: "अगले 1–2 हफ़्तों में अपने डॉक्टर से मिलें और बढ़ते HbA1c व लिपिड पर चर्चा करें।" },
    lifestylePlan: {
      diet: [
        "दिन में कम से कम एक बार सफ़ेद चावल की जगह बाजरा/रागी या ब्राउन राइस लें।",
        "तले हुए स्नैक्स की जगह भुना चना, स्प्राउट्स या मुट्ठीभर मेवे लें।",
        "हर भोजन में दाल और हरी सब्ज़ी शामिल करें; मीठी चाय दिन में एक बार ही।",
        "मिठाई, कोल्ड ड्रिंक और पैकेज्ड जूस से बचें — ये शुगर और ट्राइग्लिसराइड्स बढ़ाते हैं।",
        "सरसों या राइस-ब्रान तेल इस्तेमाल करें और कुल तेल ~3 चम्मच/दिन तक रखें।",
      ],
      activity: [
        "रात के खाने के बाद रोज़ 30 मिनट तेज़ चलें — ब्लड शुगर के लिए सबसे असरदार।",
        "सूर्य नमस्कार — 10 चक्र, हफ़्ते में 4 बार, इंसुलिन संवेदनशीलता सुधारने हेतु।",
        "हल्की कसरत (स्क्वैट्स, वॉल पुश-अप्स) हफ़्ते में 2 बार।",
        "लंबे समय तक बैठते हैं तो हर घंटे 3 मिनट खड़े होकर स्ट्रेच करें।",
      ],
    },
    medicineGuidance: [
      { topic: "Metformin (जेनेरिक)", suggestion: "जेनेरिक ₹30–60/महीना बनाम कुछ ब्रांड ₹150+ — वही दवा। बदलाव से पहले डॉक्टर से पूछें।" },
      { topic: "उच्च LDL के लिए स्टैटिन", suggestion: "यदि डॉक्टर स्टैटिन शुरू करें तो जेनेरिक एटोरवास्टेटिन ₹40–80/महीना। केवल जानकारी — प्रिस्क्रिप्शन नहीं।" },
    ],
    schemeEligibility: {
      likely: true,
      scheme: "आयुष्मान भारत (PM-JAY)",
      note: "यदि आपका परिवार पात्र है तो डायबिटीज़/हृदय की दीर्घकालिक देखभाल कवर हो सकती है — अपनी ABHA-लिंक्ड स्थिति जाँचें।",
    },
  },
  sunita: {
    summary:
      "बढ़िया प्रगति — पिछले दो वर्षों में आपका हीमोग्लोबिन, थायरॉइड और विटामिन D सभी सुधरे हैं और अब स्वस्थ सीमा में हैं।",
    triage: { level: "routine", message: "अपनी मौजूदा दिनचर्या जारी रखें और अगली नियमित जाँच पर दोबारा टेस्ट कराएँ।" },
    lifestylePlan: {
      diet: [
        "पालक, मेथी, चुकंदर, गुड़ और खजूर से आयरन बनाए रखें।",
        "आयरन वाले भोजन के साथ नींबू/आँवला (विटामिन C) लें ताकि आयरन अधिक सोखा जाए।",
        "विटामिन-D वाले भोजन जारी रखें: फोर्टिफ़ाइड दूध, अंडे, मशरूम।",
        "रोज़ एक गिलास दूध या कटोरी दही विटामिन D के साथ कैल्शियम देता है।",
      ],
      activity: [
        "सुबह की धूप में रोज़ 20–30 मिनट टहलें — विटामिन D स्वाभाविक रूप से बढ़ता है।",
        "हफ़्ते में 3 बार योग या स्ट्रेचिंग।",
      ],
    },
    medicineGuidance: [
      { topic: "आयरन / विटामिन D सप्लीमेंट", suggestion: "यदि जारी रखें तो जेनेरिक फ़ेरस + कोलेकैल्सीफ़ेरॉल बहुत सस्ते हैं। खुराक डॉक्टर से पुष्टि करें।" },
    ],
    schemeEligibility: { likely: false, scheme: "", note: "" },
  },
  mohan: {
    summary:
      "आपके गुर्दे का कार्य और रक्तचाप ध्यान माँगते हैं — क्रिएटिनिन बढ़ रहा है और eGFR घट रहा है, इसलिए जल्द जाँच ज़रूरी है।",
    triage: { level: "soon", message: "गुर्दे के कार्य और रक्तचाप नियंत्रण की समीक्षा हेतु 1–2 हफ़्तों में डॉक्टर से मिलें।" },
    lifestylePlan: {
      diet: [
        "नमक कम करें: अचार, पापड़, नमकीन और पैकेज्ड भोजन से बचें — गुर्दे और BP की रक्षा हेतु।",
        "पोटैशियम की जाँच होने तक बहुत अधिक पोटैशियम वाले भोजन (नारियल पानी, केला) सीमित करें।",
        "दाल और दही से मध्यम मात्रा में प्रोटीन लें; अधिक लाल मांस से बचें।",
        "जब तक डॉक्टर ने पानी सीमित न किया हो, सादा पानी पीते रहें।",
      ],
      activity: [
        "क्षमता अनुसार रोज़ हल्का 20–30 मिनट टहलें।",
        "प्राणायाम / धीमी साँस, रोज़ 10 मिनट, रक्तचाप नियंत्रण में मदद हेतु।",
      ],
    },
    medicineGuidance: [
      { topic: "BP दवा की नियमितता", suggestion: "BP की दवा रोज़ एक ही समय लेना गुर्दों की रक्षा करता है। जेनेरिक विकल्प सस्ते हैं — डॉक्टर से समीक्षा करें।" },
    ],
    schemeEligibility: {
      likely: true,
      scheme: "आयुष्मान भारत (PM-JAY)",
      note: "पात्र परिवारों के लिए गुर्दा और उच्च रक्तचाप की देखभाल कवर हो सकती है — अपनी ABHA-लिंक्ड स्थिति जाँचें।",
    },
  },
};

function seedIfEmpty(db: Database.Database) {
  const count = (
    db.prepare("SELECT COUNT(*) as c FROM reports").get() as { c: number }
  ).c;
  if (count > 0) return;

  const seed = (
    patientId: string,
    dateISO: string,
    healthScore: number,
    type: string,
    findings: SeedFinding[],
    seedKey?: string,
  ) => {
    const info = db
      .prepare(
        `INSERT INTO reports (patient_id, report_date, report_type, health_score, summary, analysis_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        patientId,
        dateISO,
        type,
        healthScore,
        seedKey ? SEED_ANALYSIS[seedKey].summary : "Past report (seeded history).",
        seedKey ? JSON.stringify({ __seed: seedKey }) : "{}",
        dateISO,
      );
    const rid = Number(info.lastInsertRowid);
    const ins = db.prepare(
      `INSERT INTO metrics (report_id, patient_id, report_date, name, norm_key, value_num, status, reference_range)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const f of findings) {
      ins.run(rid, patientId, dateISO, f.name, normKey(f.name), parseNum(f.value), f.status, f.ref);
    }
  };

  // Derive status from the value vs. its reference range.
  const statusFor = (v: number, ref: string): string => {
    let m = ref.match(/^([\d.]+)\s*[–-]\s*([\d.]+)$/);
    if (m) {
      const lo = +m[1];
      const hi = +m[2];
      if (v < lo) return "low";
      if (v > hi) return "high";
      if (v >= hi - (hi - lo) * 0.08) return "borderline";
      return "normal";
    }
    m = ref.match(/^<\s*([\d.]+)$/);
    if (m) return v >= +m[1] ? "high" : v >= +m[1] * 0.95 ? "borderline" : "normal";
    m = ref.match(/^>\s*([\d.]+)$/);
    if (m) return v < +m[1] ? "low" : "normal";
    return "normal";
  };

  // 7 visits spanning ~2 years → rich, dated time series for the demo.
  const DATES = [
    "2024-06-12", "2024-10-08", "2025-02-14", "2025-06-20",
    "2025-10-15", "2026-02-18", "2026-06-05",
  ];

  const member = (
    patientId: string,
    type: string,
    scores: number[],
    metrics: { name: string; ref: string; values: number[] }[],
  ) => {
    DATES.forEach((d, i) => {
      const findings: SeedFinding[] = metrics.map((mt) => ({
        name: mt.name,
        value: String(mt.values[i]),
        ref: mt.ref,
        status: statusFor(mt.values[i], mt.ref),
      }));
      // Mark the latest report as seeded so getLatestAnalysis resolves it
      // (in the viewing language) and the Plan tab is populated.
      const seedKey = i === DATES.length - 1 ? patientId : undefined;
      seed(patientId, `${d}T09:00:00.000Z`, scores[i], type, findings, seedKey);
    });
  };

  // Rakesh (you, 54): diabetes + lipids worsening — the hero story.
  member("rakesh", "Glycemic + Lipid Panel", [72, 68, 64, 60, 55, 48, 42], [
    { name: "HbA1c (Glycated Hb)", ref: "4.0 – 5.6", values: [5.4, 5.6, 5.8, 5.9, 6.0, 6.2, 6.4] },
    { name: "Fasting Blood Glucose", ref: "70 – 100", values: [96, 102, 108, 112, 118, 124, 132] },
    { name: "LDL Cholesterol", ref: "< 100", values: [120, 128, 135, 140, 146, 150, 152] },
    { name: "Triglycerides", ref: "< 150", values: [150, 165, 178, 185, 195, 205, 210] },
    { name: "Serum Potassium", ref: "3.5 – 5.1", values: [4.4, 4.6, 4.8, 4.9, 5.1, 5.3, 5.6] },
  ]);

  // Sunita (wife, 49): anemia + thyroid + vitamin D, IMPROVING — a hopeful story.
  member("sunita", "CBC + Thyroid + Vitamin", [56, 60, 64, 68, 72, 76, 80], [
    { name: "Hemoglobin", ref: "12.0 – 15.5", values: [9.8, 10.2, 10.6, 11.0, 11.4, 11.8, 12.3] },
    { name: "TSH", ref: "0.4 – 4.0", values: [6.2, 5.8, 5.0, 4.4, 3.8, 3.4, 3.1] },
    { name: "Vitamin D", ref: "30 – 100", values: [14, 16, 19, 23, 27, 31, 36] },
  ]);

  // Mohan (father, 78): hypertension + kidney DECLINING — the caregiver alert.
  member("mohan", "Renal + BP Panel", [62, 58, 55, 52, 49, 47, 44], [
    { name: "Serum Creatinine", ref: "0.7 – 1.3", values: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7] },
    { name: "Systolic BP", ref: "< 130", values: [134, 138, 142, 146, 150, 152, 155] },
    { name: "eGFR", ref: "> 90", values: [72, 68, 64, 60, 56, 54, 50] },
    { name: "Fasting Blood Glucose", ref: "70 – 100", values: [98, 104, 110, 112, 116, 120, 124] },
  ]);
}

// Wipe all data and re-seed the pristine demo family (for presenter reset).
export function resetDemo(): void {
  const db = getDb();
  db.exec("DELETE FROM metrics; DELETE FROM reports; DELETE FROM appointments; DELETE FROM patients;");
  seedPatientsIfEmpty(db);
  seedIfEmpty(db);
}

export { getDb };
