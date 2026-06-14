import { getTimeline, getLatestAnalysis, getAppointments } from "./db";

// Assemble a patient's full longitudinal record as grounding text for the LLM.
export function buildHealthContext(patient: string): string {
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

  return `PATIENT HEALTH RECORD
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
}
