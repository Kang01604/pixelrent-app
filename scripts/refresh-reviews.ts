/* ============================================================
   PixelRent — RAWG review refresh (run daily, NOT at request time).

   Fetches real ratings + written reviews from RAWG ONCE per run,
   copies them into Firestore, and logs a summary. The app only ever
   reads Firestore, so visitors cost zero RAWG requests — this is the
   only thing that spends the 20,000/month quota (~24 calls per run).

   For each game:
     1. Official API → real slug + rating (out of 5).   [1 request]
     2. Internal endpoint → written reviews (text).      [0 quota — no key]
     3. If fewer than MIN_REVIEWS have text, top up with generated ones.
     4. Write game.rating + game.reviewCount, replace its reviews.

   Run manually:  npx tsx scripts/refresh-reviews.ts
   Runs daily via .github/workflows/refresh-reviews.yml
   ============================================================ */

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CATALOG } from "../lib/catalog";
import { resolveGame, fetchReviews, sleep, type RawgReview } from "../lib/rawg";
import { generateReviews, averageStars } from "../lib/reviews-data";

const MIN_REVIEWS = 8; // ensure every game shows a decent list
const REQUEST_GAP_MS = 350; // be polite to RAWG between calls

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_* env vars (project id / client email / private key).");
  process.exit(1);
}
if (!process.env.RAWG_API_KEY) {
  console.warn("⚠  No RAWG_API_KEY set — will fall back to generated reviews for every game.");
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

async function clearReviews(gameId: string) {
  const existing = await db.collection("games").doc(gameId).collection("reviews").get();
  if (existing.empty) return;
  const batch = db.batch();
  existing.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function refresh() {
  let rawgRequests = 0;
  let totalReal = 0;
  let totalReviews = 0;

  for (const game of CATALOG) {
    // 1. Real slug + rating from the official API.
    const resolved = await resolveGame(game.name);
    rawgRequests++;
    await sleep(REQUEST_GAP_MS);

    // 2. Real written reviews from the internal endpoint (no quota cost).
    let real: RawgReview[] = [];
    if (resolved) {
      real = await fetchReviews(resolved.slug);
      await sleep(REQUEST_GAP_MS);
    }

    // 3. Top up with generated reviews if RAWG had too few written ones.
    const reviews: RawgReview[] = [...real];
    if (reviews.length < MIN_REVIEWS) {
      const filler = generateReviews().slice(0, MIN_REVIEWS - reviews.length);
      reviews.push(...filler);
    }

    // 4. Headline rating: RAWG's real average if we got one, else the
    //    average of the reviews we ended up with.
    const rating =
      resolved && resolved.rating > 0
        ? Math.round(resolved.rating * 10) / 10
        : averageStars(reviews);

    await clearReviews(game.id);
    const batch = db.batch();
    const gameRef = db.collection("games").doc(game.id);
    batch.set(gameRef, { ...game, rating, reviewCount: reviews.length }, { merge: true });
    reviews.forEach((r) => batch.set(gameRef.collection("reviews").doc(), r));
    await batch.commit();

    totalReal += real.length;
    totalReviews += reviews.length;
    console.log(
      `${game.name.padEnd(38)} → ${resolved ? resolved.slug.padEnd(34) : "(no RAWG match)".padEnd(34)} ` +
        `rating ${rating}  real:${real.length}  total:${reviews.length}`,
    );
  }

  console.log("————————————————————————————————————————");
  console.log(`Done. ${CATALOG.length} games updated.`);
  console.log(`RAWG API requests used this run: ${rawgRequests} (of 20,000/month).`);
  console.log(`Real RAWG written reviews: ${totalReal}. Total reviews stored: ${totalReviews}.`);
}

refresh()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Refresh failed:", err);
    process.exit(1);
  });
