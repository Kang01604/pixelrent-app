# PixelRent — Firebase Setup

This turns the simulated demo into a real, persistent e-commerce app:

- **Firebase Auth** — real email/password accounts; sessions survive refresh.
- **Firestore `users/{uid}`** — profile documents.
- **Firestore `games`** — the catalog with live stock.
- **Firestore `orders`** — real orders saved under each user.
- **Checkout** — server-authoritative: atomic stock decrement + 12% PH VAT,
  computed from server-side prices (clients can't cheat).

---

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project**.
2. In the project, open **Build → Authentication → Get started**, then enable
   **Email/Password** under *Sign-in method*.
3. Open **Build → Firestore Database → Create database** → start in
   **production mode** → pick a region (e.g. `asia-southeast1` for PH).

## 2. Get the PUBLIC web config

1. **Project settings** (gear icon) → **General** → scroll to *Your apps* →
   click the web icon `</>` and register an app (nickname: `pixelrent-web`).
2. Copy the `firebaseConfig` values into `.env.local` (see step 4) under the
   `NEXT_PUBLIC_FIREBASE_*` keys.

## 3. Get the PRIVATE service account (for the server)

1. **Project settings** → **Service accounts** → **Generate new private key**.
2. A JSON file downloads. From it, copy into `.env.local`:
   - `project_id`  → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key`  → `FIREBASE_PRIVATE_KEY` (keep the `\n` escapes, wrap in `"`)

## 4. Configure env vars

```bash
cp .env.local.example .env.local
# then fill in every value
```

## 5. Deploy the security rules

Paste the contents of `firestore.rules` into
**Firestore Database → Rules** in the console and click **Publish**.
(Or, with the Firebase CLI: `firebase deploy --only firestore:rules`.)

## 6. Seed the catalog

```bash
npx tsx scripts/seed.ts
```

You should see `Seeded 24 games into Firestore.` and a `games` collection
appear in the console. Re-run any time to reset stock to defaults.

## 7. Run

```bash
npm install
npm run dev
# http://localhost:3000
```

Register an account, browse, add to cart, check out. Refresh the page — you
stay logged in, stock stays decremented, and the order is in `orders`.

---

## Deploying to Vercel

Add **all** the env vars from `.env.local` in
**Vercel → Project → Settings → Environment Variables**. For
`FIREBASE_PRIVATE_KEY`, paste the value including the `\n` escapes exactly as
in `.env.local` (with the surrounding quotes). Redeploy.

Run the seed once against your production project (locally with the same env,
or via a one-off script) so the live site has a catalog.

## Optional next steps

- **Order history UI** — you already store `orders`; add a page that queries
  `orders where uid == currentUser.uid`.
- **Avatars in Storage** — profile pictures are currently data-URLs on the
  profile doc; switch to Firebase Storage for larger images.
- **Admin restock** — a small protected route that bumps `itemsLeft`.
