import { getTimeline, getLatestAnalysis, getAppointments } from "@/lib/db";
import { generateText, getProvider } from "@/lib/analyze";
import { parseLang, writeIn } from "@/lib/lang";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!getProvider()) {
    return Response.json({ error: "No AI key configured." }, { status: 500 });
  }
  let body: { patient?: string; question?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const patient = body.patient || "rakesh";
  const question = (body.question || "").trim();
  const language = parseLang(body.language);
  if (!question) {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  // Assemble the patient's full health memory as grounding context.
  const timeline = getTimeline(patient);
  const latest = getLatestAnalysis(patient);
  const appts = getAppointments(patient);

  const reports = timeline.reports
    .map((r) => `${r.date.slice(0, 10)}: ${r.reportType} (health score ${r.healthScore})`)
    .join("\n");

  const metrics = timeline.metrics
    .map(
      (m) =>
        `${m.name}: ${m.points
          .map((p) => `${p.date.slice(0, 10)}=${p.value} (${p.status})`)
          .join(", ")}${m.projection ? ` — ${m.projection}` : ""}`,
    )
    .join("\n");

  const meds = latest?.medicineGuidance?.length
    ? latest.medicineGuidance.map((g) => `${g.topic}: ${g.suggestion}`).join("\n")
    : "none on record";

  const alerts = latest?.alerts?.length
    ? latest.alerts.map((a) => `${a.title}: ${a.detail}`).join("\n")
    : "none";

  const appointments = appts.length
    ? appts.map((a) => `${a.whenISO.slice(0, 10)} — ${a.reason} (${a.status})`).join("\n")
    : "none booked";

  const context = `PATIENT HEALTH RECORD
=== Reports over time ===
${reports || "none"}

=== Test values over time (date = value (status)) ===
${metrics || "none"}

=== Latest summary ===
${latest?.summary ?? "no analysed report yet"}

=== Medications & guidance ===
${meds}

=== Alerts ===
${alerts}

=== Appointments ===
${appointments}`;

  const system = `You are MediMitra's "Health Memory" — the patient's personal health brain. Answer the user's question using ONLY the health record provided. Always cite the relevant date(s) and report(s). If the record doesn't contain the answer, say so plainly — never invent values. Be concise and warm: 2–4 sentences. You are not a doctor; for decisions, point to a clinician. ${writeIn(language)}`;

  try {
    const answer = await generateText(system, `${context}\n\nQUESTION: ${question}`);
    return Response.json({ answer: answer.trim() });
  } catch (err) {
    console.error("ask failed:", err);
    return Response.json({ error: "Could not answer right now." }, { status: 500 });
  }
}
