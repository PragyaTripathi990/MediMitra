import { buildHealthContext } from "@/lib/health-context";
import { generateText, getProvider } from "@/lib/analyze";
import { parseLang, writeIn } from "@/lib/lang";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  if (!getProvider()) {
    return Response.json({ error: "No AI key configured." }, { status: 500 });
  }
  let body: { patient?: string; language?: string; messages?: ChatMsg[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const patient = body.patient || "rakesh";
  const language = parseLang(body.language);
  const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
  if (!messages.some((m) => m.role === "user")) {
    return Response.json({ error: "Ask something." }, { status: 400 });
  }

  const ctx = buildHealthContext(patient);
  const convo = messages
    .map((m) => `${m.role === "user" ? "Patient" : "MediMitra"}: ${m.content}`)
    .join("\n");

  const system = `You are MediMitra, a warm, concise AI health assistant chatting with a patient inside their app. Answer ONLY from the health record below; cite dates/values when relevant. Keep replies short and conversational (1–3 sentences). If the record doesn't have the answer, say so. You are not a doctor — for medical decisions, gently suggest seeing a clinician. ${writeIn(language)}`;
  const user = `${ctx}\n\nConversation so far:\n${convo}\n\nWrite MediMitra's next reply to the patient's most recent message.`;

  try {
    const reply = await generateText(system, user);
    return Response.json({ reply: reply.trim() });
  } catch (err) {
    console.error("chat failed:", err);
    return Response.json({ error: "Could not reply right now." }, { status: 500 });
  }
}
