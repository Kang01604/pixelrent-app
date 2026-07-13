import { NextResponse } from "next/server";
import { adminAuth } from "../../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/auth/check-email?email=... — is this email already registered?
    Uses the Admin SDK, so it works even with Firebase's email-enumeration
    protection enabled. Returns { exists: boolean }. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Missing email." }, { status: 400 });
  }

  try {
    await adminAuth.getUserByEmail(email);
    return NextResponse.json({ exists: true });
  } catch (err) {
    if ((err as { code?: string })?.code === "auth/user-not-found") {
      return NextResponse.json({ exists: false });
    }
    console.error("[/api/auth/check-email]", err);
    return NextResponse.json({ error: "Check failed." }, { status: 500 });
  }
}
