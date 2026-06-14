import { loginAccount } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password)
    return Response.json({ error: "Email and password are required." }, { status: 400 });

  try {
    const account = loginAccount(email, password);
    if (!account) return Response.json({ error: "Wrong email or password." }, { status: 401 });
    return Response.json({ account });
  } catch (err) {
    console.error("login failed:", err);
    return Response.json({ error: "Could not log in." }, { status: 500 });
  }
}
