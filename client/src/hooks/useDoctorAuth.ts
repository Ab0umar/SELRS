import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "doctor_portal_token";
const META_KEY = "doctor_portal_meta";
const AUTH_EVENT = "doctor_portal_auth_changed";

export type DoctorAuthState = {
  token: string | null;
  doctorId: number | null;
  fullName: string | null;
  username: string | null;
  isLoggedIn: boolean;
  login: (
    token: string,
    doctor: { id: number; fullName: string; username: string },
  ) => void;
  logout: () => void;
};

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function useDoctorAuth(): DoctorAuthState {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [doctorMeta, setDoctorMeta] = useState<{
    id: number;
    fullName: string;
    username: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const payload = token ? decodeJwtPayload(token) : null;
  const isLoggedIn = Boolean(
    payload?.type === "externalDoctor" && payload?.doctorId,
  );

  const syncFromStorage = useCallback(() => {
    try {
      const nextToken = localStorage.getItem(STORAGE_KEY);
      const nextMetaRaw = localStorage.getItem(META_KEY);
      setToken(nextToken);
      setDoctorMeta(nextMetaRaw ? JSON.parse(nextMetaRaw) : null);
    } catch {
      setToken(null);
      setDoctorMeta(null);
    }
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === META_KEY) syncFromStorage();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_EVENT, syncFromStorage);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    if (token && !isLoggedIn) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(META_KEY);
      setToken(null);
      setDoctorMeta(null);
    }
  }, [token, isLoggedIn]);

  const login = useCallback(
    (
      newToken: string,
      doctor: { id: number; fullName: string; username: string },
    ) => {
      localStorage.setItem(STORAGE_KEY, newToken);
      localStorage.setItem(META_KEY, JSON.stringify(doctor));
      setToken(newToken);
      setDoctorMeta(doctor);
      window.dispatchEvent(new Event(AUTH_EVENT));
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(META_KEY);
    setToken(null);
    setDoctorMeta(null);
    window.dispatchEvent(new Event(AUTH_EVENT));
  }, []);

  return {
    token,
    doctorId: isLoggedIn ? Number(payload?.doctorId) : null,
    fullName: doctorMeta?.fullName ?? null,
    username: doctorMeta?.username ?? null,
    isLoggedIn,
    login,
    logout,
  };
}
