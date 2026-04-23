import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import GlobalCommandPalette from "@/components/GlobalCommandPalette";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { type NativeAppInfo } from "@/lib/appRuntime";

const APP_NOTIFICATION_FEED_KEY = "app_notifications_feed_v1";

type AppNotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  kind?: "info" | "success" | "warning" | "error";
  targetRoles?: string[] | null;
  targetUserIds?: number[] | null;
};

function canCurrentUserSeeNotification(userId: number | undefined, userRole: unknown, item: AppNotificationItem | null | undefined) {
  if (!item || typeof item !== "object") return false;

  // If targetUserIds is specified, only show to those specific users
  if (Array.isArray(item.targetUserIds) && item.targetUserIds.length > 0) {
    return userId && item.targetUserIds.includes(userId);
  }

  // Otherwise check by role
  const normalizedRole = String(userRole ?? "").trim().toLowerCase();
  const targetRoles = Array.isArray(item.targetRoles)
    ? item.targetRoles.map((value) => String(value ?? "").trim().toLowerCase()).filter(Boolean)
    : [];
  if (targetRoles.length === 0) return true;
  if (!normalizedRole) return false;
  return targetRoles.includes(normalizedRole);
}

function useAppNotificationFeed(enabled: boolean) {
  return trpc.medical.getSystemSetting.useQuery(
    { key: APP_NOTIFICATION_FEED_KEY },
    {
      enabled,
      refetchInterval: 15000,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    }
  );
}

function AppNotificationsBridge() {
  const { user, isAuthenticated } = useAuth();
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const storageKey = `selrs_seen_app_notifications_${String(user?.id ?? "guest")}`;
  const notificationsQuery = useAppNotificationFeed(isAuthenticated);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const ids = Array.isArray(parsed) ? parsed.map((value) => String(value ?? "").trim()).filter(Boolean) : [];
      seenIdsRef.current = new Set(ids);
    } catch {
      seenIdsRef.current = new Set();
    }
    initializedRef.current = false;
  }, [storageKey]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const itemsRaw = (notificationsQuery.data as any)?.value;
    const items = Array.isArray(itemsRaw)
      ? (itemsRaw as AppNotificationItem[])
          .filter((item) => item && typeof item === "object")
          .filter((item) => canCurrentUserSeeNotification(user?.id, user?.role, item))
      : [];
    if (items.length === 0) return;

    if (!initializedRef.current) {
      for (const item of items) {
        const id = String(item?.id ?? "").trim();
        if (id) seenIdsRef.current.add(id);
      }
      initializedRef.current = true;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(Array.from(seenIdsRef.current).slice(-200)));
      }
      return;
    }

    const unseen = [...items]
      .reverse()
      .filter((item) => {
        const id = String(item?.id ?? "").trim();
        return id && !seenIdsRef.current.has(id);
      });

    if (unseen.length === 0) return;

    for (const item of unseen) {
      const id = String(item.id ?? "").trim();
      if (!id) continue;
      const title = String(item.title ?? "").trim() || "Notification";
      const message = String(item.message ?? "").trim();
      const tone = item.kind ?? "info";
      seenIdsRef.current.add(id);
      if (tone === "success") toast.success(title, { description: message });
      else if (tone === "warning") toast.warning(title, { description: message });
      else if (tone === "error") toast.error(title, { description: message });
      else toast(title, { description: message });
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(seenIdsRef.current).slice(-200)));
    }
  }, [isAuthenticated, notificationsQuery.data, storageKey, user?.id, user?.role]);

  return null;
}

function AppNotificationPanel() {
  const { user, isAuthenticated } = useAuth();
  const notificationsQuery = useAppNotificationFeed(isAuthenticated);
  const [clearEpoch, setClearEpoch] = useState(0);
  const itemsRaw = (notificationsQuery.data as any)?.value;
  const items = Array.isArray(itemsRaw)
    ? (itemsRaw as AppNotificationItem[]).filter((item) => canCurrentUserSeeNotification(user?.id, user?.role, item))
    : [];
  if (!items.length || !isAuthenticated) return null;

  const storageKey = `selrs_seen_app_notifications_${String(user?.id ?? "guest")}`;
  const seenIds = new Set<string>();
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      for (const value of parsed) {
        const id = String(value ?? "").trim();
        if (id) seenIds.add(id);
      }
    }
  } catch {
    // Ignore invalid storage.
  }
  const visibleItems = items.filter((item) => {
    const id = String(item?.id ?? "").trim();
    return id && !seenIds.has(id);
  });
  if (!visibleItems.length) return null;

  const parseTime = (value?: string) => {
    const time = Date.parse(value ?? "");
    return Number.isFinite(time) ? time : 0;
  };

  const recent = [...visibleItems]
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
    .slice(0, 3);

  const handleClearNotifications = () => {
    const ids = items.map((item) => String(item?.id ?? "").trim()).filter(Boolean);
    if (!ids.length) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(ids.slice(-200)));
    } catch {
      // Ignore storage failures.
    }
    notificationsQuery.refetch();
    setClearEpoch(Date.now());
  };

  const roleLabel = (item: AppNotificationItem) => {
    const roleValue = String(((item as any).meta?.role ?? "").toString()).toLowerCase();
    if (roleValue === "reception") return "استقبال";
    if (roleValue === "nurse") return "تمريض";
    if (roleValue === "technician") return "فني";
    return "إشعار";
  };

  const toneClass = (kind?: string) => {
    if (kind === "success") return "border-emerald-400 bg-emerald-50/80 text-emerald-900";
    if (kind === "warning") return "border-amber-400 bg-amber-50/80 text-amber-900";
    if (kind === "error") return "border-rose-400 bg-rose-50/80 text-rose-900";
    return "border-slate-300 bg-slate-50/80 text-slate-900";
  };

  return (
    <div className="fixed top-4 right-4 z-[950] w-80 max-w-[95vw] space-y-2 rounded-xl p-2 backdrop-blur print:hidden">
      {recent.map((item) => (
        <article
          key={item.id}
          className={`group flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm shadow-lg shadow-black/5 transition hover:-translate-y-0.5 ${toneClass(
            item.kind
          )}`}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-opacity-80">
            <span>{roleLabel(item)}</span>
            <span className="whitespace-nowrap text-[10px] font-semibold">
              {item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" })
                : ""}
            </span>
          </div>
          <div className="font-semibold">{item.title}</div>
          <p className="text-[13px] text-current/80">{item.message}</p>
        </article>
      ))}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={handleClearNotifications}>
          مسح الإشعارات
        </Button>
      </div>
    </div>
  );
}

export default function WebAppEnhancements({ nativeAppInfo }: { nativeAppInfo: NativeAppInfo | null }) {
  void nativeAppInfo;
  return (
    <>
      <AppNotificationsBridge />
      <AppNotificationPanel />
      <GlobalCommandPalette />
    </>
  );
}
