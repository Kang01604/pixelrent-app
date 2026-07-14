/* ============================================================
   PixelRent — purge soft-deleted accounts (run daily).

   Any user flagged disabled: true for more than 30 days is
   permanently removed — both the Firebase Auth login and the
   Firestore profile doc. Before 30 days, an admin can still
   restore them. Runs alongside the daily review refresh.

   Run manually:  npx tsx scripts/purge-disabled.ts
   ============================================================ */

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_* env vars.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();
const authAdmin = getAuth();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function purge() {
  const snap = await db.collection("users").where("disabled", "==", true).get();
  const now = Date.now();
  let removed = 0;

  for (const doc of snap.docs) {
    const disabledAt = (doc.data().disabledAt as string) || "";
    const ts = disabledAt ? new Date(disabledAt).getTime() : 0;
    if (!ts || now - ts < THIRTY_DAYS_MS) continue; // still within the 30-day window

    try {
      await authAdmin.deleteUser(doc.id);
    } catch {
      /* auth user may already be gone — continue to delete the profile */
    }
    await doc.ref.delete();
    removed++;
    console.log(`Purged ${doc.id} (disabled ${disabledAt}).`);
  }

  console.log(`Purge complete. ${removed} account(s) removed.`);
}

purge()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Purge failed:", err);
    process.exit(1);
  });
