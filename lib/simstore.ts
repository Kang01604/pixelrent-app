import { CATALOG } from "./catalog";

/* ============================================================
   PixelRent — simulated backend store

   In-memory only, on purpose: stock and orders live for the
   lifetime of the dev server (globalThis-cached so hot reload
   doesn't reset them). Nothing is persisted to a database —
   auth and payments are simulations.
   ============================================================ */

export type OrderItem = { gameId: string; name: string; qty: number; end: string; price: number };
export type Order = {
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
  paymentMethod: string;
  placedAt: string;
  simulated: true;
};

type SimStore = {
  stock: Map<string, number>;
  orders: Order[];
};

const globalForStore = globalThis as unknown as { __pixelrentStore?: SimStore };

function createStore(): SimStore {
  return {
    stock: new Map(CATALOG.map((g) => [g.id, g.itemsLeft])),
    orders: [],
  };
}

export const store: SimStore = globalForStore.__pixelrentStore ?? createStore();
globalForStore.__pixelrentStore = store;

export const getStock = (id: string) => store.stock.get(id) ?? 0;

export const takeStock = (id: string, qty: number): boolean => {
  const left = getStock(id);
  if (qty > left) return false;
  store.stock.set(id, left - qty);
  return true;
};

export const newOrderId = () =>
  `PR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
