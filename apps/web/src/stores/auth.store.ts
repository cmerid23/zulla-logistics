import { create } from "zustand";
import type { AuthUser } from "@zulla/shared";

/**
 * Access token lives in memory only — never localStorage. The refresh token is an
 * httpOnly cookie set by the API and is invisible to JS.
 *
 * `user` is persisted to sessionStorage purely for UX (so a page reload doesn't
 * blank the chrome before /auth/refresh resolves). It is treated as a hint, not a
 * source of truth — every protected fetch goes through the access token.
 */

const USER_KEY = "zulla.user";

function loadUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(USER_KEY);
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  expiresAt: number | null;
  setSession: (user: AuthUser, accessToken: string, expiresAt: number) => void;
  setAccess: (accessToken: string, expiresAt: number) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  accessToken: null,
  expiresAt: null,
  setSession: (user, accessToken, expiresAt) => {
    saveUser(user);
    set({ user, accessToken, expiresAt });
  },
  setAccess: (accessToken, expiresAt) => set({ accessToken, expiresAt }),
  clear: () => {
    saveUser(null);
    set({ user: null, accessToken: null, expiresAt: null });
  },
}));
