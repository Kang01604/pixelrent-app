"use client";

import { useEffect, useState } from "react";
import type { Game, Platform } from "../../lib/catalog";
import {
  Header,
  Footer,
  PillButton,
  StarIcon,
  CartIcon,
  Toast,
  PageId,
  AppNotification,
  toIso,
  todayIso,
  defaultEndIso,
  displayDate,
} from "./shared";

export type { Game } from "../../lib/catalog";

/* ============================================================
   PixelRent — BrowseGames (1:1 with the provided screenshots)

   - Hero band: "Browse Games" title, search bar, Filter toggle
     -> Sort by panel (Latest / Top Sales / Price dropdown)
   - 4 sections (PlayStation / XBOX / PC / Nintendo Switch),
     6 games each, 4 visible -> «/» arrows slide the row
   - Clicking a card opens the Game Info popup over a darkened,
     blurred overlay. X or clicking the overlay closes it.
   ============================================================ */

/* ----------------------- Mock data ----------------------- */
/* Swap these for backend data later. Cover art is intentionally
   left blank (coverUrl: "") — drop image URLs in later. */

/* The catalog now lives server-side (lib/catalog.ts) and is fetched
   from GET /api/games so Items Left reflects the simulated stock. */

/* One cart row = one (game, end date) pair. Copies of the same game
   with the same dates merge into one row; different end dates split.
   Start date is always "today" (computed at render, never stored). */
export type CartItem = { game: Game; qty: number; end: string };

export const cartRowKey = (c: CartItem) => `${c.game.id}|${c.end}`;

type Section = {
  id: string;
  title: string;
  theme: "light" | "purple";
  align: "left" | "right";
  platform: Platform;
};

const SECTIONS: Section[] = [
  {
    id: "ps",
    title: "PlayStation Games",
    theme: "light",
    align: "right",
    platform: "PS5",
  },
  {
    id: "xbox",
    title: "XBOX Games",
    theme: "purple",
    align: "right",
    platform: "XBOX",
  },
  {
    id: "pc",
    title: "PC Games",
    theme: "light",
    align: "left",
    platform: "PC",
  },
  {
    id: "switch",
    title: "Nintendo Switch Games",
    theme: "purple",
    align: "left",
    platform: "SWITCH",
  },
];

export type Review = {
  user: string;
  stars: number;
  line1: string;
  line2: string;
};

type SortMode = "latest" | "topSales" | "priceAsc" | "priceDesc";

/* ----------------------- Small pieces ----------------------- */

/** Dark chip holding the platform logo (used in the game info popup). */
function PlatformChip({
  platform,
  className = "",
}: {
  platform: Platform;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-black/75 px-3 py-1.5 text-white ${className}`}
    >
      <PlatformLogo platform={platform} className="h-5 w-auto" />
    </span>
  );
}

/** Platform logo SVGs, drawn inline (simplified marks). */
function PlatformLogo({
  platform,
  className = "",
}: {
  platform: Platform;
  className?: string;
}) {
  if (platform === "PS5") {
    return (
      <svg
        viewBox="0 0 44 16"
        className={className}
        aria-label="PlayStation 5"
        role="img"
      >
        <text
          x="0"
          y="13.5"
          fontFamily="Antonio, 'Arial Narrow', Arial, sans-serif"
          fontStyle="italic"
          fontWeight="800"
          fontSize="15"
          letterSpacing="0.5"
          fill="currentColor"
        >
          PS5
        </text>
      </svg>
    );
  }
  if (platform === "XBOX") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        aria-label="Xbox"
        role="img"
        fill="currentColor"
      >
        <path d="M4.102 21.033A11.947 11.947 0 0 0 12 24a11.96 11.96 0 0 0 7.902-2.967c1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912A11.942 11.942 0 0 0 24 12.004a11.95 11.95 0 0 0-3.57-8.536s-.027-.022-.082-.042a.847.847 0 0 0-.281-.045c-.592 0-1.985.434-4.805 3.246zM3.654 3.426c-.057.02-.082.041-.086.042A11.956 11.956 0 0 0 0 12.004c0 2.854.998 5.473 2.661 7.533-1.401-2.605 3.579-9.951 6.08-12.91-2.82-2.813-4.216-3.245-4.806-3.245a.799.799 0 0 0-.281.044zm8.34 2.396S9.847 3.905 8.359 3.34c-.121-.045-.42-.051-.599.05 1.63-1.139 3.56-1.9 5.796-1.9h.014c2.229 0 4.174.76 5.805 1.899-.18-.1-.474-.095-.596-.05-1.49.567-3.64 2.483-3.64 2.483z" />
      </svg>
    );
  }
  if (platform === "PC") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        aria-label="PC"
        role="img"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="13" rx="2" />
        <path d="M8.5 21h7M12 16v5" />
      </svg>
    );
  }
  // SWITCH — a pair of joy-cons
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-label="Nintendo Switch"
      role="img"
      fill="currentColor"
    >
      <path d="M10.5 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h3.5V2zM7 4.4h1.2v15.2H7A2.6 2.6 0 0 1 4.4 17V7A2.6 2.6 0 0 1 7 4.4z" />
      <circle cx="6.6" cy="8.2" r="1.7" />
      <path d="M13.5 2H17a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5h-3.5V2z" />
      <circle cx="17.4" cy="14.6" r="1.7" fill="#734d9d" />
    </svg>
  );
}

/** Blank cover-art slot (design has real key art; URLs get dropped in later).
    The platform logo sits in the bottom-left corner of the cover, per the frame. */
export function CoverSlot({
  game,
  className = "",
  logo = false,
}: {
  game: Game;
  className?: string;
  logo?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black/35 shadow-[-6px_12px_20px_rgba(14,12,85,0.16)] ${className}`}
    >
      {game.coverUrl && !imgFailed ? (
        <img
          src={game.coverUrl}
          alt={game.name}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          {/* image slot — intentionally blank */}
          <svg
            viewBox="0 0 32 22"
            className="h-10 w-14 text-white/15"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="2" y="4" width="28" height="14" />
            <rect x="0" y="6" width="2" height="10" />
            <rect x="30" y="6" width="2" height="10" />
          </svg>
        </div>
      )}

      {logo && (
        <PlatformLogo
          platform={game.platform}
          className="absolute bottom-3 left-3 h-6 w-auto text-white [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.7))]"
        />
      )}
    </div>
  );
}

