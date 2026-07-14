import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { requireAdmin, adminErrorResponse } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/users — every user profile (notifications stripped out). */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const snap = await adminDb.collection("users").get();
    const users = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        // Drop the (potentially large) notifications array from the list.
        const { notifications, ...rest } = data;
        void notifications;
        return { uid: d.id, ...rest };
      })
      .sort((a, b) =>
        String((a as { username?: string }).username ?? "").localeCompare(
          String((b as { username?: string }).username ?? ""),
        ),
      );
    return NextResponse.json({ users });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
