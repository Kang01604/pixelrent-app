"use client";

import { useEffect, useRef, useState } from "react";
import {
  Header, Footer, PillButton, Toast, PageId, PixelGamepadIcon,
  UserProfile, Address, AppNotification, PH_REGIONS,
  AuthField, AuthSelect, emptyAddress, formatAddress, displayDate,
} from "./shared";

/* ============================================================
   PixelRent — Account Settings (1:1 with the design frames)

   NOTE: modals are rendered OUTSIDE the glass cards — backdrop-blur
   creates a CSS containing block, which would trap fixed overlays
   inside the card instead of covering the screen.
   ============================================================ */

type Tab = "profile" | "addresses" | "password" | "privacy";

const TABS: { id: Tab; label: string; title: string }[] = [
  { id: "profile", label: "Profile", title: "My Account" },
  { id: "addresses", label: "Addresses", title: "Delivery Address" },
  { id: "password", label: "Password", title: "Password and Security" },
  { id: "privacy", label: "Privacy Settings", title: "Privacy Settings" },
];

/* ----------------------- Small pieces ----------------------- */

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[28px] bg-white/20 p-6 shadow-[0_14px_38px_rgba(24,9,31,0.25)] backdrop-blur-md sm:p-8 ${className}`}>
      {children}
    </div>
  );
}

function AvatarCircle({ size = "lg", src }: { size?: "sm" | "lg"; src?: string }) {
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#781ea2] to-[#2dcabd]
        ${size === "lg" ? "h-44 w-44" : "h-12 w-12"}`}
    >
      {src ? (
        <img src={src} alt="Profile" className="h-full w-full object-cover" />
      ) : (
        <PixelGamepadIcon className={`text-white ${size === "lg" ? "h-14 w-auto" : "h-5 w-auto"}`} />
      )}
    </div>
  );
}

/* Light (white-card) form controls for the New Address popup. */
const lightInputClass = `w-full rounded-lg border border-[#3a3a3a]/40 bg-white px-3 py-2.5 font-condensed text-base
  text-[#1c1c1c] placeholder-[#1c1c1c]/40 outline-none transition
  focus:border-[#6d2f98] focus:ring-2 focus:ring-[#6d2f98]/30`;

function LightField({
  value,
  onChange,
  placeholder,
  maxLength,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
  label: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-label={label}
      className={lightInputClass}
    />
  );
}

/* ----------------------- Address pop-out (design 1:1) ----------------------- */

