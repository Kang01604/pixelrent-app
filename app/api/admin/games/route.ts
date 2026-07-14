import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { requireAdmin, adminErrorResponse, AdminError } from "../../../../lib/adminAuth";
import type { Game, Platform } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLATFORMS: Platform[] = ["PS5", "XBOX", "PC", "SWITCH"];

/** GET /api/admin/games — every game, including archived ones. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const snap = await adminDb.collection("games").get();
    const games = snap.docs
      .map((d) => d.data() as Game)
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ games });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "game"
  );
}

/** POST /api/admin/games — create a new game. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => null);
    if (!body) throw new AdminError("Invalid request body.", 400);

    const name = String(body.name ?? "").trim();
    const platform = String(body.platform ?? "").toUpperCase() as Platform;
    const price = Number(body.price);
    const itemsLeft = Number(body.itemsLeft);
    const publisher = String(body.publisher ?? "").trim();
    const description = String(body.description ?? "").trim();
    const coverUrl = String(body.coverUrl ?? "").trim();

    if (!name) throw new AdminError("Name is required.", 400);
    if (!PLATFORMS.includes(platform)) throw new AdminError("Invalid platform.", 400);
    if (!Number.isFinite(price) || price < 0) throw new AdminError("Invalid price.", 400);
    if (!Number.isInteger(itemsLeft) || itemsLeft < 0)
      throw new AdminError("Stock must be a whole number.", 400);

    const id = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const game: Game = {
      id,
      name,
      platform,
      price,
      rating: 0,
      gradient: { from: "#3a1a5c", to: "#15b8c4" }, // on-theme default
      coverUrl,
      publisher,
      description,
      itemsLeft,
      sales: 0,
      addedAt: Date.now(),
      reviewCount: 0,
      archived: false,
    };

    await adminDb.collection("games").doc(id).set(game);
    return NextResponse.json({ game });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
