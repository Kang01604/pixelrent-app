import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../../lib/firebaseAdmin";
import { validateCheckout } from "../../../lib/validate";
import type { Game } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

const VAT_RATE = 0.12; // Philippine VAT
const SHIPPING_FEE = 0;

type OrderItem = { gameId: string; name: string; qty: number; end: string; price: number };

const newOrderId = () =>
  `PR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/** POST /api/checkout — REAL, server-authoritative.
    1. Verifies the caller's Firebase ID token (Authorization: Bearer <token>).
    2. Runs a Firestore transaction: checks + decrements stock atomically,
       computes totals + 12% PH VAT from server-side prices.
    3. Writes an order under the user's uid.
    A client cannot fake prices or oversell stock. */
export async function POST(req: Request) {
  // --- 1. Auth: who is ordering? ---
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "You must be signed in to check out." }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  // --- 2. Validate the request shape ---
  const body = await req.json().catch(() => null);
  const invalid = validateCheckout(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const rawItems = (body as { items: Array<{ gameId: string; qty: number; end: string }> }).items;
  const paymentMethod = (body as { paymentMethod: string }).paymentMethod;

  // Merge duplicate gameIds so the stock math is per-title.
  const perGame = new Map<string, number>();
  for (const it of rawItems) perGame.set(it.gameId, (perGame.get(it.gameId) ?? 0) + it.qty);

  try {
    const order = await adminDb.runTransaction(async (tx) => {
      const gamesRef = adminDb.collection("games");

      // Read every involved game inside the transaction.
      const games = new Map<string, Game>();
      for (const gameId of perGame.keys()) {
        const snap = await tx.get(gamesRef.doc(gameId));
        if (!snap.exists) throw new Error(`Unknown game: ${gameId}`);
        games.set(gameId, snap.data() as Game);
      }

      // All-or-nothing stock check.
      for (const [gameId, qty] of perGame) {
        const g = games.get(gameId)!;
        if (qty > (g.itemsLeft ?? 0)) {
          throw new Error(`Not enough copies of ${g.name} left.`);
        }
      }

      // Decrement stock (+ bump a lifetime sales counter).
      for (const [gameId, qty] of perGame) {
        tx.update(gamesRef.doc(gameId), {
          itemsLeft: FieldValue.increment(-qty),
          sales: FieldValue.increment(qty),
        });
      }

      // Build order lines from SERVER prices (client can't tamper).
      const items: OrderItem[] = rawItems.map((i) => {
        const g = games.get(i.gameId)!;
        return { gameId: g.id, name: g.name, qty: i.qty, end: i.end, price: g.price };
      });

      const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
      const total = subtotal + SHIPPING_FEE + vat;

      const orderId = newOrderId();
      const orderDoc = {
        orderId,
        uid,
        items,
        subtotal,
        shipping: SHIPPING_FEE,
        vat,
        total,
        paymentMethod,
        placedAt: new Date().toISOString(),
        status: "pending",
      };

      tx.set(adminDb.collection("orders").doc(orderId), orderDoc);
      return orderDoc;
    });

    return NextResponse.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed.";
    // Stock conflicts -> 409, everything else -> 400.
    const status = message.includes("Not enough") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
