import { getLoginUrl } from "@/const";
import { NATIVE_USER_SNAPSHOT_KEY, hydrateDurableValue, removeDurableValue, saveDurableValue } from "@/lib/nativeStorage";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

const readStoredUserSnapshot = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem("user") ?? window.sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const persistSessionUser = (user: unknown, options?: { nativePersistent?: boolean }) => {
  if (typeof window === "undefined") return;
  const usePersistentStorage =
    options?.nativePersistent ?? (Capacitor.isNativePlatform() || window.localStorage.getItem("remember_me") !== "0");
  const preferredStorage = usePersistentStorage ? window.localStorage : window.sessionStorage;
  const secondaryStorage = usePersistentStorage ? window.sessionStorage : window.localStorage;

  if (!user) {
    preferredStorage.removeItem("user");
    secondaryStorage.removeItem("user");
    void removeDurableValue(NATIVE_USER_SNAPSHOT_KEY, "user");
    return;
  }

  const serializedUser = JSON.stringify(user);
  window.localStorage.setItem("manus-runtime-user-info", serializedUser);
  preferredStorage.setItem("user", serializedUser);
  secondaryStorage.removeItem("user");
  void saveDurableValue(NATIVE_USER_SNAPSHOT_KEY, serializedUser, "user");
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const clearStoredSession = useCallback(async () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("user");
    window.localStorage.removeItem("token");
    window.sessionStorage.removeItem("user");
    window.sessionStorage.removeItem("token");
    await removeDurableValue(NATIVE_USER_SNAPSHOT_KEY, "user");
  }, []);
  const getPreferredStorage = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (Capacitor.isNativePlatform()) return window.localStorage;
    return window.localStorage.getItem("remember_me") === "0"
      ? window.sessionStorage
      : window.localStorage;
  }, []);
  const [storedUser, setStoredUser] = useState(() => readStoredUserSnapshot());

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async (options?: { redirectToLogin?: boolean }) => {
    const redirectToLogin = options?.redirectToLogin ?? true;
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      await clearStoredSession();
      setStoredUser(null);
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      if (redirectToLogin && typeof window !== "undefined") {
        // Desktop app blocks location.replace — use allowReloadOnce flag to bypass the guard
        if ((window as any).__SELRS_DESKTOP) {
          (window as any).__allowReloadOnce = true;
        }
        window.location.replace(getLoginUrl());
      }
    }
  }, [clearStoredSession, logoutMutation, setLocation, utils]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? storedUser ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data ?? storedUser),
    }),
    [
      meQuery.data,
      meQuery.error,
      meQuery.isLoading,
      logoutMutation.error,
      logoutMutation.isPending,
      storedUser,
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (meQuery.data) {
      const preferredStorage = getPreferredStorage();
      persistSessionUser(meQuery.data, {
        nativePersistent: preferredStorage === window.localStorage,
      });
      setStoredUser(meQuery.data);
    }
  }, [getPreferredStorage, meQuery.data]);

  useEffect(() => {
    if (storedUser) return;
    void hydrateDurableValue(NATIVE_USER_SNAPSHOT_KEY, "user").then((raw) => {
      if (!raw) return;
      try {
        setStoredUser(JSON.parse(raw));
      } catch {
        // Ignore invalid durable user snapshots.
      }
    });
  }, [storedUser]);

  useEffect(() => {
    if (!(meQuery.error instanceof TRPCClientError)) return;
    if (meQuery.error.data?.code !== "UNAUTHORIZED" && meQuery.error.data?.httpStatus !== 401) return;
    void clearStoredSession();
    setStoredUser(null);
  }, [clearStoredSession, meQuery.error]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    setLocation(redirectPath);
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
    setLocation,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
