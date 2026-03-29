export type StoredUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

const KEY = "prepai_user_v1";

export function saveUser(user: StoredUser) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function loadUser(): StoredUser | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function clearUser() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

