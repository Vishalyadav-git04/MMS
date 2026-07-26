/** Client-side JWT session helpers for MMS login. */

export type AuthRole = "ADMIN" | "UNIT";

export type AuthUser = {
  username: string;
  displayName: string;
  role: AuthRole;
  unitId: string | null;
  accessToken: string;
};

const TOKEN_KEY = "mms_access_token";
const USER_KEY = "mms_auth_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, user.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === "ADMIN";
}
