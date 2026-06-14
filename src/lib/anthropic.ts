import Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeArgs, ReportAnalysis } from "./types";
import { SYSTEM_PROMPT, buildUserInstruction } from "./prompt";

// JSON Schema for structured output. Structured outputs require
// additionalProperties:false on every object and every property listed in
// `required`. No string/number constraints are allowed.
const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reportType: { type: "string" },
    summary: { type: "string" },
    healthScore: { type: "integer" },
    triage: {
      type: "object",
      additionalProperties: false,
      properties: {
        level: {
          type: "string",
          enum: ["routine", "soon", "urgent", "emergency"],
        },
        message: { type: "string" },
      },
      required: ["level", "message"],
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          value: { type: "string" },
          referenceRange: { type: "string" },
          status: {
            type: "string",
            enum: ["normal", "borderline", "low", "high", "critical"],
          },
          explanation: { type: "string" },
        },
        required: ["name", "value", "referenceRange", "status", "explanation"],
      },
    },
    alerts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["info", "warning", "critical"] },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["severity", "title", "detail"],
      },
    },
    dataQualityFlags: { type: "array", items: { type: "string" } },
    lifestylePlan: {
      type: "object",
      additionalProperties: false,
      properties: {
        diet: { type: "array", items: { type: "string" } },
        activity: { type: "array", items: { type: "string" } },
      },
      required: ["diet", "activity"],
    },
    medicineGuidance: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          topic: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["topic", "suggestion"],
      },
    },
    schemeEligibility: {
      type: "object",
      additionalProperties: false,
      properties: {
        likely: { type: "boolean" },
        scheme: { type: "string" },
        note: { type: "string" },
      },
      required: ["likely", "scheme", "note"],
    },
    questionsForDoctor: { type: "array", items: { type: "string" } },
    followUp: {
      type: "object",
      additionalProperties: false,
      properties: {
        recommended: { type: "boolean" },
        urgency: { type: "string" },
        reason: { type: "string" },
      },
      required: ["recommended", "urgency", "reason"],
    },
  },
  required: [
    "reportType",
    "summary",
    "healthScore",
    "triage",
    "findings",
    "alerts",
    "dataQualityFlags",
    "lifestylePlan",
    "medicineGuidance",
    "schemeEligibility",
    "questionsForDoctor",
    "followUp",
  ],
} as const;

export async function analyzeReportAnthropic(
  args: AnalyzeArgs,
): Promise<ReportAnalysis> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: args.mediaType,
              data: args.imageBase64,
            },
          },
          {
            type: "text",
            text: buildUserInstruction(args.patientContext, args.language),
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text content.");
  }
  return JSON.parse(textBlock.text) as ReportAnalysis;
}

export async function claudeVisionJson(
  system: string,
  instruction: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif",
  base64: string,
): Promise<unknown> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    system,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: instruction },
        ],
      },
    ],
  });
  const tb = response.content.find((b) => b.type === "text");
  const text = tb && tb.type === "text" ? tb.text : "";
  let t = text.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(t) as unknown;
}

export async function claudeText(
  system: string,
  userText: string,
): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: userText }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
