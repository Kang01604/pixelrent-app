import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import type { Game } from "../../../lib/catalog";

/* Stock is live in Firestore — never prerender statically. */
export const dynamic = "force-dynamic";

/** GET /api/games — the catalog with live stock from Firestore.
    Run `npx tsx scripts/seed.ts` once to populate the `games`
    collection before this returns anything. */
export async function GET() {
  try {
    const snap = await adminDb.collection("games").get();
    const games = snap.docs
      .map((d) => d.data() as Game)
      .filter((g) => !g.archived) // archived games are hidden from shoppers
      .sort((a, b) => a.id.localeCompare(b.id));
    return NextResponse.json(
      { games },
      {
        // Edge-cache for 60s (stock changes show within a minute); checkout
        // still reads live stock in a transaction, so no overselling.
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      },
    );
  } catch (err) {
    console.error("[/api/games]", err);
    return NextResponse.json(
      { error: "Could not load games. Is Firebase configured and seeded?" },
      { status: 500 }
    );
  }
}
