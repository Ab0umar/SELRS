import { useEffect, useState } from "react";
import { getLocalToday } from "@/lib/localDate";

/** Keeps date defaults aligned with the local calendar while a page stays open. */
export function useLocalToday(): string {
  const [today, setToday] = useState(getLocalToday);

  useEffect(() => {
    const refresh = () => setToday(getLocalToday());
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return today;
}
