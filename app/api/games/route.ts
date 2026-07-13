import { NextResponse } from "next/server";
import { CATALOG } from "../../../lib/catalog";
import { getStock } from "../../../lib/simstore";

/* Stock is live — never let Next prerender this route statically. */
export const dynamic = "force-dynamic";

/** GET /api/games — the catalog with live (simulated) stock. */
export async function GET() {
  const games = CATALOG.map((g) => ({ ...g, itemsLeft: getStock(g.id) }));
  return NextResponse.json({ games });
}
