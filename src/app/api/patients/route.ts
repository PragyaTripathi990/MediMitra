import { getPatients } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ patients: getPatients() });
  } catch (err) {
    console.error("patients failed:", err);
    return Response.json({ patients: [] }, { status: 500 });
  }
}
