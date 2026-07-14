"use client";

import { useEffect, useState } from "react";
import { Header, Footer, PillButton, PageId, AppNotification } from "./shared";

/* ============================================================
   PixelRent — Homepage (1:1 with the provided screenshot)
   "Browse Games" navigates to the BrowseGames page.
   ============================================================ */

/* ONE image, MANY texts — the dots only swap the copy below.
   HERO_IMAGE stays blank for now; drop the key-art URL in later. */
const HERO_IMAGE = "/homepage.png";

type HeroSlide = { id: number; title: string; subtitle: string };
const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    title: "Rent Games. Play More. Spend Less.",
    subtitle:
      "Browse popular titles, reserve your favorite games, checkout rentals, and track your rental history in one place.",
  },
  {
    id: 2,
    title: "New Releases. Zero Commitment.",
    subtitle:
      "Play the latest AAA titles the week they drop — return them when you're done and grab the next one.",
  },
  {
    id: 3,
    title: "Every Platform. One Library.",
    subtitle:
      "PlayStation, Xbox, Nintendo Switch, and PC — all rentable from a single account.",
  },
  {
    id: 4,
    title: "Weekend Deals for Squad Nights.",
    subtitle:
      "Bundle party games at a discount and keep the whole crew playing all weekend long.",
  },
  {
    id: 5,
    title: "Track Every Rental.",
    subtitle:
      "Your full rental history, due dates, and receipts — organized in one dashboard.",
  },
  {
    id: 6,
    title: "Reserve Before It's Gone.",
    subtitle:
      "High-demand titles go fast. Lock in your copy ahead of time with free reservations.",
  },
];

/** Carousel pagination dot — wide solid white when active, small translucent otherwise. */
function CarouselDot({
  index,
  active,
  onSelect,
}: {
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Go to slide ${index + 1}`}
      aria-current={active ? "true" : undefined}
      className={`h-[7px] rounded-xl outline-none transition-all duration-300
        hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90
        ${active ? "w-12 bg-[#d9d9d9]" : "w-8 bg-[#d9d9d9]/40"}`}
    />
  );
}

function Hero({
  slides,
  activeSlide,
  onSelectSlide,
  onBrowse,
}: {
  slides: HeroSlide[];
  activeSlide: number;
  onSelectSlide: (i: number) => void;
  onBrowse: () => void;
}) {
  const slide = slides[activeSlide];

  return (
    <section
      aria-label="Featured"
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#221329]"
    >
      {/* --- Background: ONE fixed image for every slide (blank for now) --- */}
      <div className="absolute inset-0" aria-hidden="true">
        {HERO_IMAGE ? (
          <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[#221329]" /> /* image slot — intentionally blank */
        )}
        <div className="absolute inset-0 bg-[#4b1e6e]/40 mix-blend-multiply" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#18091f] via-[#18091f]/60 to-transparent" />
      </div>

      {/* --- Copy (this is all the dots change; auto-advances too) --- */}
      <div className="relative mx-auto flex w-full max-w-[1800px] flex-1 flex-col justify-center px-4 pb-24 pt-28 sm:px-8 lg:px-14 lg:pt-32">
        {/* key remount re-runs the slide-up animation on every text change */}
        <div key={slide.id} className="animate-slideUp">
          <h1 className="max-w-5xl font-display text-5xl leading-[0.98] text-white sm:text-7xl lg:text-8xl xl:text-[96px]">
            {slide.title}
          </h1>

          <p className="mt-6 max-w-3xl font-condensed text-2xl leading-snug text-white sm:text-3xl lg:text-[36px] lg:leading-[1.2]">
            {slide.subtitle}
          </p>
        </div>

        <div className="mt-10 flex lg:mt-14">
          {/* Reserve a Game removed — Browse Games fills the space */}
          <PillButton
            variant="gradient"
            size="lg"
            className="w-full sm:w-auto sm:min-w-[430px]"
            onClick={onBrowse}
          >
            Browse Games
          </PillButton>
        </div>
      </div>

      {/* --- Carousel dots, centered near the bottom --- */}
      <div
        role="tablist"
        aria-label="Featured slides"
        className="relative mx-auto mb-16 flex items-center gap-2.5 lg:mb-20"
      >
        {slides.map((s, i) => (
          <CarouselDot
            key={s.id}
            index={i}
            active={i === activeSlide}
            onSelect={() => onSelectSlide(i)}
          />
        ))}
      </div>

      {/* --- Cyan divider line between hero and footer --- */}
      <div className="relative h-[3px] bg-gradient-to-r from-[#2dcabd] via-[#15f5ea] to-[#2dcabd] shadow-[0_0_12px_#15f5ea]" />
    </section>
  );
}

export default function Homepage({
  onNavigate,
  cartCount,
  onAuth,
  loggedIn,
  onLogout,
  isAdmin,
  notifications,
  onNotificationsOpened,
  avatarUrl,
}: {
  onNavigate: (id: PageId) => void;
  cartCount: number;
  onAuth: (mode: "login" | "register") => void;
  loggedIn: boolean;
  onLogout: () => void;
  isAdmin?: boolean;
  notifications: AppNotification[];
  onNotificationsOpened: () => void;
  avatarUrl?: string;
}) {
  const [activeSlide, setActiveSlide] = useState(0);

  /* Auto-scroll the hero copy every 5s. Restarts whenever the slide
     changes, so clicking a dot resets the timer instead of fighting it. */
  useEffect(() => {
    const timer = setInterval(
      () => setActiveSlide((s) => (s + 1) % HERO_SLIDES.length),
      5000,
    );
    return () => clearInterval(timer);
  }, [activeSlide]);

  return (
    <div className="min-h-screen bg-[#18091f] font-condensed">
      <Header
        activeId="home"
        onNavigate={onNavigate}
        cartCount={cartCount}
        onAuth={onAuth}
        loggedIn={loggedIn}
        onLogout={onLogout}
        isAdmin={isAdmin}
        notifications={notifications}
        onNotificationsOpened={onNotificationsOpened}
        avatarUrl={avatarUrl}
      />

      <main>
        <Hero
          slides={HERO_SLIDES}
          activeSlide={activeSlide}
          onSelectSlide={setActiveSlide}
          onBrowse={() => onNavigate("products")}
        />
      </main>

      <Footer />
    </div>
  );
}
