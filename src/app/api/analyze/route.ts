import { analyzeReport, getProvider } from "@/lib/analyze";
import { insertReport } from "@/lib/db";
import { parseLang } from "@/lib/lang";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED_MEDIA = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

type Media = (typeof SUPPORTED_MEDIA)[number];

export async function POST(request: Request) {
  if (!getProvider()) {
    return Response.json(
      {
        error:
          "No AI key configured. Add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to .env.local and restart.",
      },
      { status: 500 },
    );
  }

  let body: {
    image?: string;
    language?: string;
    patientContext?: string;
    patient?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { image, language, patientContext } = body;
  const patient = body.patient || "rakesh";
  if (!image || typeof image !== "string") {
    return Response.json(
      { error: "Missing 'image' (data URL)." },
      { status: 400 },
    );
  }

  // Parse a data URL: data:image/png;base64,<...>
  const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    return Response.json(
      { error: "Image must be a base64 data URL." },
      { status: 400 },
    );
  }
  const mediaType = match[1] as Media;
  const imageBase64 = match[2];

  if (!SUPPORTED_MEDIA.includes(mediaType)) {
    return Response.json(
      { error: `Unsupported image type: ${mediaType}. Use PNG, JPEG, or WebP.` },
      { status: 400 },
    );
  }

  const lang = parseLang(language);

  try {
    const analysis = await analyzeReport({
      imageBase64,
      mediaType,
      language: lang,
      patientContext,
    });

    // Persist to the patient's longitudinal history (best-effort).
    try {
      insertReport(patient, new Date().toISOString(), analysis);
    } catch (dbErr) {
      console.error("Failed to save report history:", dbErr);
    }

    return Response.json({ analysis });
  } catch (err) {
    console.error("analyzeReport failed:", err);
    const message =
      err instanceof Error ? err.message : "Analysis failed unexpectedly.";
    return Response.json({ error: message }, { status: 500 });
  }
}
