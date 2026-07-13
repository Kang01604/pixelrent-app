"use client";

import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

/* ============================================================
   PixelRent — shared components (header, footer, buttons, icons)
   Used by Homepage.tsx and BrowseGames.tsx.
   ============================================================ */

export type PageId = "home" | "products" | "cart" | "settings";

type NavItem = { id: PageId; label: string };
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home" },
  { id: "products", label: "Products" },
];

/* ----------------------- Account types ----------------------- */

/** Philippine-localized delivery address (e-commerce style). */
export type Address = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string; // Street Name, Building, House No.
  barangay: string;
  city: string; // City / Municipality
  province: string;
  region: string;
  postal: string; // 4-digit PH ZIP
};

export type UserProfile = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dob: string; // YYYY-MM-DD
  addresses: Address[];
  defaultAddressId: string | null;
  avatarUrl?: string; // data-URL from the profile picture upload
};

export type AppNotification = {
  id: string;
  orderId: string;
  lines: string[];
  total: number;
  time: string;
  read: boolean;
};

export const PH_REGIONS = [
  "NCR – National Capital Region",
  "CAR – Cordillera Administrative Region",
  "Region I – Ilocos Region",
  "Region II – Cagayan Valley",
  "Region III – Central Luzon",
  "Region IV-A – CALABARZON",
  "MIMAROPA Region",
  "Region V – Bicol Region",
  "Region VI – Western Visayas",
  "Region VII – Central Visayas",
  "Region VIII – Eastern Visayas",
  "Region IX – Zamboanga Peninsula",
  "Region X – Northern Mindanao",
  "Region XI – Davao Region",
  "Region XII – SOCCSKSARGEN",
  "Region XIII – Caraga",
  "BARMM – Bangsamoro",
];

export const formatAddress = (a: Address) =>
  `${a.street}, Brgy. ${a.barangay}, ${a.city}, ${a.province}, ${a.region}, ${a.postal}`;

export type SocialLink = { id: string; label: string; href: string };
export const SOCIAL_LINKS: SocialLink[] = [
  { id: "email", label: "Email", href: "mailto:support@pixelrent.test" },
  { id: "facebook", label: "Facebook", href: "#" },
  { id: "instagram", label: "Instagram", href: "#" },
  { id: "twitter", label: "X (Twitter)", href: "#" },
];

/* ----------------------- Icons ----------------------- */

/** Pixel-art gamepad drawn from rects to match the blocky logo mark. */
export function PixelGamepadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 22"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="4" width="28" height="14" />
      <rect x="0" y="6" width="2" height="10" />
      <rect x="30" y="6" width="2" height="10" />
      <rect x="4" y="2" width="8" height="2" />
      <rect x="20" y="2" width="8" height="2" />
      <rect x="4" y="18" width="8" height="2" />
      <rect x="20" y="18" width="8" height="2" />
      <rect x="6" y="9" width="6" height="2" fill="#18091f" />
      <rect x="8" y="7" width="2" height="6" fill="#18091f" />
      <rect x="17" y="9" width="2" height="2" fill="#18091f" />
      <rect x="23" y="9" width="2" height="2" fill="#18091f" />
      <rect x="20" y="12" width="2" height="2" fill="#18091f" />
    </svg>
  );
}

export function CartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1.5" />
      <circle cx="19" cy="21" r="1.5" />
      <path d="M2 3h3l2.7 12.4A2 2 0 0 0 9.65 17H18.4a2 2 0 0 0 1.95-1.57L22 7H6" />
    </svg>
  );
}

export function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2l2.94 6.36 6.96.8-5.16 4.73 1.39 6.86L12 17.27l-6.13 3.48 1.39-6.86L2.1 9.16l6.96-.8L12 2z" />
    </svg>
  );
}

function EmailIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function FacebookIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.78-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.75 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XTwitterIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<
  string,
  (p: { className?: string }) => React.ReactElement
> = {
  email: EmailIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  twitter: XTwitterIcon,
};

/* ----------------------- Brand / nav ----------------------- */

