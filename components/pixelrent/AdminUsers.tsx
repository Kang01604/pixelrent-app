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

type AdminUser = {
  uid: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  role?: string;
  disabled?: boolean;
  addresses?: unknown[];
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showDisabled, setShowDisabled] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/api/admin/users");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = async (uid: string, body: Record<string, unknown>) => {
    setBusyId(uid);
    setError("");
    try {
      await adminFetch(`/api/admin/users/${uid}`, { method: "PATCH", body: JSON.stringify(body) });
      setUsers((us) => us.map((u) => (u.uid === uid ? { ...u, ...body } : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleDisabled = async (u: AdminUser) => {
    if (!confirm(u.disabled ? `Restore ${u.username}?` : `Disable ${u.username}? They won't be able to log in, and the account is permanently deleted after 30 days.`)) return;
    setBusyId(u.uid);
    setError("");
    try {
      await adminFetch(`/api/admin/users/${u.uid}/disable`, {
        method: "POST",
        body: JSON.stringify({ disabled: !u.disabled }),
      });
      setUsers((us) => us.map((x) => (x.uid === u.uid ? { ...x, disabled: !u.disabled } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!showDisabled && u.disabled) return false;
    const hay = (u.username ?? "") + (u.email ?? "") + (u.firstName ?? "") + (u.lastName ?? "");
    return hay.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-condensed text-2xl font-bold text-white">
          Users <span className="text-white/40">({users.length})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 font-condensed text-sm text-white/70">
            <input type="checkbox" checked={showDisabled} onChange={(e) => setShowDisabled(e.target.checked)} />
            Show disabled
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
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
          <p className="font-condensed text-white/60">No users found.</p>
        ) : (
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-left font-condensed text-sm uppercase tracking-wide text-white/50">
                <th className="py-3 pr-3">User</th>
                <th className="px-3">Email</th>
                <th className="px-3">Phone</th>
                <th className="px-3">Role</th>
                <th className="px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.uid} className={`border-b border-white/10 font-condensed ${u.disabled ? "opacity-50" : ""}`}>
                  <td className="py-3 pr-3">
                    <p className="text-white">
                      {u.username}
                      {u.disabled && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/60">disabled</span>}
                    </p>
                    <p className="text-sm text-white/50">
                      {u.firstName} {u.lastName}
                    </p>
                  </td>
                  <td className="px-3 text-white/80">{u.email}</td>
                  <td className="px-3 text-white/80">{u.phone}</td>
                  <td className="px-3">
                    {u.role === "admin" ? (
                      <span className="rounded-full bg-[#15f5ea]/20 px-2 py-1 text-xs text-[#15f5ea]">admin</span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/60">user</span>
                    )}
                  </td>
                  <td className="px-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => setEditing(u)} className={actionBtn}>Edit</button>
                      <button
                        type="button"
                        disabled={busyId === u.uid}
                        onClick={() => patch(u.uid, { role: u.role === "admin" ? "" : "admin" })}
                        className={actionBtn}
                      >
                        {u.role === "admin" ? "Remove admin" : "Make admin"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === u.uid}
                        onClick={() => toggleDisabled(u)}
                        className={`${actionBtn} ${u.disabled ? "" : "text-red-200"}`}
                      >
                        {u.disabled ? "Restore" : "Disable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          busy={busyId === editing.uid}
          onClose={() => setEditing(null)}
          onSave={async (fields) => {
            await patch(editing.uid, fields);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  busy,
  onClose,
  onSave,
}: {
  user: AdminUser;
  busy: boolean;
  onClose: () => void;
  onSave: (fields: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState({
    username: user.username ?? "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    gender: user.gender ?? "",
    dob: user.dob ?? "",
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#241430] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-condensed text-xl font-bold text-white">Edit {user.username}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["username", "firstName", "lastName", "phone", "gender", "dob"] as const).map((k) => (
            <label key={k} className="block">
              <span className="mb-1 block font-condensed text-sm capitalize text-white/70">{k}</span>
              <input
                className="w-full rounded-lg bg-white/10 px-3 py-2 font-condensed text-white outline-none focus:ring-2 focus:ring-[#15f5ea]"
                value={f[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-white/20 px-5 py-2 font-condensed text-white/80 transition hover:bg-white/10">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(f)}
            className="rounded-full bg-gradient-to-r from-[#2dcabd] to-[#7b2fd6] px-6 py-2 font-condensed font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const actionBtn =
  "rounded-full border border-white/20 px-3 py-1 font-condensed text-sm text-white/80 transition hover:bg-white/10 active:scale-95 disabled:opacity-50";
