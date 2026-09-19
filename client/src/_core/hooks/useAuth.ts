import { getLoginUrl } from "@/const";
import {
  NATIVE_USER_SNAPSHOT_KEY,
  removeDurableValue,
} from "@/lib/nativeStorage";
import { clearAllPatientCaches } from "@/lib/patientCacheCleanup";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export const persistSessionUser = (_user: unknown) => {
  if (typeof window === "undefined") return;
  // User/session data must remain in memory and the authenticated HTTP cookie.
  // Remove snapshots written by older versions instead of persisting them again.
  window.localStorage.removeItem("user");
  window.localStorage.removeItem("manus-runtime-user-info");
  window.sessionStorage.removeItem("user");
  void removeDurableValue(NATIVE_USER_SNAPSHOT_KEY, "user");
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
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(
    async (options?: { redirectToLogin?: boolean }) => {
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
        clearAllPatientCaches();
        await clearStoredSession();
        utils.auth.me.setData(undefined, null);
        await utils.auth.me.invalidate();
        if (redirectToLogin && typeof window !== "undefined") {
          // Force a full page reload to clear all cache and session state
          // This prevents redirect loops where Home.tsx thinks user is still authenticated
          window.location.href = getLoginUrl();
        }
      }
    },
    [clearStoredSession, logoutMutation, setLocation, utils],
  );

  const state = useMemo(
    () => ({
      // The server intentionally omits password fields; consumers use the
      // existing public user shape and never receive a password value.
      user: (meQuery.data ?? null) as any,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [
      meQuery.data,
      meQuery.error,
      meQuery.isLoading,
      logoutMutation.error,
      logoutMutation.isPending,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (meQuery.data) persistSessionUser(meQuery.data);
  }, [meQuery.data]);

  useEffect(() => {
    if (!(meQuery.error instanceof TRPCClientError)) return;
    if (
      meQuery.error.data?.code !== "UNAUTHORIZED" &&
      meQuery.error.data?.httpStatus !== 401
    )
      return;
    void clearStoredSession();
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
