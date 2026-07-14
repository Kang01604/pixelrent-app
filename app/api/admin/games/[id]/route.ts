import { NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import { requireAdmin, adminErrorResponse, AdminError } from "../../../../../lib/adminAuth";
import type { Platform } from "../../../../../lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLATFORMS: Platform[] = ["PS5", "XBOX", "PC", "SWITCH"];

/** PATCH /api/admin/games/[id] — update stock, fields, or archive state.
    Only whitelisted fields can be changed. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const { id } = params;
    const body = await req.json().catch(() => null);
    if (!body) throw new AdminError("Invalid request body.", 400);

    const ref = adminDb.collection("games").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AdminError("Game not found.", 404);

    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new AdminError("Name can't be empty.", 400);
      update.name = name;
    }
    if (body.platform !== undefined) {
      const p = String(body.platform).toUpperCase() as Platform;
      if (!PLATFORMS.includes(p)) throw new AdminError("Invalid platform.", 400);
      update.platform = p;
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) throw new AdminError("Invalid price.", 400);
      update.price = price;
    }
    if (body.itemsLeft !== undefined) {
      const itemsLeft = Number(body.itemsLeft);
      if (!Number.isInteger(itemsLeft) || itemsLeft < 0)
        throw new AdminError("Stock must be a whole number.", 400);
      update.itemsLeft = itemsLeft;
    }
    if (body.publisher !== undefined) update.publisher = String(body.publisher).trim();
    if (body.description !== undefined) update.description = String(body.description).trim();
    if (body.coverUrl !== undefined) update.coverUrl = String(body.coverUrl).trim();
    if (body.archived !== undefined) update.archived = Boolean(body.archived);

    if (Object.keys(update).length === 0) {
      throw new AdminError("Nothing to update.", 400);
    }

    await ref.set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