/** Game card — gradient tile from the frame; opens the info popup. */
function GameCard({
  game,
  onOpen,
}: {
  game: Game;
  onOpen: (game: Game) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(game)}
      aria-label={`View ${game.name}`}
      className="group flex h-full w-full flex-col rounded-[34px] p-6 text-left outline-none transition
                 duration-300 shadow-[-10px_18px_30px_rgba(117,30,130,0.18)]
                 hover:-translate-y-2 hover:shadow-[-12px_26px_44px_rgba(117,30,130,0.3)]
                 focus-visible:ring-4 focus-visible:ring-[#15f5ea] active:translate-y-0 active:scale-[0.98]"
      style={{
        backgroundImage: `linear-gradient(to bottom, ${game.gradient.from}, ${game.gradient.to})`,
      }}
    >
      <CoverSlot
        game={game}
        logo
        className="aspect-square w-full transition group-hover:brightness-110"
      />

      <p className="mt-5 min-h-[3.5rem] text-center font-condensed text-2xl font-bold leading-tight text-white">
        {game.name}
      </p>

      <div className="mt-auto flex items-end justify-between pt-3">
        <span className="font-condensed text-xl font-thin text-white">
          ₱{game.price.toFixed(2)}
        </span>
        <span className="flex items-center gap-1.5 font-condensed text-lg font-light text-white">
          <StarIcon className="h-5 w-5" />
          {game.rating.toFixed(1)}
        </span>
      </div>
    </button>
  );
}

/** « / » chevron for the carousels. */
function CarouselArrow({
  dir,
  onClick,
  disabled,
  theme,
}: {
  dir: "left" | "right";
  onClick: () => void;
  disabled: boolean;
  theme: "light" | "purple";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Previous games" : "Next games"}
      className={`select-none rounded-xl px-2 py-1 font-display text-5xl leading-none outline-none transition sm:text-6xl
        focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90
        ${theme === "light" ? "text-[#4b2a7b]" : "text-[#e9ddfa]"}
        ${
          disabled
            ? "cursor-default opacity-30"
            : "hover:scale-110 hover:[text-shadow:0_0_14px_#b23df2]"
        }`}
    >
      {dir === "left" ? "«" : "»"}
    </button>
  );
}

