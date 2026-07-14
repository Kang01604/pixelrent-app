import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { requireAdmin, adminErrorResponse } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/orders — every order, plus the customer's username/email. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const snap = await adminDb.collection("orders").get();
    const orders = snap.docs.map((d) => d.data());

    // One read for all users, then a lookup map (was one read per order).
    const usersSnap = await adminDb.collection("users").get();
    const userMap: Record<string, { username?: string; email?: string }> = {};
    usersSnap.docs.forEach((u) => {
      const d = u.data() as { username?: string; email?: string };
      userMap[u.id] = { username: d.username, email: d.email };
    });

    const withCustomer = orders
      .map((o) => {
        const uid = (o as { uid?: string }).uid ?? "";
        return { ...o, customer: userMap[uid] ?? {} };
      })
      .sort((a, b) =>
        String((b as { placedAt?: string }).placedAt ?? "").localeCompare(
          String((a as { placedAt?: string }).placedAt ?? ""),
        ),
      );

    return NextResponse.json({ orders: withCustomer });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
