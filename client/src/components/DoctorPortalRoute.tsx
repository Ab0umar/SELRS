import { type ReactNode } from "react";
import { Redirect } from "wouter";
import { useDoctorAuth } from "@/hooks/useDoctorAuth";

export default function DoctorPortalRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { isLoggedIn } = useDoctorAuth();
  if (!isLoggedIn) return <Redirect to="/doctor-portal/login" />;
  return <>{children}</>;
}
