type RegisteredUser = {
  email: string;
  password: string;
  profile: Record<string, unknown>;
};

type AuthStore = {
  registeredUsers: RegisteredUser[];
};

const globalStore = globalThis as typeof globalThis & {
  __pixelrentAuthStore?: AuthStore;
};

if (!globalStore.__pixelrentAuthStore) {
  globalStore.__pixelrentAuthStore = { registeredUsers: [] };
}

export function saveRegisteredUser(user: RegisteredUser) {
  const store = globalStore.__pixelrentAuthStore!;
  const existing = store.registeredUsers.findIndex((entry) => entry.email === user.email);
  if (existing >= 0) {
    store.registeredUsers[existing] = user;
  } else {
    store.registeredUsers.push(user);
  }
}

export function findRegisteredUser(email: string) {
  const store = globalStore.__pixelrentAuthStore!;
  return store.registeredUsers.find((entry) => entry.email === email);
}