function AddressModal({
  title,
  initial,
  isDefault,
  onSave,
  onClose,
}: {
  title: string;
  initial: Address;
  isDefault: boolean;
  onSave: (a: Address, makeDefault: boolean) => void;
  onClose: () => void;
}) {
  const [addr, setAddr] = useState<Address>({ ...initial });
  const [makeDefault, setMakeDefault] = useState(isDefault);
  const set = (patch: Partial<Address>) => setAddr((a) => ({ ...a, ...patch }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="animate-overlayIn fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto
                 bg-[#200032]/60 p-4 backdrop-blur-md sm:p-6"
    >
      {/* Glass shell */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-popIn relative my-auto w-full max-w-xl rounded-[28px] bg-[#cfa6e6]/40 p-5
                   shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-6"
      >
        <div className="flex items-center justify-between px-1">
          <h2 className="font-condensed text-3xl text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-full text-white outline-none transition
                       hover:rotate-90 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-6 w-6" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* White card, like the frame */}
        <div className="mt-4 rounded-2xl bg-[#f3eef8] p-5 sm:p-7">
          <h3 className="font-condensed text-xl font-bold text-[#1c1c1c]">Contact Information</h3>
          <hr className="mt-2 border-[#3a3a3a]/30" />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <LightField label="First Name" value={addr.firstName} onChange={(v) => set({ firstName: v })} placeholder="First Name" />
            <LightField label="Last Name" value={addr.lastName} onChange={(v) => set({ lastName: v })} placeholder="Last Name" />
          </div>
          <div className="mt-3 sm:w-1/2 sm:pr-1.5">
            <LightField
              label="Contact Number"
              value={addr.phone}
              onChange={(v) => set({ phone: v.replace(/[^0-9+]/g, "") })}
              placeholder="Contact Number"
              maxLength={13}
            />
          </div>

          <h3 className="mt-6 font-condensed text-xl font-bold text-[#1c1c1c]">Address</h3>
          <hr className="mt-2 border-[#3a3a3a]/30" />

          <div className="mt-4 space-y-3">
            <LightField
              label="Street Name, Building, House No."
              value={addr.street}
              onChange={(v) => set({ street: v })}
              placeholder="Street Name, Building, House No., Street"
            />
            <LightField label="Barangay" value={addr.barangay} onChange={(v) => set({ barangay: v })} placeholder="Barangay" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <select
                value={addr.region}
                onChange={(e) => set({ region: e.target.value })}
                aria-label="Region"
                className={`${lightInputClass} cursor-pointer ${addr.region ? "" : "text-[#1c1c1c]/40"}`}
              >
                <option value="" disabled>
                  Region
                </option>
                {PH_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <LightField label="Province" value={addr.province} onChange={(v) => set({ province: v })} placeholder="Province" />
              <LightField label="City / Municipality" value={addr.city} onChange={(v) => set({ city: v })} placeholder="City" />
              <LightField
                label="Postal Code"
                value={addr.postal}
                onChange={(v) => set({ postal: v.replace(/\D/g, "").slice(0, 4) })}
                placeholder="Postal Code"
                maxLength={4}
              />
            </div>
          </div>

          {/* Set as default — purple outlined checkbox, like the frame */}
          <label className="mt-5 flex cursor-pointer items-center gap-2.5 font-condensed text-lg text-[#1c1c1c]">
            <button
              type="button"
              role="checkbox"
              aria-checked={makeDefault}
              onClick={() => setMakeDefault((v) => !v)}
              className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 border-[#6d2f98] outline-none
                transition focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-90
                ${makeDefault ? "bg-[#6d2f98]" : "bg-transparent hover:bg-[#6d2f98]/15"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                className={`h-3.5 w-3.5 transition ${makeDefault ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
            Set as default
          </label>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#6b6470] px-8 py-2 font-condensed text-lg text-white outline-none transition
                         hover:bg-[#7d7683] focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95"
            >
              Cancel
            </button>
            <PillButton variant="gradient" size="sm" onClick={() => onSave(addr, makeDefault)}>
              Save
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Tab bodies ----------------------- */

function ProfileTab({
  user,
  onUpdate,
  onToast,
}: {
  user: UserProfile;
  onUpdate: (u: UserProfile) => void;
  onToast: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>({ ...user });
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft({ ...user });
    setEditing(true);
  };

  /* Profile picture: read the chosen file as a data-URL but only save it
     when the user confirms. */
  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAvatarUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  };
  const saveAvatar = () => {
    if (!pendingAvatarUrl) return;
    onUpdate({ ...user, avatarUrl: pendingAvatarUrl });
    setPendingAvatarUrl(null);
    onToast("Profile picture updated!");
  };
  const saveProfile = () => {
    onUpdate(draft);
    setEditing(false);
    onToast("Profile updated!");
  };

  const row = "flex items-baseline justify-between gap-6 font-condensed text-xl text-white";

  return (
    <GlassCard className="max-w-4xl">
      <h2 className="font-condensed text-2xl text-white">Profile</h2>
      <p className="font-condensed text-sm text-white/80">Manage and protect your account</p>
      <hr className="mt-3 border-white/50" />

      {!editing ? (
        <div className="mt-8 flex flex-col items-center gap-10 pb-2 lg:flex-row lg:items-center lg:gap-14 lg:pl-4">
          {/* Avatar with pencil badge — opens the photo picker */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <AvatarCircle src={pendingAvatarUrl ?? user.avatarUrl} />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              <button
                type="button"
                aria-label="Change profile photo"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-white text-[#18091f]
                           shadow outline-none transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5" aria-hidden="true">
                  <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            </div>
            {pendingAvatarUrl && (
              <div className="mt-4 flex gap-3">
                <PillButton variant="outline" size="sm" onClick={() => setPendingAvatarUrl(null)}>
                  Cancel
                </PillButton>
                <PillButton variant="gradient" size="sm" onClick={saveAvatar}>
                  Save
                </PillButton>
              </div>
            )}
          </div>

          {/* Info rows — username separated by its own divider, like the frame */}
          <div className="w-full min-w-0 max-w-xl flex-1">
            <div className={`${row} border-b border-white/50 pb-3`}>
              <span>Username</span>
              <span>{user.username}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className={row}><span>First Name</span><span>{user.firstName}</span></div>
              <div className={row}><span>Last Name</span><span>{user.lastName}</span></div>
              <div className={row}><span>Email</span><span className="truncate">{user.email}</span></div>
              <div className={row}><span>Phone Number</span><span>{user.phone}</span></div>
              <div className={row}><span>Gender</span><span>{user.gender}</span></div>
              <div className={row}><span>Date of Birth</span><span>{displayDate(user.dob)}</span></div>
            </div>
            <div className="mt-7 flex justify-end">
              <PillButton variant="gradient" size="sm" onClick={startEdit}>
                Edit
              </PillButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-xl space-y-4">
          <AuthField label="Username" value={draft.username} onChange={(v) => setDraft({ ...draft, username: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label="First Name" value={draft.firstName} onChange={(v) => setDraft({ ...draft, firstName: v })} />
            <AuthField label="Last Name" value={draft.lastName} onChange={(v) => setDraft({ ...draft, lastName: v })} />
          </div>
          <AuthField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label="Phone Number" type="tel" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v.replace(/[^0-9+]/g, "") })} maxLength={13} />
            <AuthSelect label="Gender" value={draft.gender} onChange={(v) => setDraft({ ...draft, gender: v })} options={["Male", "Female", "Prefer not to say"]} />
          </div>
          <AuthField label="Date of Birth" type="date" value={draft.dob} onChange={(v) => setDraft({ ...draft, dob: v })} />
          <div className="flex justify-end gap-3 pt-1">
            <PillButton variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </PillButton>
            <PillButton variant="gradient" size="sm" onClick={saveProfile}>
              Save
            </PillButton>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function AddressesTab({
  user,
  onUpdate,
  onToast,
}: {
  user: UserProfile;
  onUpdate: (u: UserProfile) => void;
  onToast: (m: string) => void;
}) {
  const [modal, setModal] = useState<{ title: string; addr: Address; isNew: boolean } | null>(null);

  const defaultAddr = user.addresses.find((a) => a.id === user.defaultAddressId) ?? null;
  const others = user.addresses.filter((a) => a.id !== user.defaultAddressId);

  const smallBtn = `rounded-full border border-[#b23df2]/60 bg-[#18091f]/60 px-5 py-1 font-condensed text-base text-white
    outline-none transition hover:border-[#15f5ea] hover:bg-[#18091f]/80 focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95`;

  const save = (addr: Address, makeDefault: boolean, isNew: boolean) => {
    const addresses = isNew
      ? [...user.addresses, addr]
      : user.addresses.map((a) => (a.id === addr.id ? addr : a));
    onUpdate({
      ...user,
      addresses,
      defaultAddressId: makeDefault ? addr.id : user.defaultAddressId ?? addr.id,
    });
    setModal(null);
    onToast(isNew ? "Address added!" : "Address updated!");
  };

  const remove = (id: string) => {
    onUpdate({ ...user, addresses: user.addresses.filter((a) => a.id !== id) });
    onToast("Address deleted.");
  };

  return (
    <>
      <GlassCard className="max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-condensed text-2xl font-bold text-white sm:text-3xl">My Addresses</h2>
          <PillButton
            variant="gradient"
            size="sm"
            onClick={() => setModal({ title: "New Address", addr: emptyAddress(), isNew: true })}
          >
            + Address
          </PillButton>
        </div>
        <hr className="mt-3 border-white/40" />

        {/* Default */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-condensed text-xl font-bold text-white">Default Address</h3>
            {defaultAddr && (
              <button type="button" className={smallBtn} onClick={() => setModal({ title: "Edit Address", addr: defaultAddr, isNew: false })}>
                Edit
              </button>
            )}
          </div>
          {defaultAddr ? (
            <div className="mt-2 font-condensed text-white/90">
              <p className="text-lg">
                {defaultAddr.firstName} {defaultAddr.lastName} | {defaultAddr.phone}
              </p>
              <p className="text-base text-white/75">{formatAddress(defaultAddr)}</p>
            </div>
          ) : (
            <p className="mt-2 font-condensed text-base text-white/60">No default address set.</p>
          )}
        </div>

        <hr className="mt-5 border-white/30" />

        {/* Others */}
        <div className="mt-4">
          <h3 className="font-condensed text-xl font-bold text-white/90">Other Addresses</h3>
          {others.length === 0 ? (
            <p className="mt-2 font-condensed text-base text-white/60">No other addresses.</p>
          ) : (
            <ul className="mt-2 space-y-4">
              {others.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 font-condensed text-white/90">
                    <p className="text-lg">
                      {a.firstName} {a.lastName} | {a.phone}
                    </p>
                    <p className="text-base text-white/75">{formatAddress(a)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className={smallBtn} onClick={() => setModal({ title: "Edit Address", addr: a, isNew: false })}>
                      Edit
                    </button>
                    <button type="button" className={smallBtn} onClick={() => remove(a.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </GlassCard>

      {/* Pop-out — rendered OUTSIDE the glass card so it overlays the screen */}
      {modal && (
        <AddressModal
          title={modal.title}
          initial={modal.addr}
          isDefault={modal.addr.id === user.defaultAddressId}
          onClose={() => setModal(null)}
          onSave={(addr, makeDefault) => save(addr, makeDefault, modal.isNew)}
        />
      )}
    </>
  );
}

function PasswordTab({ onToast }: { onToast: (m: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    if (pw !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setEditing(false);
    setPw("");
    setConfirm("");
    setError("");
    onToast("Password updated!");
  };

  return (
    <GlassCard className="max-w-3xl">
      <h2 className="font-condensed text-2xl font-bold text-white sm:text-3xl">Password and Security</h2>
      <hr className="mt-3 border-white/40" />

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="font-condensed text-xl text-white">Password</p>
        <PillButton variant="gradient" size="sm" onClick={() => setEditing((v) => !v)}>
          Edit
        </PillButton>
      </div>

      {editing && (
        <div className="mt-4 space-y-4 rounded-2xl bg-black/20 p-5">
          <AuthField label="New Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" />
          <AuthField label="Confirm New Password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
          {error && <p className="font-condensed text-base text-[#ff8fa3]">{error}</p>}
          <div className="flex justify-end gap-3">
            <PillButton variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </PillButton>
            <PillButton variant="gradient" size="sm" onClick={save}>
              Save
            </PillButton>
          </div>
        </div>
      )}

    </GlassCard>
  );
}

function PrivacyTab({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <GlassCard className="max-w-3xl">
        <h2 className="font-condensed text-2xl font-bold text-white sm:text-3xl">Account Deletion</h2>
        <hr className="mt-3 border-white/40" />

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="font-condensed text-xl text-white">Request Account Deletion</p>
          <PillButton variant="gradient" size="sm" onClick={() => setConfirming(true)}>
            Delete
          </PillButton>
        </div>
      </GlassCard>

      {/* Confirm pop-out — outside the glass card, same containing-block reason */}
      {confirming && (
        <div
          onClick={() => setConfirming(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm account deletion"
          className="animate-overlayIn fixed inset-0 z-[60] flex items-center justify-center bg-[#200032]/70 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-popIn w-full max-w-sm rounded-[28px] bg-[#cfa6e6]/30 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <h3 className="font-condensed text-2xl font-bold text-white">Delete your account?</h3>
            <p className="mt-2 font-condensed text-base text-white/80">
              This will log you out and remove your profile. This can't be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <PillButton variant="outline" size="sm" className="flex-1" onClick={() => setConfirming(false)}>
                Cancel
              </PillButton>
              <PillButton variant="gradient" size="sm" className="flex-1" onClick={onDelete}>
                Delete
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ----------------------- Page ----------------------- */

export default function SettingsPage({
  onNavigate,
  user,
  onUpdateUser,
  onLogout,
  cartCount,
  notifications,
  onNotificationsOpened,
  onAuth,
}: {
  onNavigate: (id: PageId) => void;
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
  cartCount: number;
  notifications: AppNotification[];
  onNotificationsOpened: () => void;
  onAuth: (mode: "login" | "register") => void;
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const [toast, setToast] = useState("");

  const title = TABS.find((t) => t.id === tab)!.title;

  const logoutAndHome = () => {
    onLogout();
    onNavigate("home");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#9a4fc4] via-[#6f74c1] to-[#5fc7c1] font-condensed">
      <Header
        activeId="settings"
        onNavigate={onNavigate}
        cartCount={cartCount}
        loggedIn
        onLogout={onLogout}
        onAuth={onAuth}
        notifications={notifications}
        onNotificationsOpened={onNotificationsOpened}
        avatarUrl={user.avatarUrl}
      />

      <div className="flex flex-1 flex-col pt-[80px] lg:flex-row lg:pt-[104px]">
        {/* --- White sidebar --- */}
        <aside className="flex flex-col bg-white px-6 py-8 lg:min-h-full lg:w-80 lg:px-8">
          <div className="flex items-center gap-4">
            <AvatarCircle size="sm" src={user.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate font-condensed text-xl font-bold text-[#6d2f98]">{user.username}</p>
              <p className="truncate font-condensed text-sm text-[#3a3a3a]/70">
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
          <hr className="mt-5 border-[#3a3a3a]/25" />

          <nav aria-label="Account settings" className="mt-6 flex flex-row flex-wrap gap-1 lg:flex-col lg:gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-left font-condensed text-xl outline-none transition sm:text-2xl
                  hover:text-[#6d2f98] focus-visible:ring-2 focus-visible:ring-[#15f5ea] active:scale-95
                  ${tab === t.id ? "font-bold text-[#6d2f98]" : "text-[#3a3a3a]/60"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* decorative gradient bar + dots, like the frame */}
          <div className="mt-8 hidden flex-col items-start gap-6 lg:flex" aria-hidden="true">
            <span className="h-40 w-4 rounded-full bg-gradient-to-b from-[#781ea2] to-[#2dcabd]" />
            <span className="ml-0.5 h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#781ea2] to-[#2dcabd]" />
          </div>

          <div className="mt-8 lg:mt-auto">
            <PillButton variant="gradient" size="sm" className="w-full lg:w-auto lg:min-w-[13rem]" onClick={logoutAndHome}>
              Logout
            </PillButton>
          </div>
        </aside>

        {/* --- Main content --- */}
        <main className="min-w-0 flex-1 px-4 pb-20 pt-10 sm:px-10 lg:px-14">
          <h1 className="font-condensed text-3xl text-white sm:text-4xl">{title}</h1>
          <hr className="mt-4 border-white/50" />

          <div className="mt-8">
            {tab === "profile" && <ProfileTab user={user} onUpdate={onUpdateUser} onToast={setToast} />}
            {tab === "addresses" && <AddressesTab user={user} onUpdate={onUpdateUser} onToast={setToast} />}
            {tab === "password" && <PasswordTab onToast={setToast} />}
            {tab === "privacy" && <PrivacyTab onDelete={logoutAndHome} />}
          </div>
        </main>
      </div>

      <div className="relative h-[3px] bg-gradient-to-r from-[#2dcabd] via-[#15f5ea] to-[#2dcabd] shadow-[0_0_12px_#15f5ea]" />
      <Footer />

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
