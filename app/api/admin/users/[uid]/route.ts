import { NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import { requireAdmin, adminErrorResponse, AdminError } from "../../../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROFILE_FIELDS = [
  "username",
  "firstName",
  "lastName",
  "phone",
  "gender",
  "dob",
  "addresses",
  "defaultAddressId",
] as const;

/** PATCH /api/admin/users/[uid] — edit a user's profile fields and/or role. */
export async function PATCH(req: Request, { params }: { params: { uid: string } }) {
  try {
    const adminUid = await requireAdmin(req);
    const { uid } = params;
    const body = await req.json().catch(() => null);
    if (!body) throw new AdminError("Invalid request body.", 400);

    const ref = adminDb.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) throw new AdminError("User not found.", 404);

    const update: Record<string, unknown> = {};
    for (const f of PROFILE_FIELDS) {
      if (body[f] !== undefined) update[f] = body[f];
    }

    // Role changes (promote/demote). Guard against self-demotion lockout.
    if (body.role !== undefined) {
      const makeAdmin = body.role === "admin";
      if (!makeAdmin && uid === adminUid) {
        throw new AdminError("You can't remove your own admin role.", 400);
      }
      update.role = makeAdmin ? "admin" : "";
    }

    if (Object.keys(update).length === 0) throw new AdminError("Nothing to update.", 400);

    await ref.set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
