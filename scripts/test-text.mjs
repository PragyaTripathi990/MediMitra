import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const key = fs
  .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .match(/^GEMINI_API_KEY=(.+)$/m)[1]
  .trim();

const ai = new GoogleGenAI({ apiKey: key });
const r = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
    { role: "user", parts: [{ text: "Write one friendly sentence." }] },
  ],
  config: { systemInstruction: "You are a helpful assistant." },
});
console.log("text:", JSON.stringify(r.text));
console.log("finishReason:", r.candidates?.[0]?.finishReason);
console.log("parts:", JSON.stringify(r.candidates?.[0]?.content?.parts));
