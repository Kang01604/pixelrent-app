"use client";

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

type OrderItem = { gameId: string; name: string; qty: number; end: string; price: number };
type AdminOrder = {
  orderId: string;
  uid: string;
  items: OrderItem[];
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: string;
  placedAt: string;
  status?: string;
  customer?: { username?: string; email?: string };
};

const STATUSES = ["pending", "fulfilled", "cancelled"];
const statusCls: Record<string, string> = {
  pending: "bg-yellow-400/20 text-yellow-200",
  fulfilled: "bg-[#2dcabd]/20 text-[#2dcabd]",
  cancelled: "bg-red-400/20 text-red-200",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/api/admin/orders");
      setOrders(data.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (orderId: string, status: string) => {
    setBusyId(orderId);
    try {
      await adminFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((os) => os.map((o) => (o.orderId === orderId ? { ...o, status } : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const s = o.status ?? "pending";
    if (filter !== "all" && s !== filter) return false;
    const hay = (o.orderId + (o.customer?.username ?? "") + (o.customer?.email ?? "")).toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-condensed text-2xl font-bold text-white">
          Orders <span className="text-white/40">({orders.length})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-full bg-white/10 px-4 py-2 font-condensed text-white outline-none focus:ring-2 focus:ring-[#15f5ea]"
          >
            <option value="all" className="bg-[#291931]">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[#291931]">{s}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order / customer…"
            className="rounded-full bg-white/10 px-4 py-2 font-condensed text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#15f5ea]"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/20 px-4 py-2 font-condensed text-sm text-red-200">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="font-condensed text-white/60">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="font-condensed text-white/60">No orders found.</p>
        ) : (
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-left font-condensed text-sm uppercase tracking-wide text-white/50">
                <th className="py-3 pr-3">Order</th>
                <th className="px-3">Customer</th>
                <th className="px-3">Items</th>
                <th className="px-3">Total</th>
                <th className="px-3">Date</th>
                <th className="px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const s = o.status ?? "pending";
                return (
                  <tr key={o.orderId} className="border-b border-white/10 font-condensed align-top">
                    <td className="py-3 pr-3 text-white">{o.orderId}</td>
                    <td className="px-3 text-white/80">
                      <p className="text-white">{o.customer?.username ?? "—"}</p>
                      <p className="text-sm text-white/50">{o.customer?.email ?? ""}</p>
                    </td>
                    <td className="px-3 text-white/80">
                      {o.items?.map((it, i) => (
                        <p key={i} className="text-sm">
                          {it.qty}× {it.name}
                        </p>
                      ))}
                    </td>
                    <td className="px-3 text-white/80">
                      ₱{Number(o.total).toFixed(2)}
                      <span className="block text-xs text-white/40">VAT ₱{Number(o.vat).toFixed(2)}</span>
                    </td>
                    <td className="px-3 text-sm text-white/60">
                      {o.placedAt ? new Date(o.placedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs ${statusCls[s] ?? ""}`}>{s}</span>
                        <select
                          value={s}
                          disabled={busyId === o.orderId}
                          onChange={(e) => setStatus(o.orderId, e.target.value)}
                          className="rounded bg-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-[#15f5ea] disabled:opacity-50"
                        >
                          {STATUSES.map((st) => (
                            <option key={st} value={st} className="bg-[#291931]">{st}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
