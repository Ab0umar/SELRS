import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "patient_portal_token";
const META_KEY = "patient_portal_meta";
const AUTH_EVENT = "patient_portal_auth_changed";

export type PatientAuthState = {
  token: string | null;
  patientId: number | null;
  phone: string | null;
  name: string | null;
  patientCode: string | null;
  isLoggedIn: boolean;
  login: (token: string, patient: { name: string; patientCode: string }) => void;
  logout: () => void;
};

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function usePatientAuth(): PatientAuthState {
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [patientMeta, setPatientMeta] = useState<{ name: string; patientCode: string } | null>(() => {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const payload = token ? decodeJwtPayload(token) : null;
  const isLoggedIn = Boolean(payload?.type === "patient" && payload?.patientId);

  const syncFromStorage = useCallback(() => {
    try {
      const nextToken = localStorage.getItem(STORAGE_KEY);
      const nextMetaRaw = localStorage.getItem(META_KEY);
      const nextMeta = nextMetaRaw ? JSON.parse(nextMetaRaw) : null;
      setToken(nextToken);
      setPatientMeta(nextMeta);
    } catch {
      setToken(null);
      setPatientMeta(null);
    }
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === META_KEY) {
        syncFromStorage();
      }
    };

    const handleAuthChange = () => {
      syncFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    if (token && !isLoggedIn) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(META_KEY);
      setToken(null);
      setPatientMeta(null);
    }
  }, [token, isLoggedIn]);

  const login = useCallback((newToken: string, patient: { name: string; patientCode: string }) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    localStorage.setItem(META_KEY, JSON.stringify(patient));
    setToken(newToken);
    setPatientMeta(patient);
    window.dispatchEvent(new Event(AUTH_EVENT));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(META_KEY);
    setToken(null);
    setPatientMeta(null);
    window.dispatchEvent(new Event(AUTH_EVENT));
  }, []);

  return {
    token,
    patientId: isLoggedIn ? Number(payload?.patientId) : null,
    phone: isLoggedIn ? String(payload?.phone ?? "") : null,
    name: patientMeta?.name ?? null,
    patientCode: patientMeta?.patientCode ?? null,
    isLoggedIn,
    login,
    logout,
  };
}
