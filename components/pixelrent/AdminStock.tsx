"use client";

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import type { Game, Platform } from "../../lib/catalog";

const PLATFORMS: Platform[] = ["PS5", "XBOX", "PC", "SWITCH"];

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

const emptyForm = {
  name: "",
  platform: "PS5" as Platform,
  price: "150",
  itemsLeft: "10",
  publisher: "",
  coverUrl: "",
  description: "",
};

export default function AdminStock() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/api/admin/games");
      setGames(data.games ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load games.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchGame = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/games/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setGames((gs) => gs.map((g) => (g.id === id ? { ...g, ...body } : g)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const addGame = async () => {
    setAddError("");
    if (!form.name.trim()) return setAddError("Name is required.");
    setAdding(true);
    try {
      const data = await adminFetch("/api/admin/games", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          itemsLeft: Number(form.itemsLeft),
        }),
      });
      setGames((gs) => [data.game as Game, ...gs]);
      setForm(emptyForm);
      setShowAdd(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add game.");
    } finally {
      setAdding(false);
    }
  };

  const filtered = games.filter((g) =>
    (g.name + g.platform + g.publisher).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-condensed text-2xl font-bold text-white">
          Stock{" "}
          <span className="text-white/40">({games.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games…"
            className="rounded-full bg-white/10 px-4 py-2 font-condensed text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#15f5ea]"
          />
          <button
            type="button"
            onClick={() => {
              setShowAdd((v) => !v);
              setAddError("");
            }}
            className="rounded-full bg-gradient-to-r from-[#2dcabd] to-[#7b2fd6] px-5 py-2 font-condensed font-bold text-white transition active:scale-95"
          >
            {showAdd ? "Close" : "+ Add game"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/20 px-4 py-2 font-condensed text-sm text-red-200">
          {error}
        </p>
      )}

      {/* Add-game form */}
      {showAdd && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h3 className="font-condensed text-lg font-bold text-white">New game</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Platform">
              <select className={inputCls} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} className="bg-[#291931]">{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Price (₱)">
              <input type="number" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
            <Field label="Starting stock">
              <input type="number" className={inputCls} value={form.itemsLeft} onChange={(e) => setForm({ ...form, itemsLeft: e.target.value })} />
            </Field>
            <Field label="Publisher">
              <input className={inputCls} value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
            </Field>
            <Field label="Cover image URL">
              <input className={inputCls} value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
            </div>
          </div>
          {addError && <p className="mt-3 font-condensed text-sm text-red-300">{addError}</p>}
          <button
            type="button"
            onClick={addGame}
            disabled={adding}
            className="mt-4 rounded-full bg-gradient-to-r from-[#2dcabd] to-[#7b2fd6] px-6 py-2 font-condensed font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add game"}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="font-condensed text-white/60">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="font-condensed text-white/60">No games found.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-left font-condensed text-sm uppercase tracking-wide text-white/50">
                <th className="py-3 pr-3">Game</th>
                <th className="px-3">Platform</th>
                <th className="px-3">Price</th>
                <th className="px-3">Stock</th>
                <th className="px-3">Rating</th>
                <th className="px-3">Status</th>
                <th className="px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <StockRow
                  key={g.id}
                  game={g}
                  busy={busyId === g.id}
                  onSaveStock={(n) => patchGame(g.id, { itemsLeft: n })}
                  onToggleArchive={() => patchGame(g.id, { archived: !g.archived })}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StockRow({
  game,
  busy,
  onSaveStock,
  onToggleArchive,
}: {
  game: Game;
  busy: boolean;
  onSaveStock: (n: number) => void;
  onToggleArchive: () => void;
}) {
  const [stock, setStock] = useState(String(game.itemsLeft ?? 0));
  const dirty = stock !== String(game.itemsLeft ?? 0);

  return (
    <tr className={`border-b border-white/10 font-condensed ${game.archived ? "opacity-50" : ""}`}>
      <td className="py-3 pr-3">
        <div className="flex items-center gap-3">
          {game.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.coverUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />
          ) : (
            <div className="h-14 w-10 shrink-0 rounded bg-white/10" />
          )}
          <div className="min-w-0">
            <p className="truncate text-white">{game.name}</p>
            <p className="truncate text-sm text-white/50">{game.publisher}</p>
          </div>
        </div>
      </td>
      <td className="px-3 text-white/80">{game.platform}</td>
      <td className="px-3 text-white/80">₱{Number(game.price).toFixed(2)}</td>
      <td className="px-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-20 rounded bg-white/10 px-2 py-1 text-white outline-none focus:ring-2 focus:ring-[#15f5ea]"
          />
          {dirty && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onSaveStock(Number(stock))}
              className="rounded bg-[#15f5ea]/20 px-2 py-1 text-sm text-[#15f5ea] transition active:scale-95 disabled:opacity-50"
            >
              Save
            </button>
          )}
        </div>
      </td>
      <td className="px-3 text-white/80">{Number(game.rating).toFixed(1)}</td>
      <td className="px-3">
        {game.archived ? (
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/60">Archived</span>
        ) : (
          <span className="rounded-full bg-[#2dcabd]/20 px-2 py-1 text-xs text-[#2dcabd]">Active</span>
        )}
      </td>
      <td className="px-3 text-right">
        <button
          type="button"
          disabled={busy}
          onClick={onToggleArchive}
          className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/80 transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
        >
          {game.archived ? "Unarchive" : "Archive"}
        </button>
      </td>
    </tr>
  );
}

const inputCls =
  "w-full rounded-lg bg-white/10 px-3 py-2 font-condensed text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#15f5ea]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-condensed text-sm text-white/70">{label}</span>
      {children}
    </label>
  );
}
