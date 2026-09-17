import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createElement } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";
import type { FullProfile } from "../api/types";

interface AuthState {
  profile: FullProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isOnboardingComplete: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

// Shared auth/profile state via context, so a login in one screen (e.g. the
// auth screen) is immediately visible to every other screen (e.g. the root
// layout's redirect logic) instead of each `useAuth()` call holding its own
// disconnected copy of the state.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<FullProfile>("/profile/me");
      setProfile(me);
    } catch {
      await clearToken();
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token } = await api.post<{ token: string }>("/auth/login", { email, password });
      await setToken(token);
      await refresh();
    },
    [refresh]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const { token } = await api.post<{ token: string }>("/auth/register", { email, password });
      await setToken(token);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await clearToken();
    setProfile(null);
  }, []);

  const isOnboardingComplete = Boolean(
    profile?.profile?.displayName && profile?.profile?.photoUrl && profile?.profile?.level && profile.activities.length > 0
  );

  return createElement(
    AuthContext.Provider,
    { value: { profile, loading, login, register, logout, refresh, isOnboardingComplete } },
    children
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
