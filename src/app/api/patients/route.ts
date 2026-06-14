import { getPatients } from "@/lib/db";
import { getAccountId } from "@/lib/account";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return Response.json({ patients: getPatients(getAccountId(request)) });
  } catch (err) {
    console.error("patients failed:", err);
    return Response.json({ patients: [] }, { status: 500 });
  }
}
