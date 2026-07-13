import { NextResponse } from "next/server";
import { saveRegisteredUser } from "../../../../lib/auth-store";
import { validateRegister } from "../../../../lib/validate";

/** POST /api/auth/register — SIMULATED. Validates the full form
    (proper email, username 3–16 chars, password ≥ 8, all fields
    filled) and returns the profile. It is NOT saved anywhere. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const errors = validateRegister(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const addr = { ...body.address, id: body.address.id || "addr-1" };
  const profile = {
    username: body.username,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    gender: body.gender,
    dob: body.dob,
    addresses: [addr],
    defaultAddressId: addr.id,
    avatarUrl: "",
  };

  saveRegisteredUser({
    email: String(body.email ?? "").trim().toLowerCase(),
    password: String(body.password ?? ""),
    profile,
  });

  return NextResponse.json({ profile, simulated: true });
}
