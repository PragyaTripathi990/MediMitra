import { resetDemo } from "@/lib/db";

export const runtime = "nodejs";

// Presenter-only: wipe + re-seed the demo data to a pristine state.
export async function POST() {
  try {
    resetDemo();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("reset failed:", err);
    return Response.json({ error: "reset failed" }, { status: 500 });
  }
}
