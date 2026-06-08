import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";

/**
 * Returns `canAccess(path)` — true when the current user has permission for
 * that path. Shares the cached `getMyPermissions` result so there is no extra
 * network request. Admin always returns true.
 */
export function usePermissions() {
  const { user } = useAuth();
  const userRole = String(user?.role ?? "").toLowerCase();
  const isAdmin = userRole === "admin";

  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && !isAdmin,
    refetchOnWindowFocus: false,
  });

  const allowedRoots = useMemo(
    () => permissionsToAllowedRoots((permissionsQuery.data ?? []) as string[]),
    [permissionsQuery.data],
  );

  const canAccess = useMemo(
    () =>
      (path: string): boolean => {
        if (isAdmin) return true;
        if (!permissionsQuery.isSuccess) return false;
        const clean = normalizeNavPath(path.split("?")[0]);
        return pathGrantedByRoots(clean, allowedRoots);
      },
    [isAdmin, permissionsQuery.isSuccess, allowedRoots],
  );

  return {
    canAccess,
    /** True once permissions have loaded (or the user is admin). */
    isLoaded: isAdmin || permissionsQuery.isSuccess,
    isAdmin,
  };
}
