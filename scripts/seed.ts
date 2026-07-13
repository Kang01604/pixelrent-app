/* ============================================================
   PixelRent — one-time Firestore seeder.

   Writes the 24-game CATALOG into the `games` collection (doc id
   = game id), including starting `itemsLeft` stock. For each game
   it also generates 8–25 made-up, IGN-style reviews under
   `games/{id}/reviews`, and sets the game's `rating` to the
   average of those reviews (1 decimal) plus a `reviewCount`.

   Safe to re-run — it overwrites each game and replaces its
   reviews (resets stock + reshuffles reviews).

   Run:  npx tsx scripts/seed.ts
   ============================================================ */

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CATALOG } from "../lib/catalog";
import { generateReviews, averageStars } from "../lib/reviews-data";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
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

async function seed() {
  let totalReviews = 0;

  for (const game of CATALOG) {
    const reviews = generateReviews();
    const rating = averageStars(reviews);
    totalReviews += reviews.length;

    // Fresh reviews each run.
    await clearReviews(game.id);

    // One batch per game (game doc + its reviews) keeps us well under
    // Firestore's 500-op batch limit.
    const batch = db.batch();
    const gameRef = db.collection("games").doc(game.id);
    batch.set(gameRef, { ...game, rating, reviewCount: reviews.length });

    reviews.forEach((r) => {
      batch.set(gameRef.collection("reviews").doc(), r);
    });

    await batch.commit();
  }

  console.log(`Seeded ${CATALOG.length} games and ${totalReviews} reviews into Firestore.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
