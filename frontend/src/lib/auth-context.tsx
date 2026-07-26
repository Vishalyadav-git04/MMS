import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  clearSession,
  getStoredUser,
  getToken,
  setSession,
  type AuthRole,
  type AuthUser,
} from "@/lib/auth";

type LoginResponse = {
  access_token: string;
  token_type: string;
  username: string;
  display_name: string | null;
  role: string;
  unit_id: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toUser(res: LoginResponse): AuthUser {
  const role = (res.role || "UNIT").toUpperCase() as AuthRole;
  return {
    username: res.username,
    displayName: res.display_name || res.username,
    role: role === "ADMIN" ? "ADMIN" : "UNIT",
    unitId: res.unit_id,
    accessToken: res.access_token,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (token && stored) return { ...stored, accessToken: token };
    return null;
  });

  const login = useCallback(async (username: string, password: string) => {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      skipAuth: true,
    });
    const next = toUser(res);
    setSession(next);
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user?.accessToken),
      login,
      logout,
    }),
    [user, login, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
