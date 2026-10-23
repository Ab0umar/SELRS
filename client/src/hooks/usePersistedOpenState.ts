import { useCallback, useEffect, useState } from "react";

/** Reads the '1'/'0' flag stored under key; anything else (or a failed read) falls back. */
export function readPersistedOpen(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

/** Stores the '1'/'0' flag under key. Storage can be unavailable or throw, so failures are ignored. */
export function writePersistedOpen(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Private mode or full quota: the page works, the flag just does not persist.
  }
}

/** Disclosure open state remembered in localStorage under storageKey, defaulting to defaultOpen. */
export function usePersistedOpenState(
  storageKey: string,
  defaultOpen = true,
): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [open, setOpenState] = useState(() =>
    readPersistedOpen(storageKey, defaultOpen),
  );

  // The key embeds the user id, which can resolve after auth loads; re-read for the new key.
  // defaultOpen is not a dependency: it only fills in when nothing is stored under the key.
  useEffect(() => {
    setOpenState(readPersistedOpen(storageKey, defaultOpen));
  }, [storageKey]);

  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setOpenState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        writePersistedOpen(storageKey, value);
        return value;
      });
    },
    [storageKey],
  );

  return [open, setOpen];
}
