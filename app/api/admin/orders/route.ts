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

    // Attach a light customer label for each order.
    const uids = [...new Set(orders.map((o) => (o as { uid?: string }).uid).filter(Boolean))] as string[];
    const userMap: Record<string, { username?: string; email?: string }> = {};
    await Promise.all(
      uids.map(async (uid) => {
        const u = await adminDb.collection("users").doc(uid).get();
        if (u.exists) {
          const d = u.data() as { username?: string; email?: string };
          userMap[uid] = { username: d.username, email: d.email };
        }
      }),
    );

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
