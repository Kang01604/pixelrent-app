import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../../../lib/firebaseAdmin";
import { requireAdmin, adminErrorResponse, AdminError } from "../../../../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/users/[uid]/disable  { disabled: true|false }
    Soft-delete: flags the profile with disabledAt and blocks the login.
    A disabled account is hard-deleted by the daily job after 30 days.
    Reversible any time before then by disabling=false. */
export async function POST(req: Request, { params }: { params: { uid: string } }) {
  try {
    const adminUid = await requireAdmin(req);
    const { uid } = params;
    if (uid === adminUid) throw new AdminError("You can't disable your own account.", 400);

    const body = await req.json().catch(() => ({}));
    const disabled = Boolean(body?.disabled);

    const ref = adminDb.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) throw new AdminError("User not found.", 404);

    // Block/restore the actual login.
    try {
      await adminAuth.updateUser(uid, { disabled });
    } catch {
      /* auth user may not exist (profile-only) — carry on with the flag */
    }

    await ref.set(
      disabled
        ? { disabled: true, disabledAt: new Date().toISOString() }
        : { disabled: false, disabledAt: "" },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
