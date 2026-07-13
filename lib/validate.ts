/* ============================================================
   PixelRent — request validation helpers (shared shapes with
   the client-side checks in the auth modal).
   ============================================================ */

export const EMAIL_RE = /^[^\s@]+@gmail\.com$/i;
export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export const PASSWORD_MIN = 8;
export const PH_POSTAL_RE = /^\d{4}$/;
export const PHONE_RE = /^[0-9+]{10,13}$/;

export type FieldErrors = Record<string, string>;

type ValidationBody = Record<string, unknown> & { address?: Record<string, unknown> };

function asRecord(value: unknown): ValidationBody | null {
  return typeof value === "object" && value !== null ? (value as ValidationBody) : null;
}

export function validateRegister(body: unknown): FieldErrors {
  const data = asRecord(body);
  const errors: FieldErrors = {};
  if (!USERNAME_RE.test(String(data?.username ?? "")))
    errors.username = "Username must be 3–16 letters, numbers, or underscores.";
  if (!EMAIL_RE.test(String(data?.email ?? ""))) errors.email = "Enter a valid email address.";
  if (String(data?.password ?? "").length < PASSWORD_MIN)
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  if (!data?.firstName) errors.firstName = "First name is required.";
  if (!data?.lastName) errors.lastName = "Last name is required.";
  if (!PHONE_RE.test(String(data?.phone ?? ""))) errors.phone = "Enter a valid phone number.";
  if (!data?.gender) errors.gender = "Select a gender.";
  if (!data?.dob) errors.dob = "Date of birth is required.";
  const a = asRecord(data?.address) ?? {};
  if (!String(a.street ?? "")) errors.street = "Street address is required.";
  if (!String(a.barangay ?? "")) errors.barangay = "Barangay is required.";
  if (!String(a.city ?? "")) errors.city = "City / municipality is required.";
  if (!String(a.province ?? "")) errors.province = "Province is required.";
  if (!String(a.region ?? "")) errors.region = "Select a region.";
  if (!PH_POSTAL_RE.test(String(a.postal ?? ""))) errors.postal = "Postal code must be 4 digits.";
  return errors;
}

export function validateCheckout(body: unknown): string | null {
  const data = asRecord(body);
  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) return "No items to check out.";
  for (const item of items) {
    const entry = asRecord(item);
    if (typeof entry?.gameId !== "string") return "Invalid item.";
    if (!Number.isInteger(entry?.qty) || Number(entry?.qty) < 1) return "Invalid quantity.";
    if (typeof entry?.end !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.end))
      return "Invalid rent end date.";
  }
  if (typeof data?.paymentMethod !== "string" || !data.paymentMethod)
    return "Select a payment method.";
  return null;
}
