"use client";

import { useState } from "react";
import AdminStock from "./AdminStock";
import AdminOrders from "./AdminOrders";
import AdminUsers from "./AdminUsers";
import {
  Header,
  Footer,
  PageId,
  UserProfile,
  AppNotification,
} from "./shared";

type AdminTab = "stock" | "orders" | "users";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "orders", label: "Orders" },
  { id: "users", label: "Users" },
];

/* The admin dashboard. Access is gated in PixelRentApp (only rendered
   when the signed-in user's role is "admin"); this component is just
   the themed shell + tabs. The tab contents are filled in later stages. */
export default function AdminDashboard({
  onNavigate,
  cartCount = 0,
  user,
  ...headerProps
}: {
  onNavigate: (id: PageId) => void;
  cartCount?: number;
  user: UserProfile;
  onAuth?: (mode: "login" | "register") => void;
  loggedIn?: boolean;
  authReady?: boolean;
  onLogout?: () => void;
  isAdmin?: boolean;
  notifications?: AppNotification[];
  onNotificationsOpened?: () => void;
  avatarUrl?: string;
}) {
  const [tab, setTab] = useState<AdminTab>("stock");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#18091f] via-[#1d0d26] to-[#291931]">
      <Header
        activeId="admin"
        onNavigate={onNavigate}
        cartCount={cartCount}
        {...headerProps}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-[104px] sm:px-8 lg:pt-[136px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-condensed text-5xl font-bold text-white sm:text-6xl">
              Admin Dashboard
            </h1>
            <p className="mt-1 font-condensed text-base text-white/60">
              Signed in as {user.username || user.email}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b border-white/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative px-5 py-3 font-condensed text-lg outline-none transition
                ${
                  tab === t.id
                    ? "text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[#15f5ea]" />
              )}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[-14px_20px_38px_rgba(24,9,31,0.32)] sm:p-8">
          {tab === "stock" && <AdminStock />}
          {tab === "orders" && <AdminOrders />}
          {tab === "users" && <AdminUsers />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
