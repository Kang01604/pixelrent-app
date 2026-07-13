import { NextResponse } from "next/server";
import { findRegisteredUser } from "../../../../lib/auth-store";
import { EMAIL_RE } from "../../../../lib/validate";

/** POST /api/auth/login — SIMULATED. Accepts any well-formed
    credentials and returns the demo profile. Nothing is checked
    against or saved to a database. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!EMAIL_RE.test(email))
    return NextResponse.json({ errors: { email: "Invalid email" } }, { status: 400 });
  if (!password)
    return NextResponse.json({ errors: { password: "Invalid password" } }, { status: 400 });

  const registered = findRegisteredUser(email);
  if (email === "demo@pixelrent.test" && password === "PixelRent123!") {
    // allow the demo account as before
  } else if (registered?.password !== password) {
    return NextResponse.json(
      { errors: { password: "Invalid password" } },
      { status: 401 },
    );
  }

  const profile = registered?.profile
    ? { ...(registered.profile as Record<string, unknown>) }
    : {
        username: "Gamer1234",
        firstName: "Shanky",
        lastName: "Salarzon",
        email,
        phone: "12345678901",
        gender: "Male",
        dob: "2023-07-13",
        addresses: [
          {
            id: "addr-1",
            firstName: "Shanky",
            lastName: "Salarzon",
            phone: "12345678901",
            street: "13 Address, Lorem Ipsum Bldg.",
            barangay: "Lorem Ipsum",
            city: "Meow City",
            province: "Meow Meow",
            region: "NCR – National Capital Region",
            postal: "1234",
          },
          {
            id: "addr-2",
            firstName: "Omby",
            lastName: "Salarzon",
            phone: "12345678902",
            street: "16 Address, Lorem Ipsum St.",
            barangay: "Lorem Ipsum",
            city: "Meow Meow City",
            province: "Meow Meow",
            region: "NCR – National Capital Region",
            postal: "1235",
          },
        ],
        defaultAddressId: "addr-1",
        avatarUrl: "",
      };

  return NextResponse.json({ profile, simulated: true });

}
