import { useAuth } from "@/_core/hooks/useAuth";
import { medicalAssistantRoles } from "@shared/medical-assistant";

/** Mirrors the server's medicalAssistantProcedure role gate; the server stays authoritative. */
export function useMedicalAssistantAccess() {
  const { user } = useAuth();
  return (medicalAssistantRoles as readonly string[]).includes(user?.role ?? "");
}
