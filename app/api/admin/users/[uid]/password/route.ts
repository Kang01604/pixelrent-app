import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../../../lib/firebaseAdmin";
import { requireAdmin, adminErrorResponse, AdminError } from "../../../../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/users/[uid]/password  { password }
    Sets a new password for the account. Firebase hashes it — the
    plaintext is never stored or readable, here or anywhere. */
export async function POST(req: Request, { params }: { params: { uid: string } }) {
  try {
    await requireAdmin(req);
    const { uid } = params;
    const body = await req.json().catch(() => null);
    const password = String(body?.password ?? "");
    if (password.length < 8) {
      throw new AdminError("Password must be at least 8 characters.", 400);
    }

    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) throw new AdminError("User not found.", 404);

    try {
      await adminAuth.updateUser(uid, { password });
    } catch {
      throw new AdminError("Couldn't update the password (login account may not exist).", 400);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
