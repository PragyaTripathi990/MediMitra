import type { AnalyzeArgs, MediaType, ReportAnalysis } from "./types";
import { analyzeReportAnthropic, claudeText, claudeVisionJson } from "./anthropic";
import { analyzeReportGemini, geminiText, geminiVisionJson } from "./gemini";

export type Provider = "gemini" | "anthropic";

// Gemini is checked first (free tier); Anthropic if its key is set instead.
export function getProvider(): Provider | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export async function analyzeReport(
  args: AnalyzeArgs,
): Promise<ReportAnalysis> {
  const provider = getProvider();
  if (provider === "gemini") return analyzeReportGemini(args);
  if (provider === "anthropic") return analyzeReportAnthropic(args);
  throw new Error("No LLM provider configured.");
}

export async function generateText(
  system: string,
  userText: string,
): Promise<string> {
  const provider = getProvider();
  if (provider === "gemini") return geminiText(system, userText);
  if (provider === "anthropic") return claudeText(system, userText);
  throw new Error("No LLM provider configured.");
}

export async function visionJson(
  system: string,
  instruction: string,
  mediaType: MediaType,
  base64: string,
): Promise<unknown> {
  const provider = getProvider();
  if (provider === "gemini")
    return geminiVisionJson(system, instruction, mediaType, base64);
  if (provider === "anthropic")
    return claudeVisionJson(system, instruction, mediaType, base64);
  throw new Error("No LLM provider configured.");
}
