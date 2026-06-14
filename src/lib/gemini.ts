import { GoogleGenAI } from "@google/genai";
import type { AnalyzeArgs, ReportAnalysis } from "./types";
import { SYSTEM_PROMPT, buildUserInstruction, JSON_SHAPE_HINT } from "./prompt";

const PRIMARY = "gemini-2.5-flash";
const FALLBACK = "gemini-2.0-flash"; // used if the primary is overloaded (503)

type GenParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isTransient(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)) || "";
  const status = Number((e as { status?: number })?.status);
  return (
    [429, 500, 502, 503, 504, 529].includes(status) ||
    /\b(429|50\d|529)\b|UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED|INTERNAL/i.test(
      msg,
    )
  );
}

// Generate with exponential backoff; escalate to the fallback model on later
// attempts so a transient 503/overload on the primary model self-heals.
async function generate(contents: unknown, config: unknown) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const model = attempt < 2 ? PRIMARY : FALLBACK;
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config,
      } as GenParams);
    } catch (e) {
      lastErr = e;
      if (!isTransient(e) || attempt === 3) throw e;
      await sleep(600 * 2 ** attempt + Math.floor(Math.random() * 300));
    }
  }
  throw lastErr;
}

function parseAnalysis(text: string): ReportAnalysis {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  }
  return JSON.parse(t) as ReportAnalysis;
}

export async function analyzeReportGemini(
  args: AnalyzeArgs,
): Promise<ReportAnalysis> {
  const response = await generate(
    [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: args.mediaType, data: args.imageBase64 } },
          {
            text:
              buildUserInstruction(args.patientContext, args.language) +
              "\n\n" +
              JSON_SHAPE_HINT,
          },
        ],
      },
    ],
    { systemInstruction: SYSTEM_PROMPT, responseMimeType: "application/json" },
  );

  const text = response.text ?? "";
  if (!text.trim()) throw new Error("Gemini returned no content.");
  return parseAnalysis(text);
}

// Generic vision → JSON (used for prescriptions and other documents).
export async function geminiVisionJson(
  system: string,
  instruction: string,
  mediaType: string,
  base64: string,
): Promise<unknown> {
  const response = await generate(
    [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mediaType, data: base64 } },
          { text: instruction },
        ],
      },
    ],
    { systemInstruction: system, responseMimeType: "application/json" },
  );
  const text = response.text ?? "";
  if (!text.trim()) throw new Error("Gemini returned no content.");
  return parseAnalysis(text) as unknown;
}

export async function geminiText(
  system: string,
  userText: string,
): Promise<string> {
  const response = await generate([{ role: "user", parts: [{ text: userText }] }], {
    systemInstruction: system,
  });
  return response.text ?? "";
}
