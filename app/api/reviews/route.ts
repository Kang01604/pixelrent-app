import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type Review = {
  user: string;
  stars: number;
  line1: string;
  line2: string;
};

/** GET /api/reviews?gameId=ps-1 — the seeded reviews for one game. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ error: "Missing gameId." }, { status: 400 });
  }

  try {
    const snap = await adminDb.collection("games").doc(gameId).collection("reviews").get();
    const reviews = snap.docs.map((d) => d.data() as Review);
    return NextResponse.json({ reviews });
  } catch (err) {
    console.error("[/api/reviews]", err);
    return NextResponse.json({ error: "Could not load reviews." }, { status: 500 });
  }
}
