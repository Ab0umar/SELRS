import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  FileText,
  Glasses,
  LogOut,
  Pill,
  ScanLine,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { usePatientAuth } from "@/hooks/usePatientAuth";
import { cn } from "@/lib/utils";
import { PortalStatusBadge, formatArabicDateTime } from "./portal-ui";

const NAV = [
  { href: "/my/file", label: "ملفي الطبي", icon: FileText },
  { href: "/my/refraction", label: "مقاس النظارة", icon: Glasses },
  { href: "/my/prescription", label: "الروشتة", icon: Pill },
  { href: "/my/scans", label: "الأشعة", icon: ScanLine },
  { href: "/my/book", label: "حجز موعد", icon: CalendarDays },
  { href: "/my/bookings", label: "مواعيدي", icon: UserRound },
];

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const PUSH_SUPPORTED =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

async function subscribePush(): Promise<PushSubscription | null> {
  if (!PUSH_SUPPORTED || !VAPID_KEY) return null;
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_KEY,
  });
}

export default function PatientLayout({ children }: { children: ReactNode }) {
  const { name, patientCode, logout } = usePatientAuth();
  const [location] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [pushState, setPushState] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >(() => {
    if (!PUSH_SUPPORTED) return "denied";
    const p = Notification.permission;
    return p === "granted" ? "granted" : p === "denied" ? "denied" : "idle";
  });
  const registerRef = useRef(false);

  const registerPushToken =
    trpc.patientPortal.registerPatientPushToken.useMutation();

  const handleEnablePush = async () => {
    if (!PUSH_SUPPORTED || !VAPID_KEY) return;
    setPushState("requesting");
    try {
      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission !== "granted") {
        setPushState("denied");
        return;
      }
      const sub = await subscribePush();
      if (sub)
        registerPushToken.mutate({
          subscription: JSON.stringify(sub.toJSON()),
        });
      setPushState("granted");
    } catch {
      setPushState("idle");
    }
  };

  // Silently re-register if already granted (no prompt)
  if (pushState === "granted" && VAPID_KEY && !registerRef.current) {
    registerRef.current = true;
    subscribePush()
      .then((sub) => {
        if (sub)
          registerPushToken.mutate({
            subscription: JSON.stringify(sub.toJSON()),
          });
      })
      .catch(() => {});
  }

  const { data: notifications = [], isLoading } =
    trpc.patientPortal.getNotifications.useQuery(undefined, {
      enabled: Boolean(patientCode),
      refetchInterval: 60_000,
      refetchOnWindowFocus: false,
    });

  const notificationCount = notifications.length;
  const recentNotifications = useMemo(
    () => notifications.slice(0, 4),
    [notifications],
  );

  return (
    <div
      className="min-h-screen flex flex-col bg-[#F4F8FB] text-foreground font-sans"
      dir="rtl"
    >
      {/* Sticky top brand navigation bar */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#e2edf7] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Portal title */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#F4F8FB] border border-[#e2edf7] rounded-xl hidden sm:block">
              <BrandLogo className="size-8 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-primary leading-tight">
                مركز عيون الشروق
              </h1>
              <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                بوابة المرضى الإلكترونية
              </p>
            </div>
          </div>

          {/* User profile & action tools */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col text-left pl-2 border-l border-border/60">
              <span className="text-xs font-bold text-foreground text-right">
                {name}
              </span>
              <span className="text-[10px] text-muted-foreground text-right">
                كود: {patientCode}
              </span>
            </div>

            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl hover:bg-muted/50 cursor-pointer size-10"
              onClick={() => setShowNotifications((v) => !v)}
            >
              <Bell className="size-5 text-muted-foreground" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-4 bg-secondary text-secondary-foreground text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {notificationCount}
                </span>
              )}
            </Button>

            {/* Logout button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="rounded-xl hover:bg-destructive/5 hover:text-destructive text-muted-foreground cursor-pointer size-10"
              title="تسجيل الخروج"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main layout frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8 flex flex-col gap-6">
        {/* Desktop sub-navigation tabs */}
        <nav className="hidden md:flex flex-wrap items-center gap-1.5 border-b border-[#dbe7f4] pb-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-white hover:text-primary hover:shadow-xs border border-transparent hover:border-[#dbe7f4]",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Notifications Slide-Down Box */}
        {showNotifications && (
          <div className="rounded-2xl border border-[#dbe7f4] bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#f0f5fa] pb-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  آخر التحديثات والإشعارات
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  تحديثات حالة الحجوزات والملف
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
                className="h-8 rounded-lg text-xs cursor-pointer"
              >
                إغلاق
              </Button>
            </div>

            {PUSH_SUPPORTED && VAPID_KEY && pushState !== "granted" && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {pushState === "denied" ? (
                    <BellOff className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <BellRing className="size-4 text-primary shrink-0 animate-pulse" />
                  )}
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-foreground">
                      {pushState === "denied"
                        ? "الإشعارات محظورة"
                        : "تفعيل الإشعارات الفورية"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {pushState === "denied"
                        ? "يرجى السماح بالإشعارات من المتصفح"
                        : "احصل على تنبيه فوري لتأكيد المواعيد"}
                    </p>
                  </div>
                </div>
                {pushState !== "denied" && (
                  <Button
                    size="sm"
                    onClick={handleEnablePush}
                    disabled={pushState === "requesting"}
                    className="h-8 rounded-lg text-xs shrink-0 cursor-pointer"
                  >
                    {pushState === "requesting" ? "جاري..." : "تفعيل"}
                  </Button>
                )}
              </div>
            )}

            {pushState === "granted" && PUSH_SUPPORTED && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-2 text-xs text-emerald-700">
                <BellRing className="size-3.5 shrink-0" />
                <span>الإشعارات الفورية مفعّلة بنجاح</span>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2 py-4">
                <div className="h-12 animate-pulse rounded-xl bg-[#eef4fa]" />
                <div className="h-12 animate-pulse rounded-xl bg-[#eef4fa]" />
              </div>
            ) : recentNotifications.length > 0 ? (
              <div className="grid gap-2">
                {recentNotifications.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#e1ebf6] bg-[#fbfdff] p-3 text-xs leading-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">
                            {item.typeLabel}
                          </p>
                          <PortalStatusBadge
                            status={item.status}
                            label={
                              item.status === "pending"
                                ? "قيد المراجعة"
                                : item.status === "confirmed"
                                  ? "مؤكد"
                                  : item.status === "cancelled"
                                    ? "ملغي"
                                    : "مكتمل"
                            }
                          />
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {item.status === "confirmed"
                            ? "تم تأكيد موعدك بنجاح من قبل الاستقبال."
                            : item.status === "cancelled"
                              ? "تم إلغاء طلب الموعد."
                              : item.status === "completed"
                                ? "تم إكمال الزيارة الطبية."
                                : "طلب الموعد قيد المراجعة حالياً."}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatArabicDateTime(
                          item.confirmedDate ?? item.requestedDate,
                        )}
                      </span>
                    </div>
                    {item.staffNotes && (
                      <p className="mt-2 rounded-lg bg-[#eff4fa]/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        {item.staffNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d7e2ee] bg-[#f7fbfe] py-8 text-center text-xs text-muted-foreground">
                لا توجد إشعارات أو تحديثات جديدة حالياً
              </div>
            )}
          </div>
        )}

        {/* Viewport content area */}
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Mobile Fixed Bottom Navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-[#e2edf7] flex items-center justify-around px-2 shadow-lg">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl transition-all duration-150 cursor-pointer",
                  active
                    ? "text-primary font-bold scale-105"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="text-[9px] tracking-tight">
                  {item.label.split(" ")[0]}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
