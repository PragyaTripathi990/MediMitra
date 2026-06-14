import { createAccount } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string; age?: number | string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const age = Number(body.age) || 0;

  if (!name || !email || !password)
    return Response.json({ error: "Name, email and password are required." }, { status: 400 });
  if (password.length < 6)
    return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email))
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });

  try {
    const result = createAccount(name, email, password, age);
    if ("error" in result) return Response.json({ error: result.error }, { status: 409 });
    return Response.json({ account: result });
  } catch (err) {
    console.error("signup failed:", err);
    return Response.json({ error: "Could not create account." }, { status: 500 });
  }
}
