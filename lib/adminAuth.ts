/* ============================================================
   PixelRent — admin guard for API routes.

   requireAdmin(req) verifies the caller's Firebase ID token, then
   confirms their users/{uid} profile has role === "admin". Throws
   an AdminError (401/403) otherwise. Every /api/admin/* route calls
   this first, so admin powers are enforced on the server — the UI
   check is only cosmetic.
   ============================================================ */

import { adminAuth, adminDb } from "./firebaseAdmin";
import { NextResponse } from "next/server";

export class AdminError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Verify the request is from a signed-in admin. Returns their uid. */
export async function requireAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new AdminError("You must be signed in.", 401);

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    throw new AdminError("Session expired. Please sign in again.", 401);
  }

  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new AdminError("Admins only.", 403);
  }
  return uid;
}

/** Turn an AdminError (or unknown error) into a JSON response. */
export function adminErrorResponse(err: unknown) {
  if (err instanceof AdminError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[admin route]", err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
