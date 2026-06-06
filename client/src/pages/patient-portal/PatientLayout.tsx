import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Bell, BellOff, BellRing, CalendarDays, FileText, Glasses, LogOut, Pill, ScanLine, UserRound } from "lucide-react";
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
const PUSH_SUPPORTED = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

async function subscribePush(): Promise<PushSubscription | null> {
  if (!PUSH_SUPPORTED || !VAPID_KEY) return null;
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_KEY });
}

export default function PatientLayout({ children }: { children: ReactNode }) {
  const { name, patientCode, logout } = usePatientAuth();
  const [location] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "requesting" | "granted" | "denied">(() => {
    if (!PUSH_SUPPORTED) return "denied";
    const p = Notification.permission;
    return p === "granted" ? "granted" : p === "denied" ? "denied" : "idle";
  });
  const registerRef = useRef(false);

  const registerPushToken = trpc.patientPortal.registerPatientPushToken.useMutation();

  const handleEnablePush = async () => {
    if (!PUSH_SUPPORTED || !VAPID_KEY) return;
    setPushState("requesting");
    try {
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") { setPushState("denied"); return; }
      const sub = await subscribePush();
      if (sub) registerPushToken.mutate({ subscription: JSON.stringify(sub.toJSON()) });
      setPushState("granted");
    } catch {
      setPushState("idle");
    }
  };

  // Silently re-register if already granted (no prompt)
  if (pushState === "granted" && VAPID_KEY && !registerRef.current) {
    registerRef.current = true;
    subscribePush().then((sub) => {
      if (sub) registerPushToken.mutate({ subscription: JSON.stringify(sub.toJSON()) });
    }).catch(() => {});
  }

  const { data: notifications = [], isLoading } = trpc.patientPortal.getNotifications.useQuery(undefined, {
    enabled: Boolean(patientCode),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const notificationCount = notifications.length;
  const recentNotifications = useMemo(() => notifications.slice(0, 4), [notifications]);

  return (
    <div className="min-h-screen bg-[#f6f9fd] text-foreground" dir="rtl">
      <div className="mx-auto min-h-screen w-full max-w-none px-0 py-0">
        <div className="overflow-hidden rounded-none border-0 bg-white shadow-none sm:rounded-[2rem] sm:border sm:border-[#dce9f5] sm:shadow-[0_20px_60px_rgba(28,64,104,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,#002A63_0%,#0F4E93_38%,#DDEAF7_79%,#F8FAFC_100%)] px-4 pb-24 pt-5 text-white sm:px-6 sm:pb-28 lg:px-10 lg:pb-32">
            <div className="mx-auto flex max-w-2xl items-center justify-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#0b3d78]/22 px-5 py-3 text-center text-white shadow-[0_14px_30px_rgba(0,0,0,0.12)] backdrop-blur-[2px]">
              <BrandLogo className="size-10 shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.16)] sm:size-12" />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold leading-none sm:text-3xl">مركز عيون الشروق</h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">SELRS</p>
              </div>
            </div>
          </div>

          <div className="-mt-20 px-4 pb-5 sm:px-6 sm:pb-6 lg:-mt-24 lg:px-10">
            <div className="mx-auto max-w-7xl space-y-4">
              <div className="rounded-[2rem] border border-[#dbe7f4] bg-white p-4 shadow-[0_12px_36px_rgba(28,64,104,0.06)] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-secondary">بوابة المرضى</p>
                    <p className="truncate text-lg font-semibold leading-none text-primary sm:text-xl">
                      {name ?? "بوابة المرضى"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {patientCode ? `كود المريض ${patientCode}` : "الدخول الآمن إلى الملف، الأشعة، والمواعيد"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative gap-2 border-secondary/25 bg-secondary/5 text-secondary hover:bg-secondary/10"
                      onClick={() => setShowNotifications((v) => !v)}
                    >
                      <Bell className="size-4 text-secondary" />
                      <span className="hidden sm:inline">الإشعارات</span>
                      {notificationCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="absolute -left-2 -top-2 min-w-5 justify-center rounded-full border-0 bg-secondary px-1.5 py-0 text-[10px] text-secondary-foreground"
                        >
                          {notificationCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={logout}
                      className="gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <LogOut className="size-4" />
                      <span className="hidden sm:inline">خروج</span>
                    </Button>
                  </div>
                </div>

                <nav className="mt-4 flex items-center gap-2 overflow-x-auto rounded-full border border-[#dbe7f4] bg-[#f6f9fd] p-1">
                  {NAV.map((item) => {
                    const Icon = item.icon;
                    const active = location.startsWith(item.href);
                    return (
                      <Link key={item.href} href={item.href}>
                        <span
                          className={cn(
                            "inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-white hover:text-primary",
                          )}
                        >
                          <Icon className="size-4" />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </nav>

                {showNotifications && (
                  <div className="mt-3 rounded-[1.5rem] border border-[#dbe7f4] bg-white p-4 text-foreground shadow-[0_12px_36px_rgba(28,64,104,0.06)]">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">آخر التحديثات</p>
                        <p className="text-xs text-muted-foreground">تظهر حالة المواعيد الأخيرة هنا</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)} className="text-muted-foreground">
                        إغلاق
                      </Button>
                    </div>

                    {PUSH_SUPPORTED && VAPID_KEY && pushState !== "granted" && (
                      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          {pushState === "denied" ? (
                            <BellOff className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <BellRing className="size-4 shrink-0 text-primary" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">
                              {pushState === "denied" ? "الإشعارات محظورة" : "فعّل الإشعارات"}
                            </p>
                            <p className="text-[11px] leading-4 text-muted-foreground">
                              {pushState === "denied"
                                ? "أتح الإشعارات من إعدادات المتصفح"
                                : "احصل على إشعار فور تأكيد موعدك"}
                            </p>
                          </div>
                        </div>
                        {pushState !== "denied" && (
                          <Button size="sm" onClick={handleEnablePush} disabled={pushState === "requesting"} className="shrink-0 rounded-xl text-xs">
                            {pushState === "requesting" ? "جاري..." : "تفعيل"}
                          </Button>
                        )}
                      </div>
                    )}

                    {pushState === "granted" && PUSH_SUPPORTED && (
                      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
                        <BellRing className="size-3.5 shrink-0" />
                        الإشعارات مفعّلة — ستصلك إشعارات تأكيد المواعيد
                      </div>
                    )}

                    {isLoading ? (
                      <div className="space-y-2">
                        <div className="h-16 animate-pulse rounded-xl bg-[#eef4fa]" />
                        <div className="h-16 animate-pulse rounded-xl bg-[#eef4fa]" />
                      </div>
                    ) : recentNotifications.length > 0 ? (
                      <div className="grid gap-2">
                        {recentNotifications.map((item) => (
                          <div key={item.id} className="rounded-[1.25rem] border border-[#e1ebf6] bg-[#fbfdff] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-foreground">{item.typeLabel}</p>
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
                                <p className="text-xs leading-5 text-muted-foreground">
                                  {item.status === "confirmed"
                                    ? "تم تأكيد الموعد من الاستقبال"
                                    : item.status === "cancelled"
                                      ? "تم إلغاء الموعد"
                                      : item.status === "completed"
                                        ? "تم إكمال الموعد"
                                        : "تمت إضافة تحديث جديد للطلب"}
                                </p>
                              </div>
                              <div className="shrink-0 text-left text-[11px] leading-5 text-muted-foreground">
                                <div>{formatArabicDateTime(item.confirmedDate ?? item.requestedDate)}</div>
                              </div>
                            </div>
                            {item.staffNotes && (
                              <p className="mt-2 rounded-lg bg-[#eff4fa] px-3 py-2 text-xs leading-5 text-muted-foreground">
                                {item.staffNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#d7e2ee] bg-[#f7fbfe] px-4 py-8 text-center text-sm text-muted-foreground">
                        لا توجد تحديثات جديدة حالياً
                      </div>
                    )}
                  </div>
                )}
              </div>

              <main>{children}</main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
