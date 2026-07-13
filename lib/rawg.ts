/* ============================================================
   PixelRent — RAWG helpers (used only by the refresh script /
   cron, never at request time).

   Two sources:
   - Official API (api.rawg.io, needs the key): resolves a game to
     its RAWG slug and real average rating (0–5 float).
   - Internal endpoint (rawg.io/api, no key): the same one the RAWG
     website uses to show written reviews. Undocumented, so this is
     written defensively — any failure just returns [] and the
     caller falls back to generated reviews.

   RAWG asks for attribution ("Powered by RAWG") and a User-Agent
   on every request.
   ============================================================ */

const RAWG_KEY = process.env.RAWG_API_KEY ?? "";
const UA = "PixelRent/1.0 (student project; +https://pixelrent-app.vercel.app)";

// RAWG's rating "levels" → stars (out of 5) and the label RAWG shows.
const LEVEL_STARS: Record<number, number> = { 5: 5, 4: 4, 3: 3, 1: 1 };
const LEVEL_LABEL: Record<number, string> = {
  5: "Exceptional",
  4: "Recommended",
  3: "Meh",
  1: "Skip",
};

export type RawgGame = {
  slug: string;
  name: string;
  rating: number; // 0–5 average from RAWG
};

export type RawgReview = {
  user: string;
  stars: number;
  line1: string; // level label (Exceptional / Recommended / ...)
  line2: string; // the review text
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Strip HTML tags/entities from RAWG review text and tidy whitespace. */
function cleanText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean a catalog name for searching (drop ™ ® and extra spaces). */
function searchName(name: string): string {
  return name.replace(/[™®]/g, "").replace(/\s+/g, " ").trim();
}

/** Official API: resolve a game name → { slug, name, rating }. */
export async function resolveGame(name: string): Promise<RawgGame | null> {
  if (!RAWG_KEY) return null;
  const q = encodeURIComponent(searchName(name));
  const url = `https://api.rawg.io/api/games?search=${q}&search_precise=true&page_size=1&key=${RAWG_KEY}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ slug: string; name: string; rating: number }>;
    };
    const first = data.results?.[0];
    if (!first?.slug) return null;
    return { slug: first.slug, name: first.name, rating: first.rating ?? 0 };
  } catch {
    return null;
  }
}

/** Internal endpoint: fetch written reviews for a slug.
    Returns only reviews that actually have text. Defensive: [] on any failure. */
export async function fetchReviews(slug: string, max = 40): Promise<RawgReview[]> {
  const url = `https://rawg.io/api/games/${slug}/reviews?page_size=${max}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        rating: number;
        text?: string | null;
        user?: { username?: string; full_name?: string } | null;
      }>;
    };
    const out: RawgReview[] = [];
    for (const r of data.results ?? []) {
      const text = cleanText(r.text ?? "");
      if (!text) continue; // skip rating-only reviews (no written text)
      const stars = LEVEL_STARS[r.rating] ?? 3;
      const label = LEVEL_LABEL[r.rating] ?? "Recommended";
      const user =
        r.user?.username || r.user?.full_name || "RAWG player";
      out.push({ user, stars, line1: label, line2: text });
    }
    return out;
  } catch {
    return [];
  }
}

export { sleep };