/** Tracks how many cards fit at the current viewport width. */
function useVisibleCount() {
  const calc = () =>
    window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 4;
  const [visible, setVisible] = useState(calc);
  useEffect(() => {
    const onResize = () => setVisible(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return visible;
}

/** Sliding selection-screen carousel: » slides the row toward the next
    games, « slides back — the track translates with a smooth ease. */
function GameCarousel({
  games,
  theme,
  onOpen,
}: {
  games: Game[];
  theme: "light" | "purple";
  onOpen: (game: Game) => void;
}) {
  const visible = useVisibleCount();
  const [index, setIndex] = useState(0);
  const maxIndex = Math.max(0, games.length - visible);
  const clamped = Math.min(index, maxIndex);

  return (
    <div className="flex items-center gap-3 sm:gap-6 lg:gap-8">
      <CarouselArrow
        dir="left"
        theme={theme}
        disabled={clamped === 0}
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
      />

      <div className="flex-1 overflow-hidden py-5">
        <div
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${clamped * (100 / visible)}%)` }}
        >
          {games.map((game) => (
            <div
              key={game.id}
              className="shrink-0 px-3 sm:px-4 lg:px-5"
              style={{ flexBasis: `${100 / visible}%` }}
            >
              <GameCard game={game} onOpen={onOpen} />
            </div>
          ))}
        </div>
      </div>

      <CarouselArrow
        dir="right"
        theme={theme}
        disabled={clamped === maxIndex}
        onClick={() => setIndex((i) => Math.min(maxIndex, i + 1))}
      />
    </div>
  );
}

/** Decorative dot cluster from the frame. */
function DotCluster({
  count = 3,
  variant = "purple",
  className = "",
}: {
  count?: number;
  variant?: "purple" | "cyan";
  className?: string;
}) {
  const fill =
    variant === "purple"
      ? "bg-gradient-to-br from-[#781ea2] to-[#2dcabd]"
      : "bg-gradient-to-br from-[#15f5ea] to-[#57c7e8]";
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`h-3.5 w-3.5 rounded-full ${fill}`} />
      ))}
    </div>
  );
}

/** Gradient accent bar from the frame. */
function AccentBar({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-3.5 rounded-full bg-gradient-to-r from-[#2dcabd] to-[#781ea2] ${className}`}
    />
  );
}

/* ----------------------- Filter ----------------------- */

function SortPill({
  label,
  active,
  onClick,
  chevron,
  open,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  chevron?: boolean;
  open?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full px-6 py-1.5 font-condensed text-lg text-white outline-none transition
        focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95
        ${
          active
            ? "bg-[#6d2f98] shadow-[0_0_12px_rgba(120,30,162,0.6)] hover:bg-[#7d3ba9]"
            : "bg-[#1c0d26]/70 hover:bg-[#2a1438]"
        }`}
    >
      {label}
      {chevron && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      )}
    </button>
  );
}

function FilterPanel({
  sort,
  onSort,
}: {
  sort: SortMode;
  onSort: (s: SortMode) => void;
}) {
  const [priceOpen, setPriceOpen] = useState(false);

  return (
    <div className="animate-slideUp mt-4 w-full max-w-[560px] rounded-2xl bg-[#d9d9d9]/10 p-4 backdrop-blur-md sm:p-5">
      <p className="font-condensed text-lg text-white">Sort by</p>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <SortPill
          label="Latest"
          active={sort === "latest"}
          onClick={() => {
            onSort("latest");
            setPriceOpen(false);
          }}
        />
        <SortPill
          label="Top Sales"
          active={sort === "topSales"}
          onClick={() => {
            onSort("topSales");
            setPriceOpen(false);
          }}
        />

        <div className="relative">
          <SortPill
            label="Price"
            chevron
            open={priceOpen}
            active={sort === "priceAsc" || sort === "priceDesc"}
            onClick={() => setPriceOpen((v) => !v)}
          />
          {priceOpen && (
            <div className="animate-slideUp absolute left-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-lg bg-[#6d2f98] shadow-xl shadow-black/40">
              {(
                [
                  ["priceAsc", "Low to High"],
                  ["priceDesc", "High to Low"],
                ] as [SortMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    onSort(mode);
                    setPriceOpen(false);
                  }}
                  className={`block w-full px-4 py-1.5 text-left font-condensed text-sm text-white outline-none transition
                    hover:bg-[#571f7e] focus-visible:bg-[#571f7e] active:bg-[#46195f]
                    ${sort === mode ? "bg-[#571f7e]" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Game info popup ----------------------- */

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="flex gap-4 border-b border-white/15 px-4 py-3">
      {/* avatar slot — intentionally blank */}
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 font-condensed text-lg text-white/60">
        {review.user[0]}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="flex-1 truncate text-lg text-white">{review.user}</p>
          <span
            className="flex text-[#f5c518]"
            aria-label={`${review.stars} stars`}
          >
            {Array.from({ length: review.stars }, (_, i) => (
              <StarIcon key={i} className="h-3.5 w-3.5" />
            ))}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-[#f2f2f2]/90">
          {review.line1}
        </p>
        <p className="truncate text-sm text-[#f2f2f2]/70">{review.line2}</p>
      </div>
    </li>
  );
}

/* ----------------------- Rent configurator ----------------------- */

/** Month calendar for picking a copy's rental END date.
    The rental always starts today; past days and today are disabled. */
function RentCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [view, setView] = useState(() => {
    const v = new Date(value);
    return new Date(v.getFullYear(), v.getMonth(), 1);
  });

  /* Jump the view to the selected copy's month when switching copies. */
  useEffect(() => {
    const v = new Date(value);
    setView(new Date(v.getFullYear(), v.getMonth(), 1));
  }, [value]);

  const monthLabel = view.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const firstDow = view.getDay();
  const daysInMonth = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0,
  ).getDate();
  const canPrev = view > new Date(today.getFullYear(), today.getMonth(), 1);

  const navBtn = `grid h-9 w-9 place-items-center rounded-lg text-white outline-none transition
    hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90
    disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent`;

  return (
    <div className="flex h-full flex-col rounded-2xl bg-black/25 p-4 sm:p-5">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))
          }
          disabled={!canPrev}
          aria-label="Previous month"
          className={navBtn}
        >
          ‹
        </button>
        <p className="font-condensed text-xl font-bold text-white">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() =>
            setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))
          }
          aria-label="Next month"
          className={navBtn}
        >
          ›
        </button>
      </div>

      <p className="mt-1 text-center font-condensed text-sm text-white/60">
        Rental starts today · {displayDate(todayIso())}
      </p>

      {/* Weekday row */}
      <div className="mt-3 grid grid-cols-7 text-center font-condensed text-sm text-white/50">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="mt-1 grid flex-1 grid-cols-7 gap-1">
        {Array.from({ length: firstDow }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(view.getFullYear(), view.getMonth(), day);
          const iso = toIso(date);
          const disabled = date <= today; // end date must be after today
          const isToday = iso === toIso(today);
          const isSelected = iso === value;
          const inRange = !disabled && iso < value; // shade the rental span

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              aria-label={`End rent on ${displayDate(iso)}`}
              aria-pressed={isSelected}
              className={`mx-auto grid h-9 w-9 place-items-center rounded-lg font-condensed text-base outline-none transition
                focus-visible:ring-2 focus-visible:ring-[#15f5ea]
                ${disabled ? "cursor-default text-white/25" : "text-white hover:bg-white/15 active:scale-90"}
                ${isToday ? "ring-1 ring-[#15f5ea]" : ""}
                ${inRange ? "bg-[#781ea2]/30" : ""}
                ${isSelected ? "bg-gradient-to-br from-[#781ea2] to-[#2dcabd] font-bold shadow-[0_0_12px_rgba(45,202,189,0.5)]" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Rent configurator popup — three parts, per the sketch:
    1. "How many copies" stepper (same «/» logic)
    2. One clickable row per copy (scrollable, Confirm/Cancel pinned below)
    3. Calendar to set the selected copy's end date
    Cancel closes only this popup — the game info popup stays open. */
export function RentConfigModal({
  game,
  initialCopies,
  onConfirm,
  onCancel,
}: {
  game: Game;
  initialCopies?: string[];
  onConfirm: (ends: string[]) => void;
  onCancel: () => void;
}) {
  const [copies, setCopies] = useState<string[]>(
    initialCopies && initialCopies.length > 0
      ? [...initialCopies]
      : [defaultEndIso()],
  );
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const qty = copies.length;
  const dec = () => {
    if (qty <= 1) return;
    setCopies((c) => c.slice(0, -1));
    setSelectedIdx((i) => Math.min(i, qty - 2));
  };
  const inc = () => {
    if (qty >= game.itemsLeft) return;
    setCopies((c) => [...c, defaultEndIso()]);
  };

  const arrowClass = `select-none rounded-xl px-2 py-0.5 font-display text-4xl leading-none text-white outline-none
    transition hover:scale-110 hover:[text-shadow:0_0_14px_#15f5ea]
    focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90
    disabled:cursor-default disabled:opacity-30 disabled:hover:scale-100 disabled:hover:[text-shadow:none]`;

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Configure rent for ${game.name}`}
      className="animate-overlayIn fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto
                 bg-[#200032]/60 p-4 backdrop-blur-sm sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-popIn my-auto w-full max-w-4xl rounded-[32px] bg-[#cfa6e6]/30 p-6
                   shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8"
      >
        <div className="grid gap-6 sm:grid-cols-[270px_1fr]">
          {/* --- Left: copies + confirm/cancel --- */}
          <div className="flex flex-col">
            <h3 className="text-center font-condensed text-2xl font-bold text-white sm:text-3xl">
              How many copies?
            </h3>
            <p className="mt-0.5 truncate text-center font-condensed text-base text-white/80">
              {game.name}
            </p>

            <div className="mt-3 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={dec}
                disabled={qty <= 1}
                aria-label="Fewer copies"
                className={arrowClass}
              >
                «
              </button>
              <span
                aria-live="polite"
                className="min-w-[3.5rem] text-center font-display text-5xl text-white [text-shadow:0_0_12px_rgba(178,61,242,0.6)]"
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={inc}
                disabled={qty >= game.itemsLeft}
                aria-label="More copies"
                className={arrowClass}
              >
                »
              </button>
            </div>
            <p className="mt-1 text-center font-condensed text-sm text-white/70">
              Items Left: {game.itemsLeft}
            </p>

            {/* One clickable row per copy — fixed height, scrollable */}
            <ul className="mt-4 h-48 space-y-1.5 overflow-y-auto rounded-xl bg-black/25 p-2 sm:h-56">
              {copies.map((end, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    aria-pressed={i === selectedIdx}
                    className={`flex w-full items-baseline justify-between gap-2 rounded-lg px-3 py-2 text-left
                      font-condensed outline-none transition
                      focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-[0.98]
                      ${
                        i === selectedIdx
                          ? "bg-gradient-to-r from-[#781ea2] to-[#2dcabd] text-white shadow-[0_0_10px_rgba(120,30,162,0.5)]"
                          : "bg-white/10 text-white/85 hover:bg-white/20"
                      }`}
                  >
                    <span className="text-lg font-bold">Copy {i + 1}</span>
                    <span className="text-sm">ends {displayDate(end)}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-3">
              <PillButton
                variant="gradient"
                size="sm"
                className="flex-1"
                onClick={() => onConfirm(copies)}
              >
                Confirm
              </PillButton>
              <PillButton
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onCancel}
              >
                Cancel
              </PillButton>
            </div>
          </div>

          {/* --- Right: calendar for the selected copy --- */}
          <RentCalendar
            value={copies[selectedIdx]}
            onChange={(iso) =>
              setCopies((c) => c.map((e, i) => (i === selectedIdx ? iso : e)))
            }
          />
        </div>
      </div>
    </div>
  );
}

function GameInfoModal({
  game,
  onClose,
  onAddToCart,
  inCart,
  onGoToCart,
  onCheckoutRequested,
}: {
  game: Game;
  onClose: () => void;
  onAddToCart: (game: Game, ends: string[]) => void;
  inCart: boolean;
  onGoToCart: () => void;
  loggedIn: boolean;
  onAuth: (mode: "login" | "register") => void;
  onCheckoutRequested: () => void;
}) {
  const [configMode, setConfigMode] = useState<"cart" | "checkout" | null>(null);

  /* Reviews are seeded in Firestore and served by /api/reviews.
     Load them when this game's modal opens. */
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/reviews?gameId=${encodeURIComponent(game.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.reviews) setReviews(data.reviews as Review[]);
      })
      .catch(() => {
        /* leave empty on failure */
      });
    return () => {
      active = false;
    };
  }, [game.id]);
  const reviewCount = game.reviewCount ?? reviews.length;

  /* Esc closes — but when the quantity popup is on top, Esc only
     closes that one (it has its own listener). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !configMode) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, configMode]);

  return (
    /* Dark + blur overlay — clicking it closes the popup */
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${game.name} details`}
      className="animate-overlayIn fixed inset-0 z-50 flex items-start justify-center overflow-y-auto
                 bg-[#200032]/80 p-3 backdrop-blur-md sm:p-6 lg:p-8"
    >
      {/* The popup itself — pops in; clicks inside must not close it.
          On desktop it fills most of the viewport height. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-popIn relative my-auto w-full max-w-6xl rounded-[36px] bg-white/20 p-4 shadow-2xl
                   shadow-black/50 backdrop-blur-xl sm:rounded-[52px] sm:p-7
                   lg:flex lg:h-[90vh] lg:max-h-[1080px] lg:flex-col lg:p-10"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white
                     outline-none transition hover:rotate-90 hover:bg-white/30
                     focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90 sm:right-7 sm:top-7"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:gap-7">
          {/* --- Left: game panel (scrolls on its own on desktop) --- */}
          <section
            aria-label="About the game"
            className="rounded-[36px] p-6 shadow-[-14px_20px_38px_rgba(24,9,31,0.32)] sm:p-8 lg:min-h-0 lg:overflow-y-auto"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${game.gradient.from}, ${game.gradient.to})`,
            }}
          >
            <CoverSlot game={game} className="aspect-square w-full" />

            <h2 className="mt-7 font-condensed text-4xl font-bold text-white sm:text-5xl">
              {game.name}
            </h2>
            <p className="mt-2 font-condensed text-2xl font-light text-white">
              {game.publisher}
            </p>

            <PlatformChip
              platform={game.platform}
              className="mt-5 px-3 py-1 text-base"
            />

            <h3 className="mt-7 font-condensed text-2xl font-light text-white">
              About the Game
            </h3>
            <div className="mt-3 space-y-4">
              {game.description.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="font-condensed text-lg font-thin leading-snug text-white/95"
                >
                  {para}
                </p>
              ))}
            </div>
          </section>

          {/* --- Right: reviews + rent panels --- */}
          <div className="flex flex-col gap-5 lg:min-h-0 lg:gap-7">
            <section
              aria-label="Reviews"
              className="flex min-h-0 flex-1 flex-col rounded-[36px] p-6 shadow-[-14px_20px_38px_rgba(24,9,31,0.32)] sm:p-8"
              style={{
                backgroundImage: `linear-gradient(135deg, ${game.gradient.from}, ${game.gradient.to})`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-condensed text-4xl font-bold text-white sm:text-5xl">
                    Reviews
                  </h2>
                  <p className="mt-1 font-condensed text-base font-thin text-white/80">
                    {reviewCount} Reviews
                  </p>
                  <p className="mt-0.5 font-condensed text-xs font-thin uppercase tracking-wide text-white/50">
                    Powered by RAWG
                  </p>
                </div>
                <p className="flex items-center gap-3 font-condensed text-4xl font-light text-white sm:text-5xl">
                  <StarIcon className="h-8 w-8 sm:h-9 sm:w-9" />
                  {game.rating.toFixed(1)}
                </p>
              </div>

              <ul className="mt-4 max-h-[340px] flex-1 overflow-y-auto pr-1 lg:max-h-none lg:min-h-0">
                {reviews.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-white/70">Loading reviews…</li>
                ) : (
                  reviews.map((review, i) => (
                    <ReviewItem key={i} review={review} />
                  ))
                )}
              </ul>
            </section>

            <section
              aria-label="Rent the game"
              className="rounded-[36px] p-6 shadow-[-14px_20px_38px_rgba(24,9,31,0.32)] sm:p-8"
              style={{
                backgroundImage: `linear-gradient(135deg, ${game.gradient.from}, ${game.gradient.to})`,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-condensed text-3xl font-bold text-white sm:text-4xl">
                  Rent the Game?
                </h2>
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="font-condensed text-3xl text-white sm:text-4xl">
                  ₱{game.price.toFixed(2)}
                </p>
                <p className="font-condensed text-3xl text-white sm:text-4xl">
                  Items Left: {game.itemsLeft}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                {/* Add to Cart -> quantity popup; already in cart ->
                    jump to the cart page and highlight the item */}
                <PillButton
                  variant="gradient"
                  size="sm"
                  className="flex-1"
                  onClick={() => (inCart ? onGoToCart() : setConfigMode("cart"))}
                >
                  <span className="flex items-center justify-center gap-2">
                    <CartIcon className="h-5 w-5" />
                    {inCart ? "In Cart ✓" : "Add to Cart"}
                  </span>
                </PillButton>
                {/* Rent Now -> one copy with the default rent period, closes the popup */}
                <PillButton
                  variant="gradient"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfigMode("checkout")}
                >
                  Rent Now
                </PillButton>
              </div>
            </section>
          </div>
        </div>

        {/* Rent configurator — Cancel closes only this, not the game info popup */}
        {configMode && (
          <RentConfigModal
            game={game}
            onCancel={() => setConfigMode(null)}
            onConfirm={(ends) => {
              setConfigMode(null);
              onAddToCart(game, ends);
              if (configMode === "checkout") {
                onClose();
                onCheckoutRequested();
              } else {
                onClose();
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ----------------------- Sections ----------------------- */

/* Stepped "tech panel" edges traced from the frame — the purple bands
   don't end in a straight diagonal, they zig-zag with notches.
   (Underscores become spaces inside Tailwind arbitrary values.) */
const BAND_CLIP: Record<string, string> = {
  xbox: "[clip-path:polygon(0_7rem,7%_7rem,10%_4rem,30%_4rem,42%_0,100%_0,100%_calc(100%_-_5rem),62%_calc(100%_-_5rem),54%_100%,36%_100%,33%_calc(100%_-_2rem),8%_calc(100%_-_2rem),5%_100%,0_100%)]",
  switch:
    "[clip-path:polygon(0_6rem,22%_6rem,28%_0,56%_0,61%_3.5rem,100%_3.5rem,100%_100%,0_100%)]",
};

function CategorySection({
  section,
  games,
  onOpen,
}: {
  section: Section;
  games: Game[];
  onOpen: (game: Game) => void;
}) {
  const light = section.theme === "light";
  /* PlayStation tucks up beside the hero's stepped bottom edge,
     like the frame — its heading sits in the cut-away zone. */
  const tuck = section.id === "ps" ? "-mt-24 lg:-mt-32" : "";

  return (
    <section
      aria-label={section.title}
      className={
        light
          ? `relative py-20 lg:py-28 ${tuck}`
          : `relative z-[1] bg-[#734d9d] pb-40 pt-44 lg:pb-44 lg:pt-52
             ${section.id === "xbox" ? "-my-16" : "-mt-16"}
             shadow-[inset_20px_40px_60px_rgba(22,10,10,0.18)] ${BAND_CLIP[section.id]}`
      }
    >
      {/* Corner dot clusters + line decorations from the frame */}
      {!light && (
        <>
          <DotCluster
            count={3}
            className="absolute left-[9%] top-[8.5rem] hidden lg:flex"
          />
          <DotCluster
            count={4}
            variant="cyan"
            className="absolute right-[7%] top-24 hidden lg:flex"
          />
          <DotCluster
            count={4}
            variant="cyan"
            className="absolute bottom-24 right-[9%] hidden lg:flex"
          />
        </>
      )}
      {light && (
        <DotCluster
          count={3}
          className={`absolute top-10 hidden lg:flex ${section.align === "right" ? "left-[38%]" : "right-[38%]"}`}
        />
      )}
      {section.id === "switch" && (
        <div
          className="absolute right-0 top-44 hidden w-72 flex-col gap-3 lg:flex"
          aria-hidden="true"
        >
          <span className="h-1.5 rounded-l-full bg-white/80" />
          <span className="h-1.5 w-2/3 self-end rounded-l-full bg-white/60" />
        </div>
      )}

      <div className="mx-auto max-w-[1800px] px-4 sm:px-10 lg:px-20">
        {/* Decorations + heading */}
        <div
          className={`flex items-center gap-6 ${section.align === "right" ? "flex-row" : "flex-row-reverse"}`}
        >
          <div
            className={`hidden flex-1 items-center gap-10 sm:flex ${section.align === "right" ? "" : "justify-end"}`}
          >
            <AccentBar className="w-40 lg:w-72" />
            <DotCluster
              count={light ? 3 : 4}
              variant={light ? "purple" : "cyan"}
            />
          </div>
          <h2
            className={`font-display text-4xl sm:text-6xl lg:text-[78px] lg:leading-[1.1]
              [text-shadow:0_4px_5px_rgba(117,4,255,0.25)]
              ${light ? "text-[#300e6b]" : "text-[#f9f5ff]"}
              ${section.align === "right" ? "text-right" : "text-left"}`}
          >
            {section.title}
          </h2>
        </div>

        {/* Carousel (or empty state when search filters everything out) */}
        <div className="mt-12 lg:mt-16">
          {games.length > 0 ? (
            <GameCarousel games={games} theme={section.theme} onOpen={onOpen} />
          ) : (
            <p
              className={`py-10 text-center font-condensed text-2xl ${light ? "text-[#300e6b]/60" : "text-white/70"}`}
            >
              No games match your search here.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- Page ----------------------- */

export default function BrowseGames({
  onNavigate,
  cart,
  onAddToCart,
  onAuth,
  loggedIn,
  onLogout,
  onViewInCart,
  onCheckoutRequested,
  notifications,
  onNotificationsOpened,
  avatarUrl,
}: {
  onNavigate: (id: PageId) => void;
  cart: CartItem[];
  onAddToCart: (game: Game, ends: string[]) => void;
  onAuth: (mode: "login" | "register") => void;
  loggedIn: boolean;
  onLogout: () => void;
  onViewInCart: (id: string) => void;
  onCheckoutRequested: () => void;
  notifications: AppNotification[];
  onNotificationsOpened: () => void;
  avatarUrl?: string;
}) {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("latest");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [toast, setToast] = useState("");
  /* Catalog + live stock from the simulated backend. */
  const [games, setGames] = useState<Game[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => setGames(data.games))
      .catch(() =>
        setLoadError("Couldn't load the catalog. Is the dev server running?"),
      );
  }, []);

  const handleAddToCart = (game: Game, ends: string[]) => {
    onAddToCart(game, ends);
    setToast("Item has been added to cart!");
  };

  const applyFilters = (games: Game[]) => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? games.filter((g) => g.name.toLowerCase().includes(q))
      : [...games];
    switch (sort) {
      case "latest":
        return filtered.sort((a, b) => b.addedAt - a.addedAt);
      case "topSales":
        return filtered.sort((a, b) => b.sales - a.sales);
      case "priceAsc":
        return filtered.sort(
          (a, b) => a.price - b.price || a.name.localeCompare(b.name),
        );
      case "priceDesc":
        return filtered.sort(
          (a, b) => b.price - a.price || a.name.localeCompare(b.name),
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#eee9f7] font-condensed">
      <Header
        activeId="products"
        onNavigate={onNavigate}
        cartCount={cart.reduce((n, c) => n + c.qty, 0)}
        onAuth={onAuth}
        loggedIn={loggedIn}
        onLogout={onLogout}
        notifications={notifications}
        onNotificationsOpened={onNotificationsOpened}
        avatarUrl={avatarUrl}
      />

      <main>
        {/* --- Hero band: title + search + filter --- */}
        <section
          aria-label="Search games"
          className="relative overflow-hidden bg-[#2a1440] pb-44 pt-36 lg:pb-56 lg:pt-48
                     [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_9rem),58%_calc(100%_-_9rem),46%_calc(100%_-_4rem),32%_calc(100%_-_4rem),28%_100%,12%_100%,0_calc(100%_-_6rem))]"
        >
          {/* arcade key-art slot — intentionally blank; overlays stay ready for it */}
          <div className="absolute inset-0" aria-hidden="true">
            <img
              src="/browseheader.png"
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="h-full w-full bg-[#2a1440]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#4b1e6e_0%,transparent_65%)]" />
            <div className="absolute inset-0 bg-[#1f142b]/40" />
          </div>

          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4">
            <h1 className="text-center font-display text-5xl text-white sm:text-7xl lg:text-[96px]">
              Browse Games
            </h1>

            {/* Search */}
            <div className="mt-8 flex w-full max-w-[560px] items-center gap-2 rounded-[15px] bg-[#d9d9d9]/20 py-1.5 pl-4 pr-1.5 backdrop-blur-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5 shrink-0 text-white/70"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search games"
                className="w-full bg-transparent font-condensed text-lg text-white placeholder-white/45 outline-none"
              />
              <button
                type="button"
                aria-label="Search"
                className="gradient-animated shrink-0 rounded-[10px] bg-gradient-to-r from-[#781ea2] via-[#2dcabd] to-[#781ea2]
                           p-2 text-white outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:translate-y-0 active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Filter toggle */}
            <div className="flex w-full max-w-[560px] justify-end">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                aria-expanded={filterOpen}
                className={`mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 font-condensed text-lg outline-none transition
                  hover:text-[#15f5ea] focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95
                  ${filterOpen ? "text-[#15f5ea]" : "text-white"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
                Filter
              </button>
            </div>

            {/* Sort panel */}
            {filterOpen && <FilterPanel sort={sort} onSort={setSort} />}
          </div>
        </section>

        {/* --- Category sections --- */}
        <div className="relative">
          {games === null ? (
            <p className="py-24 text-center font-condensed text-2xl text-[#300e6b]/70">
              {loadError || "Loading games…"}
            </p>
          ) : (
            SECTIONS.map((section) => (
              <CategorySection
                key={section.id}
                section={section}
                games={applyFilters(
                  games.filter((g) => g.platform === section.platform),
                )}
                onOpen={setSelectedGame}
              />
            ))
          )}
        </div>

        {/* --- Cyan divider before the footer --- */}
        <div className="relative h-[3px] bg-gradient-to-r from-[#2dcabd] via-[#15f5ea] to-[#2dcabd] shadow-[0_0_12px_#15f5ea]" />
      </main>

      <Footer />

      {/* --- Game info popup --- */}
      {selectedGame && (
        <GameInfoModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onAddToCart={handleAddToCart}
          inCart={cart.some((c) => c.game.id === selectedGame.id)}
          onGoToCart={() => {
            const id = selectedGame.id;
            setSelectedGame(null);
            onViewInCart(id);
          }}
          loggedIn={loggedIn}
          onAuth={onAuth}
          onCheckoutRequested={onCheckoutRequested}
        />
      )}

      {/* --- "Added to cart" fading confirmation --- */}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
