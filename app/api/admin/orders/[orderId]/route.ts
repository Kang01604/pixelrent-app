import { NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import { requireAdmin, adminErrorResponse, AdminError } from "../../../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES = ["pending", "fulfilled", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type Notification = {
  id: string;
  orderId: string;
  lines: string[];
  total: number;
  time: string;
  createdAt: string;
  read: boolean;
};

/** PATCH /api/admin/orders/[orderId] — set the order status and drop a
    notification into that customer's bell so they see the change. */
export async function PATCH(req: Request, { params }: { params: { orderId: string } }) {
  try {
    await requireAdmin(req);
    const { orderId } = params;
    const body = await req.json().catch(() => null);
    const status = String(body?.status ?? "") as Status;
    if (!STATUSES.includes(status)) throw new AdminError("Invalid status.", 400);

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new AdminError("Order not found.", 404);
    const order = orderSnap.data() as { uid?: string; total?: number };

    await orderRef.set({ status }, { merge: true });

    // Notify the customer (persistent notification, 30-day expiry handled on load).
    if (order.uid) {
      const userRef = adminDb.collection("users").doc(order.uid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const existing = (userSnap.data()?.notifications ?? []) as Notification[];
        const now = Date.now();
        const kept = existing.filter(
          (n) => !n.createdAt || now - new Date(n.createdAt).getTime() < THIRTY_DAYS_MS,
        );
        const note: Notification = {
          id: `n-${now}`,
          orderId,
          lines: [`Order ${orderId} is now ${status}.`],
          total: order.total ?? 0,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date().toISOString(),
          read: false,
        };
        await userRef.set({ notifications: [note, ...kept] }, { merge: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
