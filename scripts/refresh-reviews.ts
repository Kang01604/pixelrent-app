/* ============================================================
   PixelRent — RAWG rating refresh (run daily, NOT at request time).

   Fetches each game's real average rating + rating distribution
   from RAWG ONCE per run and copies them onto the game docs in
   Firestore. The app reads Firestore, so visitors cost zero RAWG
   requests — only this job spends quota (~24 calls per run).

   No login needed: the rating distribution comes from the official
   API with the key.

   Run manually:  npx tsx scripts/refresh-reviews.ts
   Runs daily via .github/workflows/refresh-reviews.yml
   ============================================================ */

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CATALOG } from "../lib/catalog";
import { resolveGame, sleep } from "../lib/rawg";

const REQUEST_GAP_MS = 350; // be polite to RAWG between calls

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_* env vars (project id / client email / private key).",
  );
  process.exit(1);
}
if (!process.env.RAWG_API_KEY) {
  console.warn("⚠  No RAWG_API_KEY set — ratings will be left unchanged.");
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

async function refresh() {
  let rawgRequests = 0;
  let matched = 0;

  for (const game of CATALOG) {
    const r = await resolveGame(game.name);
    rawgRequests++;
    await sleep(REQUEST_GAP_MS);

    if (!r) {
      console.log(`${game.name.padEnd(38)} → (no RAWG match — left unchanged)`);
      continue;
    }
    matched++;

    const rating = Math.round(r.rating * 10) / 10;
    await db
      .collection("games")
      .doc(game.id)
      .set(
        { rating, reviewCount: r.count, ratingBreakdown: r.breakdown },
        { merge: true },
      );

    const b = r.breakdown;
    console.log(
      `${game.name.padEnd(38)} → ${r.slug.padEnd(34)} ${rating}  ` +
        `(5:${b["5"]} 4:${b["4"]} 3:${b["3"]} 2:${b["2"]} 1:${b["1"]}, total ${r.count})`,
    );
  }

  console.log("————————————————————————————————————————");
  console.log(`Done. ${matched}/${CATALOG.length} games matched on RAWG.`);
  console.log(
    `RAWG API requests used this run: ${rawgRequests} (of 20,000/month).`,
  );
}

refresh()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Refresh failed:", err);
    process.exit(1);
  });
