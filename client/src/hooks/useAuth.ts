import { persistSessionUser, useAuth as useCoreAuth } from "@/_core/hooks/useAuth";

export function useAuth() {
  return useCoreAuth();
}

export { persistSessionUser };
