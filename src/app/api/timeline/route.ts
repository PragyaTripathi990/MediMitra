import { getTimeline } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const patient = new URL(request.url).searchParams.get("patient") || "rakesh";
  try {
    const timeline = getTimeline(patient);
    return Response.json(timeline);
  } catch (err) {
    console.error("timeline failed:", err);
    return Response.json(
      { reports: [], metrics: [], error: "timeline unavailable" },
      { status: 500 },
    );
  }
}
