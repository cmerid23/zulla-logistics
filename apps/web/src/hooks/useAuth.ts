import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AuthUser, LoginInput, RegisterInput } from "@zulla/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth.store";
import { subscribeToPush } from "../pwa/pushManager";

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
}

export function useAuth() {
  const { user, accessToken, setSession, clear } = useAuthStore();

  // Try to silently refresh on first mount so a returning visitor with a valid
  // refresh cookie lands authenticated without a flash.
  const triedRefresh = useRef(false);
  useEffect(() => {
    if (triedRefresh.current || accessToken) return;
    triedRefresh.current = true;
    void api.refresh();
  }, [accessToken]);

  const login = useMutation({
    mutationFn: (input: LoginInput) => api.post<LoginResponse>("/auth/login", input),
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.expiresAt);
      // Best-effort push subscription on login. Caller can also call subscribeToPush manually.
      void subscribeToPush().catch(() => undefined);
    },
  });

  const register = useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post<{ message: string }>("/auth/register", input),
  });

  const logout = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSettled: () => clear(),
  });

  return {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken),
    login,
    register,
    logout,
  };
}
