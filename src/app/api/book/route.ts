import { bookAppointment, getLatestAnalysis } from "@/lib/db";
import { generateText, getProvider } from "@/lib/analyze";
import { parseLang, LANG_NAME } from "@/lib/lang";

export const runtime = "nodejs";
export const maxDuration = 60;

// Pick a slot based on triage urgency (the "agent" reasoning about when to book).
function slotFor(urgency: string): string {
  const d = new Date();
  const addDays =
    urgency === "emergency"
      ? 1
      : urgency === "urgent"
        ? 3
        : urgency === "soon"
          ? 10
          : 21;
  d.setDate(d.getDate() + addDays);
  // Skip Sunday.
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(10, 30, 0, 0);
  return d.toISOString();
}

export async function POST(request: Request) {
  let body: {
    urgency?: string;
    reason?: string;
    language?: string;
    patient?: string;
    hospital?: string;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const urgency = body.urgency || "soon";
  const reason = body.reason || "Follow-up consultation";
  const language = parseLang(body.language);
  const patient = body.patient || "rakesh";
  const hospital = body.hospital;

  const whenISO = slotFor(urgency);

  // Generate a doctor-ready visit summary from the patient's latest analysis.
  let doctorSummary = "";
  try {
    if (getProvider()) {
      const a = getLatestAnalysis(patient);
      const sys = `You are MediMitra. Write a concise, doctor-ready visit summary the patient can hand to their physician. Use short labelled sections: "Chief concerns", "Key abnormal results" (with values), "Current medications & interaction notes", "Questions to address". Keep it under 180 words, factual, no fluff. Write in ${LANG_NAME[language]}.`;
      const user = a
        ? `Latest report analysis:\n${JSON.stringify({
            reportType: a.reportType,
            findings: a.findings,
            alerts: a.alerts,
            followUp: a.followUp,
          })}\n\nReason for visit: ${reason}`
        : `Reason for visit: ${reason}`;
      doctorSummary = await generateText(sys, user);
    }
  } catch (err) {
    console.error("doctor summary generation failed:", err);
  }

  try {
    bookAppointment(patient, reason, whenISO, hospital);
  } catch (err) {
    console.error("bookAppointment failed:", err);
  }

  return Response.json({
    appointment: { whenISO, reason, hospital: hospital ?? null },
    doctorSummary,
  });
}
