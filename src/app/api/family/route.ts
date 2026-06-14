import { getFamilySummaries } from "@/lib/today";
import { addPatient, removePatient, getPatients } from "@/lib/db";
import { parseLang } from "@/lib/lang";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const lang = parseLang(new URL(request.url).searchParams.get("lang"));
  try {
    return Response.json({ members: getFamilySummaries(lang) });
  } catch (err) {
    console.error("family failed:", err);
    return Response.json({ members: [] }, { status: 500 });
  }
}

// Add a family member.  Body: { name, relation, age }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
    const relation = String(body.relation ?? "Family").trim();
    const age = Number(body.age) || 0;
    const member = addPatient(name, relation, age);
    return Response.json({ member });
  } catch (err) {
    console.error("add member failed:", err);
    return Response.json({ error: "Could not add member." }, { status: 500 });
  }
}

// Remove a family member.  ?id=<patientId>
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required." }, { status: 400 });
    if (getPatients().length <= 1)
      return Response.json({ error: "Keep at least one member." }, { status: 400 });
    removePatient(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("remove member failed:", err);
    return Response.json({ error: "Could not remove member." }, { status: 500 });
  }
}
