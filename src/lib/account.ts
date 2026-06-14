import { DEMO } from "./db";

// The client sends its account id (a random, unguessable token for real users;
// "demo" for the shared demo workspace) in this header. Absent → demo.
// Lightweight by design; production swaps this for a verified JWT/ABHA session.
export function getAccountId(req: Request): string {
  return req.headers.get("x-mm-account")?.trim() || DEMO;
}
