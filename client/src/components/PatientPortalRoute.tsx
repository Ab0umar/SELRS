import { type ReactNode } from "react";
import { Redirect } from "wouter";
import { usePatientAuth } from "@/hooks/usePatientAuth";

export default function PatientPortalRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = usePatientAuth();
  if (!isLoggedIn) return <Redirect to="/my/login" />;
  return <>{children}</>;
}
