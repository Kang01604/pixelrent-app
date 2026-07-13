# PixelRent — video game rental (Next.js 14, simulated backend)

Dark neon storefront for renting games: browse by platform, configure rent
dates per copy, cart, simulated checkout with PH VAT, simulated accounts,
profile settings, and order notifications.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

`npm run build && npm start` also works (the build fetches Google Fonts, so
it needs internet on first build).

## What's simulated (on purpose)

- **Auth** — `/api/auth/login` accepts any well-formed email + password and
  returns the demo profile. `/api/auth/register` fully validates the form
  (proper email, username 3–16 chars, password >= 8, every field including
  the PH address) but **nothing is saved to a database**. Refreshing the
  page logs you out.
- **Payments** — `/api/checkout` validates the cart, decrements in-memory
  stock, computes **12% Philippine VAT**, and returns an order ID. The
  success popup states clearly that the payment is simulated. No processor
  is involved.
- **Stock** — lives in `lib/simstore.ts` (in-memory, survives hot reload via
  a `globalThis` cache, resets when the dev server restarts).

## Where things live

| Path | What |
| --- | --- |
| `lib/catalog.ts` | The 24-game catalog + cover art URLs |
| `lib/simstore.ts` | In-memory stock + orders |
| `lib/validate.ts` | Server-side form/checkout validation |
| `app/api/*` | games, checkout, auth/login, auth/register |
| `components/pixelrent/` | The whole UI (client components) |

## Notes

- Cart persists in `localStorage`.
- Profile pictures are stored as data-URLs on the (simulated) profile.
- Rentals always start "today"; end dates are set per copy via the calendar.
