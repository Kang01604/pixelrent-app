/* ============================================================
   PixelRent — one-time Firestore seeder.

   Writes the 24-game CATALOG into the `games` collection (doc id
   = game id), including the starting `itemsLeft` stock. Safe to
   re-run — it overwrites each game doc (resets stock to the
   catalog defaults).

   Run:  npx tsx scripts/seed.ts
   Needs the same FIREBASE_* service-account env vars as the app.
   ============================================================ */

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CATALOG } from "../lib/catalog";

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

async function seed() {
  const batch = db.batch();
  for (const game of CATALOG) {
    batch.set(db.collection("games").doc(game.id), game);
  }
  await batch.commit();
  console.log(`Seeded ${CATALOG.length} games into Firestore.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
