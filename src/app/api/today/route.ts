import { buildTodayPayload } from "@/lib/today";
import { parseLang } from "@/lib/lang";
import type { TodayPayload } from "@/lib/types";

export const runtime = "nodejs";

const EMPTY: TodayPayload = {
  hasAnalysis: false,
  healthScore: null,
  scoreDelta: null,
  verdictLine: "",
  projection: null,
  projectedSparkline: null,
  actions: [],
  vitals: [],
  nextAppointment: null,
  reportCount: 0,
  plan: null,
  medicines: [],
  scheme: null,
  screenings: [],
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const language = parseLang(url.searchParams.get("lang"));
  const patient = url.searchParams.get("patient") || "rakesh";
  try {
    return Response.json(buildTodayPayload(patient, language));
  } catch (err) {
    console.error("today payload failed:", err);
    return Response.json(EMPTY, { status: 500 });
  }
}
