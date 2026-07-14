"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Homepage from "./Homepage";
import BrowseGames, { Game, CartItem, cartRowKey } from "./BrowseGames";
import CartPage from "./CartPage";
import SettingsPage from "./SettingsPage";
import AdminDashboard from "./AdminDashboard";
import { AuthModal, PageId, UserProfile, AppNotification } from "./shared";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

// useLayoutEffect on the client (runs before paint), useEffect on the
// server (avoids the SSR warning). Used to restore the saved page
// before the first paint so there's no homepage flash.
const useBrowserLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Notifications auto-expire after 30 days.
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function pruneNotifications(list: AppNotification[]): AppNotification[] {
  const now = Date.now();
  return list.filter(
    (n) => !n.createdAt || now - new Date(n.createdAt).getTime() < THIRTY_DAYS_MS,
  );
}

function persistNotifications(list: AppNotification[]) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  setDoc(doc(db, "users", uid), { notifications: list }, { merge: true }).catch(() => {});
}

export default function PixelRentApp() {
  const [page, setPage] = useState<PageId>("home");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  // False until Firebase reports the auth state once — prevents the
  // header from flashing the logged-out buttons on refresh.
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  /* Which game's cart rows to highlight after arriving via "In Cart ✓" */
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [checkoutRequested, setCheckoutRequested] = useState(false);

  const loggedIn = user !== null;

  /* Remember the current page across refreshes. Restore in a layout
     effect (before paint) so the homepage never flashes first. */
  useBrowserLayoutEffect(() => {
    try {
      const saved = localStorage.getItem("pixelrent-page");
      if (
        saved === "home" ||
        saved === "products" ||
        saved === "cart" ||
        saved === "settings" ||
        saved === "admin"
      ) {
        setPage(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("pixelrent-page", page);
    } catch {
      /* ignore */
    }
  }, [page]);

  /* Cart survives refreshes via localStorage (client-side only). */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pixelrent-cart");
      if (raw) setCart(JSON.parse(raw));
    } catch {
      /* corrupted cart — start fresh */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("pixelrent-cart", JSON.stringify(cart));
    } catch {
      /* storage full/blocked — cart stays in memory */
    }
  }, [cart]);

  /* Restore the signed-in user on refresh. Firebase persists the
     session; we re-hydrate the profile from Firestore. */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        if (snap.exists()) {
          const data = snap.data() as UserProfile & { notifications?: AppNotification[] };
          // Keep notifications out of the profile object we hand around.
          const { notifications: stored, ...profile } = data;
          setUser(profile as UserProfile);

          const kept = pruneNotifications(Array.isArray(stored) ? stored : []);
          setNotifications(kept);
          // If the 30-day prune dropped anything, save the trimmed list back.
          if (Array.isArray(stored) && kept.length !== stored.length) {
            setDoc(doc(db, "users", fbUser.uid), { notifications: kept }, { merge: true }).catch(
              () => {},
            );
          }
        }
      } catch {
        /* offline / rules — leave user as-is */
      } finally {
        setAuthReady(true);
      }
    });
    return unsub;
  }, []);

  /* Merge copies into rows: same game + same end date = one row
     (qty goes up); a different end date creates its own row. */
  const mergeCopies = (rows: CartItem[], game: Game, ends: string[]): CartItem[] => {
    const next = rows.map((c) => ({ ...c }));
    for (const end of ends) {
      const i = next.findIndex((c) => c.game.id === game.id && c.end === end);
      if (i >= 0) next[i].qty = Math.min(next[i].qty + 1, game.itemsLeft);
      else next.push({ game, qty: 1, end });
    }
    return next;
  };

  const addToCart = (game: Game, ends: string[]) =>
    setCart((prev) => mergeCopies(prev, game, ends));

  const setQty = (key: string, qty: number) =>
    setCart((prev) =>
      prev.map((c) =>
        cartRowKey(c) === key
          ? { ...c, qty: Math.min(Math.max(1, qty), c.game.itemsLeft) }
          : c
      )
    );

  /* Re-configure a row's copies: the old row is removed and its copies
     are regrouped by end date — splitting or re-merging as needed. */
  const updateRow = (key: string, ends: string[]) =>
    setCart((prev) => {
      const row = prev.find((c) => cartRowKey(c) === key);
      if (!row) return prev;
      const without = prev.filter((c) => cartRowKey(c) !== key);
      return mergeCopies(without, row.game, ends);
    });

  const removeItems = (keys: string[]) =>
    setCart((prev) => prev.filter((c) => !keys.includes(cartRowKey(c))));

  const openAuth = (mode: "login" | "register") => setAuthMode(mode);
  const logout = () => {
    signOut(auth).catch(() => {
      /* ignore — local state is cleared regardless */
    });
    setUser(null);
    setNotifications([]);
  };

  /* Profile / address edits update the session immediately AND persist to
     Firestore, so they survive a refresh (which re-hydrates from Firestore). */
  const handleUpdateUser = (profile: UserProfile) => {
    setUser(profile);
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, "users", uid), profile, { merge: true }).catch(() => {
        /* offline / rules — the on-screen copy is still updated */
      });
    }
  };

  /* "In Cart" in the game popup -> jump to the cart and pulse that game. */
  const viewInCart = (id: string) => {
    setHighlightId(id);
    setPage("cart");
  };

  const requestCheckout = () => {
    setCheckoutRequested(true);
    setPage("cart");
  };

  const clearCheckoutRequest = () => setCheckoutRequested(false);

  /* Placed order -> notification with the server-issued order ID.
     Notifications are stored per-user in Firestore, survive refreshes,
     and auto-expire after 30 days. */
  const orderPlaced = (orderId: string, lines: string[], total: number) => {
    const next = pruneNotifications([
      {
        id: `n-${Date.now()}`,
        orderId,
        lines,
        total,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...notifications,
    ]);
    setNotifications(next);
    persistNotifications(next);
  };

  const markNotificationsRead = () => {
    const next = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(next);
    persistNotifications(next);
  };

  const cartCount = cart.reduce((n, c) => n + c.qty, 0);
  const isAdmin = user?.role === "admin";

  /* Guard the admin page — bounce anyone who isn't an admin back home
     (covers logged-out users and non-admins who land on it directly). */
  useEffect(() => {
    if (page === "admin" && authReady && user?.role !== "admin") {
      setPage("home");
    }
  }, [page, authReady, user]);

  const headerProps = {
    onAuth: openAuth,
    loggedIn,
    authReady,
    onLogout: logout,
    isAdmin,
    notifications,
    onNotificationsOpened: markNotificationsRead,
    avatarUrl: user?.avatarUrl,
  };

  return (
    <>
      {page === "home" && (
        <Homepage onNavigate={setPage} cartCount={cartCount} {...headerProps} />
      )}
      {page === "products" && (
        <BrowseGames
          onNavigate={setPage}
          cart={cart}
          onAddToCart={addToCart}
          onViewInCart={viewInCart}
          onCheckoutRequested={requestCheckout}
          {...headerProps}
        />
      )}
      {page === "cart" && (
        <CartPage
          onNavigate={setPage}
          cart={cart}
          onSetQty={setQty}
          onUpdateRow={updateRow}
          onRemoveItems={removeItems}
          highlightId={highlightId}
          onClearHighlight={() => setHighlightId(null)}
          user={user}
          onOrderPlaced={orderPlaced}
          autoOpenCheckout={checkoutRequested}
          onCheckoutHandled={clearCheckoutRequest}
          {...headerProps}
        />
      )}
      {page === "settings" && user && (
        <SettingsPage
          onNavigate={setPage}
          user={user}
          onUpdateUser={handleUpdateUser}
          onLogout={logout}
          cartCount={cartCount}
          notifications={notifications}
          onNotificationsOpened={markNotificationsRead}
          onAuth={openAuth}
        />
      )}
      {page === "settings" && !user && (
        /* Not logged in but landed on settings (e.g. after deletion) */
        <Homepage onNavigate={setPage} cartCount={cartCount} {...headerProps} />
      )}

      {page === "admin" && isAdmin && user && (
        <AdminDashboard
          onNavigate={setPage}
          cartCount={cartCount}
          user={user}
          {...headerProps}
        />
      )}
      {page === "admin" && !isAdmin && authReady && (
        /* Confirmed non-admin on the admin page (the effect redirects home). */
        <Homepage onNavigate={setPage} cartCount={cartCount} {...headerProps} />
      )}

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onLogin={(profile) => setUser(profile)}
        />
      )}
    </>
  );
}
