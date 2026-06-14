import { getProvider, visionJson } from "@/lib/analyze";
import { PRESCRIPTION_SYSTEM, buildPrescriptionInstruction } from "@/lib/prompt";
import { quoteFor } from "@/lib/pharmacy";
import { parseLang } from "@/lib/lang";
import type { MediaType, PrescribedMed, PrescriptionResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED: MediaType[] = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(request: Request) {
  if (!getProvider()) {
    return Response.json(
      { error: "No AI key configured. Add GEMINI_API_KEY to .env.local." },
      { status: 500 },
    );
  }

  let body: { image?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const match =
    typeof body.image === "string" &&
    body.image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    return Response.json({ error: "Image must be a base64 data URL." }, { status: 400 });
  }
  const mediaType = match[1] as MediaType;
  const base64 = match[2];
  if (!SUPPORTED.includes(mediaType)) {
    return Response.json({ error: `Unsupported image type: ${mediaType}` }, { status: 400 });
  }
  const language = parseLang(body.language);

  try {
    const parsed = (await visionJson(
      PRESCRIPTION_SYSTEM,
      buildPrescriptionInstruction(language),
      mediaType,
      base64,
    )) as { doctorNote?: string; medicines?: PrescribedMed[] };

    const meds = Array.isArray(parsed.medicines) ? parsed.medicines : [];
    const result: PrescriptionResult = {
      doctorNote: parsed.doctorNote || "",
      medicines: meds.map(quoteFor),
    };
    return Response.json(result);
  } catch (err) {
    console.error("prescription parse failed:", err);
    const message = err instanceof Error ? err.message : "Failed to read prescription.";
    return Response.json({ error: message }, { status: 500 });
  }
}
