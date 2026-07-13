/* ============================================================
   PixelRent — RAWG helper (used only by the daily refresh, never
   at request time).

   Uses the official API (api.rawg.io, needs the key) to resolve a
   game to its RAWG slug, real average rating (0–5), total ratings
   count, and the rating DISTRIBUTION — how many players picked each
   level. RAWG's levels are 5 = Exceptional, 4 = Recommended,
   3 = Meh, 1 = Skip (there is no level 2, so "2" is always 0).

   RAWG asks for attribution ("Powered by RAWG") and a User-Agent.
   ============================================================ */

const UA = "PixelRent/1.0 (student project; +https://pixelrent-app.vercel.app)";

export type RawgResult = {
  slug: string;
  name: string;
  rating: number; // 0–5 average
  count: number; // total ratings
  breakdown: Record<string, number>; // { "5","4","3","2","1" } -> counts
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Drop ™ ® and collapse spaces for a cleaner search query. */
function searchName(name: string): string {
  return name.replace(/[™®]/g, "").replace(/\s+/g, " ").trim();
}

/** Resolve a game name → real rating + distribution from RAWG. */
export async function resolveGame(name: string): Promise<RawgResult | null> {
  // Read the key here (not at module load) — the refresh script loads
  // .env.local after imports are evaluated.
  const key = process.env.RAWG_API_KEY ?? "";
  if (!key) return null;
  const q = encodeURIComponent(searchName(name));
  const url = `https://api.rawg.io/api/games?search=${q}&search_precise=true&page_size=1&key=${key}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        slug: string;
        name: string;
        rating: number;
        ratings_count?: number;
        ratings?: Array<{ id: number; count: number }>;
      }>;
    };
    const first = data.results?.[0];
    if (!first?.slug) return null;

    // Normalize RAWG's ratings array into a 5..1 count map.
    const breakdown: Record<string, number> = {
      "5": 0,
      "4": 0,
      "3": 0,
      "2": 0,
      "1": 0,
    };
    for (const r of first.ratings ?? []) {
      const level = String(r.id);
      if (level in breakdown) breakdown[level] = r.count ?? 0;
    }
    const count =
      first.ratings_count ??
      Object.values(breakdown).reduce((a, b) => a + b, 0);

    return {
      slug: first.slug,
      name: first.name,
      rating: first.rating ?? 0,
      count,
      breakdown,
    };
  } catch {
    return null;
  }
}

export { sleep };
