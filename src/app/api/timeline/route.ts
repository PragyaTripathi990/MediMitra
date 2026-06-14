import { getTimeline } from "@/lib/db";
import { parseLang } from "@/lib/lang";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const patient = url.searchParams.get("patient") || "rakesh";
  const language = parseLang(url.searchParams.get("lang"));
  try {
    const timeline = getTimeline(patient, language);
    return Response.json(timeline);
  } catch (err) {
    console.error("timeline failed:", err);
    return Response.json(
      { reports: [], metrics: [], error: "timeline unavailable" },
      { status: 500 },
    );
  }
}
