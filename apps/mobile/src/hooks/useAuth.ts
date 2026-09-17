import { useCallback, useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";
import type { FullProfile } from "../api/types";

// Minimal auth/profile store shared across screens. A real app would lift this
// into a context provider; kept as a hook here to keep the scaffold small.
export function useAuth() {
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

  return { profile, loading, login, register, logout, refresh, isOnboardingComplete };
}
