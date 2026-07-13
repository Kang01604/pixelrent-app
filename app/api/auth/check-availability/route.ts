import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/auth/check-availability?email=...&username=...
    Reports whether an email and/or username is already taken, so the
    register form can block duplicates on step 1 (before the user fills
    out step 2). Email is checked via the Admin SDK (works even with
    Firebase's email-enumeration protection); username is checked
    against the `users` profile collection. Returns
    { emailTaken, usernameTaken }. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const username = (searchParams.get("username") ?? "").trim();

  let emailTaken = false;
  let usernameTaken = false;

  try {
    if (email) {
      try {
        await adminAuth.getUserByEmail(email);
        emailTaken = true;
      } catch (err) {
        if ((err as { code?: string })?.code !== "auth/user-not-found") throw err;
      }
    }

    if (username) {
      const snap = await adminDb
        .collection("users")
        .where("username", "==", username)
        .limit(1)
        .get();
      usernameTaken = !snap.empty;
    }

    return NextResponse.json({ emailTaken, usernameTaken });
  } catch (err) {
    console.error("[/api/auth/check-availability]", err);
    return NextResponse.json({ error: "Check failed." }, { status: 500 });
  }
}
