"use client";

import { useEffect, useState } from "react";
import Homepage from "./Homepage";
import BrowseGames, { Game, CartItem, cartRowKey } from "./BrowseGames";
import CartPage from "./CartPage";
import SettingsPage from "./SettingsPage";
import { AuthModal, PageId, UserProfile, AppNotification } from "./shared";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

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
        if (snap.exists()) setUser(snap.data() as UserProfile);
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

  /* Placed order -> notification with the server-issued order ID. */
  const orderPlaced = (orderId: string, lines: string[], total: number) => {
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        orderId,
        lines,
        total,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false,
      },
      ...prev,
    ]);
  };

  const markNotificationsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const cartCount = cart.reduce((n, c) => n + c.qty, 0);

  const headerProps = {
    onAuth: openAuth,
    loggedIn,
    authReady,
    onLogout: logout,
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
          onUpdateUser={setUser}
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
