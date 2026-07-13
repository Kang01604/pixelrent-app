"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Header, Footer, PillButton, CalendarIcon, Toast, PageId, todayIso, displayDate, UserProfile, AppNotification, formatAddress, authInputClass, AuthField } from "./shared";
import { CartItem, CoverSlot, RentConfigModal, cartRowKey } from "./BrowseGames";
import { auth } from "../../lib/firebase";

/* ============================================================
   PixelRent — My Cart

   - One row per (game, end date): same game + same dates merge,
     different end dates split into separate rows
   - Start date is always "today" (recomputed every render — an
     item not checked out by tomorrow starts tomorrow)
   - The calendar icon on each row opens the same three-part rent
     configurator; changing one copy's end date splits the row
   - Custom rounded checkboxes; «/» quantity stepper per row
   - Place Order: no account -> auth popup; logged in ->
     order placed toast + ordered rows leave the cart
   ============================================================ */

const SHIPPING_FEE = 0;
const VAT_RATE = 0.12; // Philippine VAT (12%)

const peso = (n: number) => `₱${n.toFixed(2)}`;

/* ----------------------- Pieces ----------------------- */

/** Rounded checkbox: purple outline, fills purple when checked. */
function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 border-[#6d2f98] outline-none
        transition focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90
        ${checked ? "bg-[#6d2f98]" : "bg-transparent hover:bg-[#6d2f98]/15"}`}
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        className={`h-4 w-4 transition ${checked ? "opacity-100" : "opacity-0"}`} aria-hidden="true"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </button>
  );
}

/** «/» quantity stepper — capped at the game's Items Left. */
function QtyStepper({
  qty,
  max,
  onSet,
  name,
}: {
  qty: number;
  max: number;
  onSet: (qty: number) => void;
  name: string;
}) {
  const btn = `select-none rounded-lg px-1.5 font-display text-2xl leading-none text-[#6d2f98] outline-none
    transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90
    disabled:cursor-default disabled:opacity-30 disabled:hover:scale-100`;
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={qty <= 1} onClick={() => onSet(qty - 1)} aria-label={`Fewer copies of ${name}`} className={btn}>
        «
      </button>
      <span aria-live="polite" className="min-w-[2.75rem] rounded-lg bg-[#6d2f98]/10 px-2 py-0.5 text-center font-condensed text-lg font-bold text-[#6d2f98]">
        x{qty}
      </span>
      <button type="button" disabled={qty >= max} onClick={() => onSet(qty + 1)} aria-label={`More copies of ${name}`} className={btn}>
        »
      </button>
    </div>
  );
}

function CartRow({
  item,
  checked,
  onToggle,
  onSetQty,
  onEditDates,
  highlighted,
  onClearHighlight,
}: {
  item: CartItem;
  checked: boolean;
  onToggle: () => void;
  onSetQty: (qty: number) => void;
  onEditDates: () => void;
  highlighted: boolean;
  onClearHighlight: () => void;
}) {
  const { game, qty } = item;
  const ref = useRef<HTMLLIElement>(null);

  /* Arriving from "In Cart" — scroll the highlighted row into view. */
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlighted]);

  return (
    <li
      ref={ref}
      onClick={highlighted ? onClearHighlight : undefined}
      className={`flex flex-wrap items-center gap-3 border-b border-[#3a3a3a]/25 py-5 last:border-b-0 sm:flex-nowrap sm:gap-6
        ${highlighted ? "animate-highlight -mx-3 cursor-pointer px-3" : ""}`}
    >
      <Checkbox checked={checked} onChange={onToggle} label={`Include ${game.name} in order`} />

      <div
        className="relative w-16 shrink-0 sm:w-28"
        style={{ backgroundImage: `linear-gradient(to bottom, ${game.gradient.from}, ${game.gradient.to})`, borderRadius: "1rem", padding: "0.4rem" }}
      >
        <CoverSlot game={game} logo className="aspect-square w-full" />
      </div>

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate font-condensed text-xl font-bold text-[#6d2f98] sm:text-3xl">{game.name}</p>
        <p className="truncate font-condensed text-sm text-[#3a3a3a] sm:text-lg">{game.publisher}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <QtyStepper qty={qty} max={game.itemsLeft} onSet={onSetQty} name={game.name} />
          <p className="font-condensed text-xs text-[#3a3a3a]/70 sm:text-sm">Items Left: {game.itemsLeft}</p>
        </div>

        {/* The calendar icon opens the rent configurator for this row */}
        <p className="mt-2 flex items-center gap-1.5 font-condensed text-xs text-[#3a3a3a] sm:text-base">
          <button
            type="button"
            onClick={onEditDates}
            aria-label={`Change rent dates for ${game.name}`}
            className="rounded-md p-0.5 text-[#6d2f98] outline-none transition hover:scale-110 hover:text-[#b23df2]
                       focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90"
          >
            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          Expected End Date of Rent: {displayDate(item.end)}
        </p>
      </div>

      {/* Price drops to its own right-aligned line on narrow screens */}
      <p className="w-full text-right font-condensed text-xl text-[#6d2f98] sm:w-auto sm:shrink-0 sm:text-3xl">
        {peso(game.price * qty)}
      </p>
    </li>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 font-condensed ${bold ? "text-2xl font-bold" : "text-xl"} text-[#1c1c1c]`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

/* ----------------------- Checkout popup ----------------------- */

const PAYMENT_METHODS = ["Credit/Debit Card", "PayPal", "Cash on Delivery"];

function CheckoutModal({
  count,
  subtotal,
  vat,
  total,
  periodStart,
  periodEnd,
  user,
  onClose,
  onPlaceOrder,
  checkoutError,
  onCheckoutErrorChange,
}: {
  count: number;
  subtotal: number;
  vat: number;
  total: number;
  periodStart: string;
  periodEnd: string;
  user: UserProfile | null;
  onClose: () => void;
  onPlaceOrder: (paymentMethod: string) => void;
  checkoutError: string;
  onCheckoutErrorChange: (message: string) => void;
}) {
  const [payment, setPayment] = useState<string | null>(null);
  const [paypalAccount, setPaypalAccount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardBank, setCardBank] = useState("");

  const sanitizeCardNumber = (value: string) => value.replace(/\D/g, "").slice(0, 16);
  const sanitizeName = (value: string) => value.replace(/[^A-Za-zÀ-ÿ .'-]/g, "").slice(0, 60);
  const sanitizeBank = (value: string) => value.replace(/[^A-Za-zÀ-ÿ .'-]/g, "").slice(0, 60);
  const sanitizePaypalAccount = (value: string) => value.replace(/[^A-Za-z0-9@._-]/g, "").slice(0, 80);
  /* Delivery defaults to the profile's default address but can be
     switched to any saved address. */
  const [addrId, setAddrId] = useState<string | null>(
    user?.defaultAddressId ?? user?.addresses[0]?.id ?? null
  );
  const addr = user?.addresses.find((a) => a.id === addrId) ?? null;

  const handlePlaceOrder = () => {
    if (count === 0) {
      onCheckoutErrorChange("Choose at least one item to checkout.");
      return;
    }
    if (!payment) {
      onCheckoutErrorChange("Select a payment method to continue.");
      return;
    }
    if (payment === "PayPal") {
      if (!paypalAccount.trim()) {
        onCheckoutErrorChange("Enter your PayPal account.");
        return;
      }
    }
    if (payment === "Credit/Debit Card") {
      const cleanCard = cardNumber.replace(/\D/g, "");
      if (!/^\d{16}$/.test(cleanCard)) {
        onCheckoutErrorChange("Enter a valid 16-digit card number.");
        return;
      }
      if (!cardName.trim()) {
        onCheckoutErrorChange("Enter the cardholder full name.");
        return;
      }
      if (!cardBank.trim()) {
        onCheckoutErrorChange("Enter the issuing bank.");
        return;
      }
    }
    if (user && !addr) {
      onCheckoutErrorChange("Add a delivery address in Settings before checking out.");
      return;
    }
    onCheckoutErrorChange("");
    onPlaceOrder(payment);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Order summary"
      className="animate-overlayIn fixed inset-0 z-50 flex items-start justify-center overflow-y-auto
                 bg-[#200032]/70 p-3 backdrop-blur-md sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-popIn relative my-auto w-full max-w-2xl rounded-[32px] bg-[#cfa6e6]/30 p-6
                   shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-condensed text-3xl text-white sm:text-4xl">Order Summary</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white outline-none transition
                       hover:rotate-90 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <hr className="mt-4 border-white/50" />

        {/* White card */}
        <div className="mt-6 rounded-2xl bg-[#f3eef8] p-4 sm:p-8">
          <h3 className="font-condensed text-2xl font-bold text-[#1c1c1c]">Delivery Information</h3>
          <hr className="mt-2 border-[#3a3a3a]/30" />
          {user && addr ? (
            <div className="mt-3 space-y-0.5 font-condensed text-lg text-[#1c1c1c]">
              {user.addresses.length > 1 && (
                <select
                  value={addrId ?? ""}
                  onChange={(e) => setAddrId(e.target.value)}
                  aria-label="Choose delivery address"
                  className={`${authInputClass} mb-2 cursor-pointer !bg-white !text-[#1c1c1c] !placeholder-[#1c1c1c]/40 ring-1 ring-[#6d2f98]/40 [&>option]:bg-white [&>option]:text-[#1c1c1c]`}
                >
                  {user.addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.firstName} {a.lastName} — {a.city}
                      {a.id === user.defaultAddressId ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              )}
              <p>{user.username}</p>
              <p>{formatAddress(addr)}</p>
              <p>Philippines</p>
              <p>
                {addr.phone} | {user.email}
              </p>
            </div>
          ) : (
            <p className="mt-3 font-condensed text-lg text-[#1c1c1c]/70">
              Log in to load your delivery details.
            </p>
          )}

          <hr className="mt-4 border-[#3a3a3a]/30" />
          <h3 className="mt-4 font-condensed text-2xl font-bold text-[#1c1c1c]">Payment Method</h3>
          <div className="mt-2 space-y-1.5">
            {PAYMENT_METHODS.map((method) => (
              <label key={method} className="flex cursor-pointer items-center gap-3 font-condensed text-lg text-[#1c1c1c]">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === method}
                  onChange={() => setPayment(method)}
                  className="h-4 w-4 cursor-pointer accent-[#6d2f98] outline-none focus-visible:ring-2 focus-visible:ring-[#15f5ea]"
                />
                {method}
              </label>
            ))}
          </div>

          {payment === "PayPal" && (
            <div className="mt-3 rounded-2xl border-2 border-[#6d2f98] bg-white p-4">
              <AuthField
                label="PayPal Account"
                type="text"
                value={paypalAccount}
                onChange={(value) => setPaypalAccount(sanitizePaypalAccount(value))}
                placeholder="you@example.com"
                inputMode="text"
                autoComplete="username"
                labelClassName="text-[#1c1c1c]"
                inputClassName="!bg-white !text-[#1c1c1c] placeholder-[#1c1c1c]/60 border-2 border-[#d4a5e0] shadow-sm"
              />
            </div>
          )}

          {payment === "Credit/Debit Card" && (
            <div className="mt-3 space-y-3 rounded-2xl border-2 border-[#6d2f98] bg-white p-4">
              <AuthField
                label="Credit/Debit Card Number"
                type="text"
                value={cardNumber}
                onChange={(value) => setCardNumber(sanitizeCardNumber(value))}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                autoComplete="cc-number"
                labelClassName="text-[#1c1c1c]"
                inputClassName="!bg-white !text-[#1c1c1c] placeholder-[#1c1c1c]/60 border-2 border-[#d4a5e0] shadow-sm"
              />
              <AuthField
                label="Full Name"
                type="text"
                value={cardName}
                onChange={(value) => setCardName(sanitizeName(value))}
                placeholder="Juan Dela Cruz"
                inputMode="text"
                autoComplete="cc-name"
                labelClassName="text-[#1c1c1c]"
                inputClassName="!bg-white !text-[#1c1c1c] placeholder-[#1c1c1c]/60 border-2 border-[#d4a5e0] shadow-sm"
              />
              <AuthField
                label="Bank"
                type="text"
                value={cardBank}
                onChange={(value) => setCardBank(sanitizeBank(value))}
                placeholder="Bank Name"
                inputMode="text"
                autoComplete="organization"
                labelClassName="text-[#1c1c1c]"
                inputClassName="!bg-white !text-[#1c1c1c] placeholder-[#1c1c1c]/60 border-2 border-[#d4a5e0] shadow-sm"
              />
            </div>
          )}

          <hr className="mt-4 border-[#3a3a3a]/30" />
          <div className="mt-4 space-y-1">
            <SummaryRow label="Total Items" value={`x${count}`} />
            <SummaryRow label="Rent Period" value={`${periodStart} to ${periodEnd}`} />
          </div>

          <hr className="mt-4 border-[#3a3a3a]/30" />
          <div className="mt-4 space-y-1">
            <SummaryRow label="Subtotal" value={peso(subtotal)} />
            <SummaryRow label="Shipping Fee" value={peso(SHIPPING_FEE)} />
            <SummaryRow label="VAT (12%)" value={peso(vat)} />
          </div>

          <hr className="mt-4 border-[#3a3a3a]/30" />
          <SummaryRow label="Discount" value={peso(0)} />
          <hr className="mt-4 border-[#3a3a3a]/30" />
          <div className="mt-4">
            <SummaryRow label="Total" value={peso(total)} bold />
          </div>
        </div>

        {checkoutError && (
          <p className="mt-4 text-center font-condensed text-base text-[#ff8fa3]">
            {checkoutError}
          </p>
        )}
        {!payment && !checkoutError && (
          <p className="mt-4 text-center font-condensed text-base text-white/80">
            Select a payment method to place your order.
          </p>
        )}
        <PillButton
          variant="gradient"
          size="md"
          className={`mt-4 w-full ${payment && count > 0 ? "" : "pointer-events-none opacity-40"}`}
          onClick={handlePlaceOrder}
        >
          Place Order
        </PillButton>
      </div>
    </div>
  );
}

/* ----------------------- Page ----------------------- */

export default function CartPage({
  onNavigate,
  cart,
  onSetQty,
  onUpdateRow,
  onRemoveItems,
  onAuth,
  loggedIn,
  onLogout,
  highlightId,
  onClearHighlight,
  user,
  onOrderPlaced,
  autoOpenCheckout = false,
  onCheckoutHandled,
  notifications,
  onNotificationsOpened,
  avatarUrl,
}: {
  onNavigate: (id: PageId) => void;
  cart: CartItem[];
  onSetQty: (key: string, qty: number) => void;
  onUpdateRow: (key: string, ends: string[]) => void;
  onRemoveItems: (keys: string[]) => void;
  onAuth: (mode: "login" | "register") => void;
  loggedIn: boolean;
  onLogout: () => void;
  highlightId: string | null;
  onClearHighlight: () => void;
  user: UserProfile | null;
  onOrderPlaced: (orderId: string, lines: string[], total: number) => void;
  autoOpenCheckout?: boolean;
  onCheckoutHandled?: () => void;
  notifications: AppNotification[];
  onNotificationsOpened: () => void;
  avatarUrl?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(cart[0] ? [cartRowKey(cart[0])] : [])
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  /* Simulated payment flow: processing spinner -> success panel. */
  const [payment, setPayment] = useState<
    | null
    | { stage: "processing" }
    | { stage: "done"; orderId: string; lines: string[]; subtotal: number; vat: number; total: number }
  >(null);

  useEffect(() => {
    if (!autoOpenCheckout || cart.length === 0) return;
    const timer = window.setTimeout(() => {
      setSelected(new Set(cart.map((item) => cartRowKey(item))));
      setCheckoutOpen(true);
      setCheckoutError("");
      onCheckoutHandled?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoOpenCheckout, cart, onCheckoutHandled]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const selectedItems = cart.filter((c) => selected.has(cartRowKey(c)));
  const count = selectedItems.reduce((n, c) => n + c.qty, 0);
  const subtotal = selectedItems.reduce((sum, c) => sum + c.game.price * c.qty, 0);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const total = subtotal + SHIPPING_FEE + vat;

  /* Rent period across the selection: starts today, ends at the
     latest end date among the selected rows. */
  const periodStart = displayDate(todayIso());
  const periodEnd = (() => {
    const ends = selectedItems.map((c) => c.end).sort();
    return ends.length ? displayDate(ends[ends.length - 1]) : periodStart;
  })();

  const editingItem = editingKey ? cart.find((c) => cartRowKey(c) === editingKey) ?? null : null;

  const placeOrder = async (paymentMethod: string) => {
    setCheckoutOpen(false);
    if (!loggedIn) {
      /* No account -> the order summary popup is replaced by
         the log in / create account popup. */
      onAuth("login");
      return;
    }

    setPayment({ stage: "processing" });
    // Prove who's ordering — the API verifies this token server-side.
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) {
      setPayment(null);
      setToast("Session expired. Please sign in again.");
      onAuth("login");
      return;
    }
    const [res] = await Promise.all([
      fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          items: selectedItems.map((c) => ({ gameId: c.game.id, qty: c.qty, end: c.end })),
          paymentMethod,
        }),
      }).catch(() => null),
      new Promise((r) => setTimeout(r, 1200)), // let the "processing" beat land
    ]);

    const data = res ? await res.json().catch(() => null) : null;
    if (!res || !res.ok || !data?.order) {
      setPayment(null);
      setToast(data?.error ?? "Payment simulation failed. Try again.");
      return;
    }

    setPayment({
      stage: "done",
      orderId: data.order.orderId,
      lines: selectedItems.map((c) => `${c.game.name} x${c.qty} · until ${displayDate(c.end)}`),
      subtotal: data.order.subtotal,
      vat: data.order.vat,
      total: data.order.total,
    });
  };

  /* Closing the success panel is what commits the order client-side. */
  const finishPayment = () => {
    if (payment?.stage !== "done") return;
    onOrderPlaced(payment.orderId, payment.lines, payment.total);
    onRemoveItems(selectedItems.map(cartRowKey));
    setSelected(new Set());
    setPayment(null);
    setToast("Order placed!");
  };

  return (
    /* Fills the viewport like the homepage — footer pins to the bottom */
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#9a4fc4] via-[#6f74c1] to-[#5fc7c1] font-condensed">
      <Header
        activeId="cart"
        onNavigate={onNavigate}
        cartCount={cart.reduce((n, c) => n + c.qty, 0)}
        onAuth={onAuth}
        loggedIn={loggedIn}
        onLogout={onLogout}
        notifications={notifications}
        onNotificationsOpened={onNotificationsOpened}
        avatarUrl={avatarUrl}
      />

      <main className="mx-auto w-full max-w-[1800px] flex-1 px-3 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32 lg:px-14 lg:pt-40">
        <h1 className="font-condensed text-4xl text-white sm:text-5xl">My Cart</h1>
        <hr className="mt-5 border-white/60" />

        <div className="mt-10 grid gap-6 sm:gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          {/* --- Cart list --- */}
          <section aria-label="Cart items" className="min-w-0 rounded-[28px] bg-white/20 p-4 backdrop-blur-md sm:p-8">
            <h2 className="font-condensed text-2xl text-white sm:text-3xl">My Cart ({cart.length})</h2>
            <hr className="mt-3 border-white/60" />

            <div className="mt-5 max-h-[60vh] overflow-y-auto rounded-2xl bg-[#f3eef8] px-3 py-1 sm:px-8">
              {cart.length > 0 ? (
                <ul>
                  {cart.map((item) => {
                    const key = cartRowKey(item);
                    return (
                      <CartRow
                        key={key}
                        item={item}
                        checked={selected.has(key)}
                        onToggle={() => toggle(key)}
                        onSetQty={(qty) => onSetQty(key, qty)}
                        onEditDates={() => setEditingKey(key)}
                        highlighted={item.game.id === highlightId}
                        onClearHighlight={onClearHighlight}
                      />
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-5 py-14 text-center">
                  <p className="font-condensed text-2xl text-[#3a3a3a]">Your cart is empty.</p>
                  <PillButton variant="gradient" size="sm" onClick={() => onNavigate("products")}>
                    Browse Games
                  </PillButton>
                </div>
              )}
            </div>
          </section>

          {/* --- Order summary --- */}
          <aside aria-label="Order summary" className="min-w-0 rounded-[28px] bg-white/20 p-4 backdrop-blur-md sm:p-8">
            <h2 className="font-condensed text-2xl text-white sm:text-3xl">Order Summary</h2>
            <hr className="mt-3 border-white/60" />

            <div className="mt-5 rounded-2xl bg-[#f3eef8] p-4 sm:p-7">
              <SummaryRow label="Total Items" value={`x${count}`} />
              <hr className="my-4 border-[#3a3a3a]/30" />
              <div className="space-y-1">
                <SummaryRow label="Subtotal" value={peso(subtotal)} />
                <SummaryRow label="Shipping Fee" value={peso(SHIPPING_FEE)} />
                <SummaryRow label="VAT (12%)" value={peso(vat)} />
              </div>
              <hr className="my-4 border-[#3a3a3a]/30" />
              <SummaryRow label="Discount" value={peso(0)} />
              <hr className="my-4 border-[#3a3a3a]/30" />
              <SummaryRow label="Total" value={peso(total)} bold />
            </div>

            <PillButton
              variant="gradient"
              size="md"
              className={`mt-6 w-full ${count === 0 ? "pointer-events-none opacity-40" : ""}`}
              onClick={() => count > 0 && setCheckoutOpen(true)}
            >
              Proceed to Checkout
            </PillButton>
          </aside>
        </div>
      </main>

      <div className="relative h-[3px] bg-gradient-to-r from-[#2dcabd] via-[#15f5ea] to-[#2dcabd] shadow-[0_0_12px_#15f5ea]" />
      <Footer />

      {checkoutOpen && (
        <CheckoutModal
          count={count}
          subtotal={subtotal}
          vat={vat}
          total={total}
          periodStart={periodStart}
          periodEnd={periodEnd}
          user={user}
          onClose={() => setCheckoutOpen(false)}
          onPlaceOrder={placeOrder}
          checkoutError={checkoutError}
          onCheckoutErrorChange={setCheckoutError}
        />
      )}

      {/* Same three-part rent configurator, prefilled with this row's copies.
          Changing one copy's end date splits the row on confirm. */}
      {editingItem && (
        <RentConfigModal
          game={editingItem.game}
          initialCopies={Array.from({ length: editingItem.qty }, () => editingItem.end)}
          onCancel={() => setEditingKey(null)}
          onConfirm={(ends) => {
            const key = editingKey!;
            setEditingKey(null);
            onUpdateRow(key, ends);
            setToast("Rent dates updated!");
          }}
        />
      )}

      {payment && (
        <SimulatedPaymentModal payment={payment} onDone={finishPayment} />
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

/* ----------------------- Simulated payment popup ----------------------- */

function SimulatedPaymentModal({
  payment,
  onDone,
}: {
  payment:
    | { stage: "processing" }
    | { stage: "done"; orderId: string; lines: string[]; subtotal: number; vat: number; total: number };
  onDone: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Payment"
      className="animate-overlayIn fixed inset-0 z-[70] flex items-center justify-center bg-[#200032]/80 p-4 backdrop-blur-md"
    >
      <div className="animate-popIn w-full max-w-md rounded-[28px] bg-[#cfa6e6]/30 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-xl">
        {payment.stage === "processing" ? (
          <>
            <div
              className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/25 border-t-[#15f5ea]"
              aria-hidden="true"
            />
            <h3 className="mt-5 font-condensed text-2xl font-bold text-white">Processing payment…</h3>
            <p className="mt-1 font-condensed text-base text-white/75">
              Contacting the (simulated) payment gateway.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#781ea2] to-[#2dcabd]">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="mt-4 font-condensed text-3xl font-bold text-white">Payment Successful</h3>
            <p className="mt-1 font-condensed text-lg text-white">Order #{payment.orderId}</p>

            {/* The disclaimer the payment sim always shows */}
            <p className="mt-4 rounded-xl border border-[#15f5ea]/50 bg-[#15f5ea]/10 px-4 py-3 font-condensed text-base text-white">
              This is a <span className="font-bold text-[#15f5ea]">SIMULATED</span> payment — no real
              money was charged and no card details were processed.
            </p>

            <ul className="mt-4 space-y-1 text-left">
              {payment.lines.map((line, i) => (
                <li key={i} className="truncate font-condensed text-base text-white/90">
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-0.5 border-t border-white/25 pt-3 text-left font-condensed text-base text-white/90">
              <p className="flex justify-between"><span>Subtotal</span><span>₱{payment.subtotal.toFixed(2)}</span></p>
              <p className="flex justify-between"><span>VAT (12%)</span><span>₱{payment.vat.toFixed(2)}</span></p>
              <p className="flex justify-between font-bold text-white"><span>Total</span><span>₱{payment.total.toFixed(2)}</span></p>
            </div>

            <PillButton variant="gradient" size="md" className="mt-6 w-full" onClick={onDone}>
              Done
            </PillButton>
          </>
        )}
      </div>
    </div>
  );
}
