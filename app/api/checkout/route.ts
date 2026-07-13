import { NextResponse } from "next/server";
import { getGame } from "../../../lib/catalog";
import { getStock, takeStock, newOrderId, store, OrderItem } from "../../../lib/simstore";
import { validateCheckout } from "../../../lib/validate";

const VAT_RATE = 0.12; // Philippine VAT
const SHIPPING_FEE = 0;

/** POST /api/checkout — SIMULATED payment. Validates the cart,
    decrements stock, computes 12% PH VAT, returns an order ID.
    No real payment processor is involved. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const invalid = validateCheckout(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  /* Stock check first (all-or-nothing), then decrement. */
  const perGame = new Map<string, number>();
  for (const item of body.items) {
    perGame.set(item.gameId, (perGame.get(item.gameId) ?? 0) + item.qty);
  }
  for (const [gameId, qty] of perGame) {
    const game = getGame(gameId);
    if (!game) return NextResponse.json({ error: `Unknown game: ${gameId}` }, { status: 400 });
    if (qty > getStock(gameId))
      return NextResponse.json(
        { error: `Not enough copies of ${game.name} left.` },
        { status: 409 }
      );
  }
  for (const [gameId, qty] of perGame) takeStock(gameId, qty);

  const itemsPayload = (body as { items?: Array<{ gameId: string; qty: number; end: string }> }).items ?? [];
  const items: OrderItem[] = itemsPayload.map((i) => {
    const game = getGame(i.gameId)!;
    return { gameId: game.id, name: game.name, qty: i.qty, end: i.end, price: game.price };
  });

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const total = subtotal + SHIPPING_FEE + vat;

  const order = {
    orderId: newOrderId(),
    items,
    subtotal,
    shipping: SHIPPING_FEE,
    vat,
    total,
    paymentMethod: body.paymentMethod,
    placedAt: new Date().toISOString(),
    simulated: true as const,
  };
  store.orders.push(order);

  return NextResponse.json({ order });
}