export function BrandLogo({ onClick }: { onClick?: () => void }) {
  return (
    <a
      href="#"
      aria-label="pixelrent — home"
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className="group flex items-center gap-3 rounded-lg px-1 py-1 outline-none transition
                 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95"
    >
      <PixelGamepadIcon
        className="h-7 w-auto text-white transition
                   [filter:drop-shadow(0_0_6px_#b23df2)]
                   group-hover:[filter:drop-shadow(0_0_10px_#15f5ea)]"
      />
      <span
        className="font-pixel text-2xl font-medium lowercase tracking-wide text-white transition
                   [text-shadow:0_0_8px_#b23df2,0_0_2px_#b23df2]
                   group-hover:[text-shadow:0_0_10px_#15f5ea,0_0_2px_#15f5ea] sm:text-[27px]"
      >
        pixelrent
      </span>
    </a>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-4 py-2 font-condensed text-xl tracking-wide outline-none transition sm:text-2xl
        hover:text-[#15f5ea] focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95
        ${active ? "text-[#15f5ea]" : "text-white"}`}
    >
      {item.label}
    </a>
  );
}

/* ----------------------- Buttons ----------------------- */

/** Pill button in the frame's three variants:
    - "gradient": purple->teal fill w/ glow  (Login, Browse Games)
    - "dark":     near-black fill, faint gradient rim (Register)
    - "outline":  translucent dark fill, light border (Reserve a Game)

    Motion (each state is a *different* animation):
    - idle:  gradient slowly drifts (gradientFlow, 4s loop)
    - hover: drift speeds up + neon glow pulses (glowPulse)
    - click: squash-and-pop bounce (btnPress, one-shot)          */
export function PillButton({
  children,
  variant = "gradient",
  size = "md",
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "gradient" | "dark" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    onClick?.();
  };
  const clearClicked = () => setClicked(false);
  const clickedClass = clicked ? "btn-clicked" : "";

  const sizes = {
    sm: "px-7 py-2 text-lg",
    md: "px-8 py-2.5 text-xl",
    lg: "px-9 py-3 text-xl sm:px-11 sm:text-2xl",
  } as const;

  const base = `rounded-full font-condensed tracking-wide outline-none transition
    focus-visible:ring-2 focus-visible:ring-[#15f5ea] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18091f]
    ${sizes[size]}`;

  if (variant === "gradient") {
    return (
      <button
        type="button"
        onClick={handleClick}
        onAnimationEnd={clearClicked}
        className={`${base} gradient-animated bg-gradient-to-r from-[#781ea2] via-[#2dcabd] to-[#781ea2] text-white
          shadow-[0_0_18px_rgba(120,30,162,0.55)]
          hover:-translate-y-0.5 active:translate-y-0
          ${clickedClass} ${className}`}
      >
        {children}
      </button>
    );
  }

  if (variant === "dark") {
    return (
      <button
        type="button"
        onClick={handleClick}
        onAnimationEnd={clearClicked}
        className={`group gradient-animated rounded-full bg-gradient-to-r from-[#781ea2]/70 via-[#2dcabd]/70 to-[#781ea2]/70 p-[1.5px]
          shadow-[0_0_14px_rgba(120,30,162,0.35)] outline-none transition
          focus-visible:ring-2 focus-visible:ring-[#15f5ea] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18091f]
          hover:-translate-y-0.5 active:translate-y-0
          ${clickedClass} ${className}`}
      >
        <span
          className={`block rounded-full bg-[#140a1c] font-condensed tracking-wide text-white transition
            group-hover:bg-[#1e1128] group-active:bg-[#0e0714] ${sizes[size]}`}
        >
          {children}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onAnimationEnd={clearClicked}
      className={`${base} border border-white/50 bg-black/30 text-white backdrop-blur-sm
        hover:border-[#15f5ea] hover:bg-black/50 hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(21,245,234,0.35)]
        active:translate-y-0 active:bg-black/60
        ${clickedClass} ${className}`}
    >
      {children}
    </button>
  );
}

/* ----------------------- Header ----------------------- */

/** Bell + Facebook-style notifications dropdown (sized for the site). */
function NotificationMenu({
  notifications = [],
  onOpened,
}: {
  notifications?: AppNotification[];
  onOpened?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unread > 0) onOpened?.();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-white outline-none transition
                   hover:bg-white/10 hover:text-[#15f5ea]
                   focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-[#ff4d6d] px-1 font-condensed text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="animate-slideUp absolute right-0 top-full z-30 mt-2 w-[19rem] overflow-hidden rounded-xl
                     border border-white/10 bg-[#18091f]/95 shadow-xl shadow-black/50 backdrop-blur sm:w-80"
        >
          <p className="border-b border-white/10 px-4 py-2.5 font-condensed text-lg font-bold text-white">
            Notifications
          </p>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center font-condensed text-base text-white/60">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="border-b border-white/5 px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-condensed text-base font-bold text-[#15f5ea]">
                      Order Placed · #{n.orderId}
                    </p>
                    <span className="shrink-0 font-condensed text-xs text-white/50">
                      {n.time}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {n.lines.map((line, i) => (
                      <li
                        key={i}
                        className="truncate font-condensed text-sm text-white/85"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 font-condensed text-sm font-bold text-white">
                    Total: ₱{n.total.toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Avatar button + dropdown: Settings (opens the account page) and Logout. */
function ProfileMenu({
  onLogout,
  onSettings,
  avatarUrl,
}: {
  onLogout?: () => void;
  onSettings?: () => void;
  avatarUrl?: string;
}) {
  const [open, setOpen] = useState(false);

  /* Close when clicking anywhere outside the menu. */
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  const itemClass = `flex w-full items-center gap-3 px-4 py-2.5 text-left font-condensed text-lg text-white
    outline-none transition hover:bg-white/10 focus-visible:bg-white/10 active:bg-white/5`;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center overflow-hidden rounded-full
                   bg-gradient-to-br from-[#781ea2] to-[#2dcabd] text-white outline-none transition
                   hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <PixelGamepadIcon className="h-5 w-auto" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-slideUp absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl
                     border border-white/10 bg-[#18091f]/95 py-1.5 shadow-xl shadow-black/50 backdrop-blur"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSettings?.();
            }}
            className={itemClass}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </button>
          <div className="mx-3 my-1 h-px bg-white/10" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className={`${itemClass} hover:bg-[#ff4d6d]/15 hover:text-[#ff8fa3]`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({
  activeId,
  onNavigate,
  cartCount = 0,
  onAuth,
  loggedIn = false,
  onLogout,
  notifications,
  onNotificationsOpened,
  avatarUrl,
}: {
  activeId: PageId;
  onNavigate: (id: PageId) => void;
  cartCount?: number;
  onAuth?: (mode: "login" | "register") => void;
  loggedIn?: boolean;
  onLogout?: () => void;
  notifications?: AppNotification[];
  onNotificationsOpened?: () => void;
  avatarUrl?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#d9d9d9]/[0.13] backdrop-blur-md">
      <div className="mx-auto flex h-[80px] max-w-[1800px] items-center px-4 sm:px-8 lg:h-[104px] lg:px-14">
        <BrandLogo onClick={() => onNavigate("home")} />

        <nav
          aria-label="Primary"
          className="ml-6 hidden items-center gap-4 md:flex lg:ml-12 lg:gap-8"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              active={item.id === activeId}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:gap-5 lg:gap-6">
          {/* Bell + notification dropdown — only when logged in */}
          {loggedIn && (
            <NotificationMenu
              notifications={notifications}
              onOpened={onNotificationsOpened}
            />
          )}

          {/* Cart — opens the My Cart page; badge shows item count */}
          <button
            type="button"
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            onClick={() => onNavigate("cart")}
            className={`relative flex h-11 w-11 items-center justify-center rounded-lg outline-none transition
                       hover:bg-white/10 hover:text-[#15f5ea]
                       focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90
                       ${loggedIn ? "text-white" : activeId === "cart" ? "text-[#15f5ea]" : "text-white"}`}
          >
            <CartIcon className="h-7 w-7" />
            {cartCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full
                           bg-[#15f5ea] px-1 font-condensed text-xs font-bold text-white"
              >
                {cartCount}
              </span>
            )}
          </button>

          {loggedIn ? (
            /* Profile avatar + dropdown (Settings is a stub; Logout logs out) */
            <ProfileMenu
              onLogout={onLogout}
              onSettings={() => onNavigate("settings")}
              avatarUrl={avatarUrl}
            />
          ) : (
            <div className="hidden items-center gap-4 sm:flex">
              <PillButton
                variant="dark"
                size="sm"
                onClick={() => onAuth?.("register")}
              >
                Register
              </PillButton>
              <PillButton
                variant="gradient"
                size="sm"
                onClick={() => onAuth?.("login")}
              >
                Login
              </PillButton>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center rounded-lg text-white outline-none transition
                       hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90 md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Primary mobile"
          className="border-t border-white/10 bg-[#18091f]/95 px-4 py-4 backdrop-blur md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                active={item.id === activeId}
                onClick={() => {
                  onNavigate(item.id);
                  setMenuOpen(false);
                }}
              />
            ))}
          </div>
          {!loggedIn && (
            <div className="mt-4 flex gap-3 sm:hidden">
              <PillButton
                variant="dark"
                size="sm"
                className="flex-1"
                onClick={() => onAuth?.("register")}
              >
                Register
              </PillButton>
              <PillButton
                variant="gradient"
                size="sm"
                className="flex-1"
                onClick={() => onAuth?.("login")}
              >
                Login
              </PillButton>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}

/* ----------------------- Footer ----------------------- */

function SocialButton({ link }: { link: SocialLink }) {
  const Icon = SOCIAL_ICONS[link.id];
  return (
    <a
      href={link.href}
      aria-label={link.label}
      className="grid h-11 w-11 place-items-center rounded-lg text-[#8b2fc9] outline-none transition
                 hover:-translate-y-0.5 hover:text-[#b23df2] hover:[filter:drop-shadow(0_0_8px_#b23df2)]
                 focus-visible:ring-2 focus-visible:ring-[#15f5ea]
                 active:translate-y-0 active:scale-90"
    >
      {Icon ? <Icon className="h-7 w-7" /> : null}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-[#18091f] to-[#291931]">
      <div className="mx-auto flex max-w-[1800px] flex-col items-center gap-3 px-4 pb-8 pt-9 sm:px-8">
        <div className="flex items-center gap-5">
          {SOCIAL_LINKS.map((link) => (
            <SocialButton key={link.id} link={link} />
          ))}
        </div>

        <p className="flex flex-wrap items-baseline justify-center gap-x-1.5 font-condensed text-base text-white">
          <span>© 2025</span>
          <a
            href="#"
            className="rounded font-pixel lowercase text-[#b23df2] outline-none transition
                       [text-shadow:0_0_6px_rgba(178,61,242,0.7)]
                       hover:text-[#15f5ea] hover:[text-shadow:0_0_8px_rgba(21,245,234,0.7)]
                       focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95"
          >
            pixelrent
          </a>
          <span>. All rights reserved</span>
        </p>
      </div>
    </footer>
  );
}

/* ----------------------- Auth (login / register) ----------------------- */

type AuthMode = "login" | "register";

function EyeIcon({
  open,
  className = "",
}: {
  open: boolean;
  className?: string;
}) {
  return open ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22" />
    </svg>
  );
}

export const authInputClass = `w-full rounded-xl bg-white/15 px-4 py-2.5 font-condensed text-lg text-white
  placeholder-white/40 outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-[#15f5ea]`;

/** Text/password/date field in the site's glass style. Password fields
    hide input as dots and get an eye toggle to reveal them. */
export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  maxLength,
  error,
  inputClassName,
  labelClassName,
  inputMode,
  autoComplete,
}: {
  label: string;
  type?: "text" | "email" | "password" | "date" | "tel";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  inputClassName?: string;
  labelClassName?: string;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "tel" | "search" | "url";
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block text-left">
      <span className={`font-condensed text-lg ${labelClassName ?? "text-white"}`}>{label}</span>
      <div className="relative mt-1.5">
        <input
          type={isPassword && !show ? "password" : isPassword ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`${authInputClass} ${inputClassName ?? ""} ${isPassword ? "pr-12" : ""} ${type === "date" ? "[color-scheme:dark]" : ""}
            ${error ? "ring-2 ring-[#ff8fa3]" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/70 outline-none
                       transition hover:text-[#15f5ea] focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90"
          >
            <EyeIcon open={show} className="h-5 w-5" />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 font-condensed text-sm text-[#ff8fa3]">{error}</p>
      )}
    </label>
  );
}

export function AuthSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block text-left">
      <span className="font-condensed text-lg text-white">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`${authInputClass} mt-1.5 cursor-pointer appearance-none [&>option]:bg-[#2a1440] [&>option]:text-white
          ${error ? "ring-2 ring-[#ff8fa3]" : ""}`}
      >
        <option value="" disabled>
          {placeholder ?? "Select..."}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 font-condensed text-sm text-[#ff8fa3]">{error}</p>
      )}
    </label>
  );
}

/** Blank Philippine address (for new-address forms). */
export const emptyAddress = (): Address => ({
  id: `addr-${Math.random().toString(36).slice(2, 8)}`,
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  region: "",
  postal: "",
});

/** Fully localized PH address form fields (e-commerce style):
    street/building/house no., barangay, city/municipality, province,
    region (the 17 PH regions), 4-digit postal code. */
export function PhAddressFields({
  value,
  onChange,
  withContact = true,
  errors = {},
}: {
  value: Address;
  onChange: (a: Address) => void;
  withContact?: boolean;
  errors?: Record<string, string>;
}) {
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      {withContact && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField
              label="First Name"
              value={value.firstName}
              onChange={(v) => set({ firstName: v })}
              placeholder="Juan"
              error={errors.firstName}
            />
            <AuthField
              label="Last Name"
              value={value.lastName}
              onChange={(v) => set({ lastName: v })}
              placeholder="Dela Cruz"
              error={errors.lastName}
            />
          </div>
          <AuthField
            label="Contact Number"
            type="tel"
            value={value.phone}
            onChange={(v) => set({ phone: v.replace(/[^0-9+]/g, "") })}
            placeholder="09XX XXX XXXX"
            maxLength={13}
            error={errors.phone}
          />
        </>
      )}

      <AuthField
        label="Street Name, Building, House No."
        value={value.street}
        onChange={(v) => set({ street: v })}
        placeholder="123 Rizal St., Unit 4B"
        error={errors.street}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          label="Barangay"
          value={value.barangay}
          onChange={(v) => set({ barangay: v })}
          placeholder="Brgy. San Isidro"
          error={errors.barangay}
        />
        <AuthField
          label="City / Municipality"
          value={value.city}
          onChange={(v) => set({ city: v })}
          placeholder="Antipolo City"
          error={errors.city}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          label="Province"
          value={value.province}
          onChange={(v) => set({ province: v })}
          placeholder="Rizal"
          error={errors.province}
        />
        <AuthField
          label="Postal Code"
          value={value.postal}
          onChange={(v) => set({ postal: v.replace(/\D/g, "").slice(0, 4) })}
          placeholder="1870"
          maxLength={4}
          error={errors.postal}
        />
      </div>
      <AuthSelect
        label="Region"
        value={value.region}
        onChange={(v) => set({ region: v })}
        options={PH_REGIONS}
        placeholder="Select region"
        error={errors.region}
      />
    </div>
  );
}

/** Login / Register popup. Mock auth: Log In accepts any details.
    Register asks for the FULL profile — account, personal info, and a
    PH-localized default delivery address. */
export function AuthModal({
  mode: initialMode,
  onClose,
  onLogin,
}: {
  mode: AuthMode;
  onClose: () => void;
  onLogin: (profile: UserProfile) => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  /* Register is a two-parter: 1) account credentials, 2) set up the
     profile (personal info + default delivery address). */
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const EMAIL_RE = /^[^\s@]+@gmail.com|yahoo\.com|outlook\.com$/i;
  const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /* Step 1 -> Step 2. Fields must be properly filled (valid email
     format, username 3–16 chars, password ≥ 8), AND the email and
     username must not already be taken — otherwise a duplicate would
     only surface after the user fills out all of step 2. */
  const continueStep = async () => {
    if (busy) return;
    const e: Record<string, string> = {};
    if (!USERNAME_RE.test(username))
      e.username = "3–16 letters, numbers, or underscores.";
    if (!EMAIL_RE.test(email)) e.email = "Invalid email";
    if (password.length < 8) e.password = "At least 8 characters.";
    if (password !== confirm) e.confirm = "Passwords don't match.";
    setErrors(e);
    setError("");
    if (Object.keys(e).length > 0) return;

    // Block duplicate email/username here, before showing step 2.
    setBusy(true);
    try {
      const res = await fetch(
        `/api/auth/check-availability?email=${encodeURIComponent(email.trim())}&username=${encodeURIComponent(username.trim())}`,
      );
      const data = await res.json().catch(() => null);
      const taken: Record<string, string> = {};
      if (data?.emailTaken) taken.email = "This email is already registered.";
      if (data?.usernameTaken) taken.username = "This username is already taken.";
      if (Object.keys(taken).length > 0) {
        setErrors(taken);
        return;
      }
      setStep(2);
    } catch {
      // If the check itself fails, let them proceed — the final
      // Create Account step still catches a duplicate email as a fallback.
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!firstName) e.firstName = "Required.";
    if (!lastName) e.lastName = "Required.";
    if (!/^[0-9+]{10,13}$/.test(phone)) e.phone = "Enter a valid phone number.";
    if (!gender) e.gender = "Select a gender.";
    if (!dob) e.dob = "Required.";
    if (!address.street) e.street = "Required.";
    if (!address.barangay) e.barangay = "Required.";
    if (!address.city) e.city = "Required.";
    if (!address.province) e.province = "Required.";
    if (!address.region) e.region = "Select a region.";
    if (!/^\d{4}$/.test(address.postal)) e.postal = "4-digit postal code.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* Auth is REAL — Firebase Authentication (email/password) plus a
     Firestore `users/{uid}` profile document. The session persists
     across refreshes automatically. */
  const submit = async () => {
    setError("");
    if (busy) return;
    try {
      if (mode === "login") {
        const e: Record<string, string> = {};
        if (!EMAIL_RE.test(email)) e.email = "Invalid email";
        if (!password) e.password = "Invalid password";
        setErrors(e);
        if (Object.keys(e).length > 0) return;
        setBusy(true);

        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        const profile = snap.exists()
          ? (snap.data() as UserProfile)
          : // Fallback for accounts created outside the app.
            {
              username: email.split("@")[0],
              firstName: "",
              lastName: "",
              email: cred.user.email ?? email,
              phone: "",
              gender: "",
              dob: "",
              addresses: [],
              defaultAddressId: null,
              avatarUrl: "",
            };
        onLogin(profile);
        onClose();
        return;
      }

      if (!validateStep2()) return;
      setBusy(true);
      const addr: Address = { ...address, firstName, lastName, phone };

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const profile: UserProfile = {
        username,
        firstName,
        lastName,
        email: email.trim(),
        phone,
        gender,
        dob,
        addresses: [addr],
        defaultAddressId: addr.id,
        avatarUrl: "",
      };
      await setDoc(doc(db, "users", cred.user.uid), profile);

      onLogin(profile);
      onClose();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setStep(1);
        setErrors({ email: "This email is already registered." });
      } else if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setErrors({ password: "Incorrect email or password." });
      } else if (code === "auth/user-not-found") {
        setErrors({ email: "No account found for that email." });
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (code === "auth/weak-password") {
        setErrors({ password: "Password must be at least 8 characters." });
        setError("Please fix the highlighted fields.");
      } else {
        setError("Something went wrong. Check your connection and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setStep(1);
    setError("");
    setErrors({});
    setConfirm("");
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Log in" : "Create an account"}
      className="animate-overlayIn fixed inset-0 z-[60] flex items-start justify-center
                 overflow-y-auto bg-[#200032]/80 p-4 backdrop-blur-md sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-popIn relative my-auto w-full rounded-[32px] bg-[#cfa6e6]/30 p-7 text-center
                   shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-9
                   ${mode === "register" && step === 2 ? "max-w-xl" : "max-w-md"}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white
                     outline-none transition hover:rotate-90 hover:bg-white/25
                     focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <PixelGamepadIcon className="mx-auto h-10 w-auto text-white [filter:drop-shadow(0_0_8px_#b23df2)]" />
        <h2 className="mt-5 font-condensed text-3xl font-bold text-white sm:text-4xl">
          {mode === "login"
            ? "Log In"
            : step === 1
              ? "Create an Account"
              : "Set Up Your Account"}
        </h2>
        {mode === "register" && (
          <p className="mt-1 font-condensed text-sm text-white/70">
            Step {step} of 2
          </p>
        )}

        {mode === "login" ? (
          <div className="mt-7 space-y-4">
            <AuthField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              error={errors.email}
            />
            <AuthField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              error={errors.password}
            />
          </div>
        ) : step === 1 ? (
          /* --- Register, part 1: account credentials --- */
          <div className="mt-7 space-y-4">
            <AuthField
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="Gamer1234"
              maxLength={16}
              error={errors.username}
            />
            <AuthField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              error={errors.email}
            />
            <AuthField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              error={errors.password}
            />
            <AuthField
              label="Confirm Password"
              type="password"
              value={confirm}
              onChange={setConfirm}
              placeholder="••••••••"
              error={errors.confirm}
            />
          </div>
        ) : (
          /* --- Register, part 2: set up the account --- */
          <div className="mt-7 space-y-4">
            <p className="border-b border-white/25 pb-1 text-left font-condensed text-xl font-bold text-white">
              Personal Information
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                placeholder="Juan"
                error={errors.firstName}
              />
              <AuthField
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                placeholder="Dela Cruz"
                error={errors.lastName}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(v) => setPhone(v.replace(/[^0-9+]/g, ""))}
                placeholder="09XX XXX XXXX"
                maxLength={13}
                error={errors.phone}
              />
              <AuthSelect
                label="Gender"
                value={gender}
                onChange={setGender}
                options={["Male", "Female", "Prefer not to say"]}
                placeholder="Select gender"
                error={errors.gender}
              />
            </div>
            <AuthField
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={setDob}
              error={errors.dob}
            />

            <p className="border-b border-white/25 pb-1 pt-2 text-left font-condensed text-xl font-bold text-white">
              Default Delivery Address
            </p>
            <PhAddressFields
              value={address}
              onChange={setAddress}
              withContact={false}
              errors={errors}
            />
          </div>
        )}

        {error && (
          <p className="mt-3 font-condensed text-base text-[#ff8fa3]">
            {error}
          </p>
        )}

        {mode === "login" ? (
          <PillButton
            variant="gradient"
            size="md"
            className="mt-7 w-full"
            onClick={submit}
          >
            {busy ? "Logging in…" : "Log In"}
          </PillButton>
        ) : step === 1 ? (
          <PillButton
            variant="gradient"
            size="md"
            className="mt-7 w-full"
            onClick={continueStep}
          >
            Continue
          </PillButton>
        ) : (
          <div className="mt-7 flex gap-3">
            <PillButton
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Back
            </PillButton>
            <PillButton
              variant="gradient"
              size="md"
              className="flex-1"
              onClick={submit}
            >
              {busy ? "Creating…" : "Create Account"}
            </PillButton>
          </div>
        )}

        <p className="mt-5 font-condensed text-base text-white/85">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="rounded text-[#15f5ea] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#15f5ea]"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="rounded text-[#15f5ea] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#15f5ea]"
              >
                Log In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ----------------------- Toast ----------------------- */

/** Small fading confirmation popup (e.g. "Item added to cart!").
    Fades itself out and calls onDone when the animation ends. */
export function Toast({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  return (
    <div
      role="status"
      onAnimationEnd={onDone}
      className="animate-toast fixed bottom-10 left-1/2 z-[70] flex items-center gap-2 rounded-full
                 bg-[#18091f]/90 px-6 py-3 font-condensed text-lg text-white shadow-lg
                 shadow-black/40 backdrop-blur"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#781ea2] to-[#2dcabd]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      {message}
    </div>
  );
}

/* ----------------------- Rental date helpers ----------------------- */

export const DEFAULT_RENT_DAYS = 6;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Local-timezone ISO date (YYYY-MM-DD) — safe for string comparison. */
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Rentals always start "today" — recomputed at render time, so an
    item added yesterday but not checked out starts today instead. */
export const todayIso = () => toIso(new Date());

export const addDaysIso = (days: number, from: Date = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toIso(d);
};

export const defaultEndIso = () => addDaysIso(DEFAULT_RENT_DAYS);

/** YYYY-MM-DD -> MM-DD-YYYY for display. */
export const displayDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
};
