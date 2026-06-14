// Shared types for MediMitra report analysis.

export type FindingStatus =
  | "normal"
  | "borderline"
  | "low"
  | "high"
  | "critical";

export type AlertSeverity = "info" | "warning" | "critical";

// Triage urgency derived from the most serious finding.
export type TriageLevel = "routine" | "soon" | "urgent" | "emergency";

export interface Finding {
  name: string;
  value: string;
  referenceRange: string;
  status: FindingStatus;
  explanation: string;
}

export interface Alert {
  severity: AlertSeverity;
  title: string;
  detail: string;
}

export interface Triage {
  level: TriageLevel;
  message: string; // what to do, in the chosen language
}

export interface LifestylePlan {
  diet: string[]; // India-localized food swaps
  activity: string[];
}

export interface MedicineGuidance {
  topic: string; // e.g. "Generic alternative for Telma 40"
  suggestion: string; // savings / advice (never a prescription)
}

export interface SchemeEligibility {
  likely: boolean;
  scheme: string; // e.g. "Ayushman Bharat (PM-JAY)"
  note: string;
}

export interface FollowUp {
  recommended: boolean;
  urgency: string; // e.g. "within 2 weeks", "routine", "urgent"
  reason: string;
}

export interface ReportAnalysis {
  reportType: string;
  summary: string;
  healthScore: number; // 0-100, higher is better
  triage: Triage;
  findings: Finding[];
  alerts: Alert[];
  dataQualityFlags: string[]; // implausible values / likely typos in the report
  lifestylePlan: LifestylePlan;
  medicineGuidance: MedicineGuidance[];
  schemeEligibility: SchemeEligibility;
  questionsForDoctor: string[];
  followUp: FollowUp;
}

// ---- longitudinal timeline ----
export interface TrendPoint {
  date: string;
  value: number;
  status: string;
}

export interface MetricTrend {
  key: string;
  name: string;
  points: TrendPoint[];
  direction: "rising" | "falling" | "stable";
  latestStatus: string;
  projection?: string;
}

export interface ReportSummaryRow {
  date: string;
  reportType: string;
  healthScore: number;
}

export interface Timeline {
  reports: ReportSummaryRow[];
  metrics: MetricTrend[];
}

// ---- Today dashboard ----
export type ActionSeverity = "critical" | "warning" | "info";

export interface ActionCta {
  label: string;
  urgency: TriageLevel;
  reason: string;
}

export interface TodayAction {
  id: string;
  kind: string;
  severity: ActionSeverity;
  icon: string;
  title: string;
  detail: string;
  cta: ActionCta | null;
}

export interface VitalGlance {
  name: string;
  value: number;
  status: string;
  direction: "rising" | "falling" | "stable";
  points: TrendPoint[];
}

export interface ProjectedSparklineData {
  points: TrendPoint[];
  threshold: number;
}

export interface AppointmentRow {
  reason: string;
  whenISO: string;
  status: string;
  hospital?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string; // "You", "Wife", "Father"…
  age: number;
}

// ---- checkup reminders / screenings ----
export interface Screening {
  name: string;
  everyDays: number;
  lastISO: string;
  nextDueISO: string;
  overdue: boolean;
}

// ---- prescription → pharmacy ordering ----
export interface PrescribedMed {
  name: string;
  dosage: string; // e.g. "500 mg"
  frequency: string; // e.g. "twice daily after meals"
  durationDays: number;
  purpose: string; // plain-language what it's for
}

export interface PharmacyQuote {
  pharmacy: string;
  price: number; // INR for the course
}

export interface MedOrderItem extends PrescribedMed {
  brandQuotes: PharmacyQuote[];
  cheapestBrand: PharmacyQuote;
  generic: { name: string; price: number };
  savings: number; // cheapest brand - generic
}

export interface PrescriptionResult {
  doctorNote: string;
  medicines: MedOrderItem[];
}

export interface TodayPayload {
  hasAnalysis: boolean;
  healthScore: number | null;
  scoreDelta: number | null;
  verdictLine: string;
  projection: string | null;
  projectedSparkline: ProjectedSparklineData | null;
  actions: TodayAction[];
  vitals: VitalGlance[];
  nextAppointment: AppointmentRow | null;
  reportCount: number;
  plan: { diet: string[]; activity: string[] } | null;
  medicines: MedicineGuidance[];
  scheme: SchemeEligibility | null;
  screenings: Screening[];
}

export interface FamilySummary {
  id: string;
  name: string;
  relation: string;
  age: number;
  score: number | null;
  delta: number | null;
  topAlert: string | null;
  severity: ActionSeverity;
  hasUpcoming: boolean;
  lastVisitISO: string | null;
  lastReportType: string | null;
  reportCount: number;
}

export type Language = "en" | "hi" | "ta" | "te" | "bn";

export type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif";

export interface AnalyzeArgs {
  imageBase64: string; // raw base64, no data: prefix
  mediaType: MediaType;
  language: Language;
  patientContext?: string;
}
