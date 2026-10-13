import { useMemo, useState } from "react";
import { ROUTES } from "../../../../shared/routes";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toLocalDateKey } from "@/lib/localDate";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import { Button } from "@/components/ui/button";
import { Calculator, Fingerprint, RefreshCw } from "lucide-react";
import TodayAttendanceRegister from "./TodayAttendanceRegister";
import "./attendance-premium.css";

export default function AttendanceHome() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const userRole = String(user?.role ?? "").toLowerCase();
  const isAdmin = userRole === "admin";
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);

  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && !isAdmin,
    refetchOnWindowFocus: false,
  });

  const allowedRoots = useMemo(
    () => permissionsToAllowedRoots((permissionsQuery.data ?? []) as string[]),
    [permissionsQuery.data],
  );

  const dashboardQuery = (trpc as any).attendance.dashboardSummary.useQuery(
    undefined,
    { refetchInterval: 30_000, refetchIntervalInBackground: false },
  );

  const deviceQuery = (trpc as any).attendance.deviceStatus.useQuery(
    undefined,
    {
      refetchInterval: 20_000,
      refetchIntervalInBackground: false,
    },
  );

  const syncMutation = (trpc as any).attendance.syncNow.useMutation({
    onSuccess: (res: any) => {
      setSyncMsg(
        res.success
          ? `تمت المزامنة بنجاح، وتمت إضافة ${res.rowsInserted ?? 0} سجل`
          : `فشلت المزامنة: ${res.error ?? "خطأ غير معروف"}`,
      );
      dashboardQuery.refetch();
      deviceQuery.refetch();
    },
    onError: (err: any) => setSyncMsg(`فشلت المزامنة: ${err.message}`),
  });

  const recomputeMutation = (
    trpc as any
  ).attendance.materializeDaily.useMutation({
    onSuccess: (res: any) => {
      setRecomputeMsg(`تمت إعادة احتساب ${res.rowsWritten ?? 0} يوم بنجاح`);
      dashboardQuery.refetch();
    },
    onError: (err: any) =>
      setRecomputeMsg(`فشلت إعادة الاحتساب: ${err.message}`),
  });

  const handleSync = () => {
    setSyncMsg(null);
    syncMutation.mutate({});
  };

  const handleRecompute = () => {
    setRecomputeMsg(null);
    const today = new Date();
    // Start of the previous payroll period (26th→25th): covers the open and
    // the last closed period without a 90-day company-wide rebuild.
    const currentStart = new Date(
      today.getFullYear(),
      today.getMonth() - (today.getDate() >= 26 ? 0 : 1),
      26,
    );
    const from = new Date(
      currentStart.getFullYear(),
      currentStart.getMonth() - 1,
      26,
    );
    recomputeMutation.mutate({
      fromDate: toLocalDateKey(from),
      toDate: toLocalDateKey(today),
    });
  };

  const data = dashboardQuery.data as any;
  const device = deviceQuery.data as any;
  const isLoading = dashboardQuery.isLoading;
  const loadFailed = dashboardQuery.isError;

  const deviceState = deviceQuery.isError
    ? "تعذر التحقق"
    : deviceQuery.isLoading
      ? "جارٍ التحقق"
      : device?.status === "online" || device?.connected === true
        ? "متصل"
        : device?.status === "connecting"
          ? "جارٍ الاتصال"
          : "غير متصل";

  const canUseOperationalShortcuts =
    isAdmin ||
    pathGrantedByRoots(
      normalizeNavPath(ROUTES.attendanceSettings),
      allowedRoots,
    ) ||
    pathGrantedByRoots(
      normalizeNavPath(ROUTES.attendanceAdminDevice),
      allowedRoots,
    ) ||
    pathGrantedByRoots(
      normalizeNavPath(ROUTES.attendanceAdminSync),
      allowedRoots,
    );
  const canSeeReports =
    isAdmin ||
    pathGrantedByRoots(
      normalizeNavPath(ROUTES.attendanceReports),
      allowedRoots,
    );

  // A count is only shown once the server has answered; "0" while loading or
  // after a failure would read as a real result.
  const figure = (value: unknown) =>
    isLoading ? "جارٍ التحميل" : loadFailed ? "غير متاح" : String(value ?? 0);

  const unassignedPresent = Number(
    data?.bySection?.unassigned?.presentToday ?? 0,
  );

  const ledgerActions = (
    <div className="attendance-home-actions">
      <Button
        type="button"
        variant="ghost"
        aria-label="تحديث"
        title="تحديث"
        disabled={dashboardQuery.isFetching || deviceQuery.isFetching}
        onClick={() => {
          dashboardQuery.refetch();
          deviceQuery.refetch();
          utils.attendance.dailyByDate.invalidate();
        }}
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
      </Button>
      {canUseOperationalShortcuts && (
        <>
          <Button
            type="button"
            variant="ghost"
            aria-label="مزامنة سجلات البصمة"
            title="مزامنة سجلات البصمة"
            disabled={syncMutation.isPending}
            onClick={handleSync}
          >
            <Fingerprint aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="تطبيق قواعد الاحتساب"
            title="تطبيق قواعد الاحتساب"
            disabled={recomputeMutation.isPending}
            onClick={handleRecompute}
          >
            <Calculator aria-hidden="true" className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div
      className="attendance-overview attendance-home-focused w-full min-w-0 space-y-4"
      dir="rtl"
    >
      <header className="attendance-day-heading">
        <div>
          <h1>متابعة اليوم</h1>
          <p className="attendance-day-caption">
            المركز والعيادة · الحضور والورديات
          </p>
        </div>
        {ledgerActions}
      </header>
      {loadFailed && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground"
        >
          <span>تعذر تحميل ملخص اليوم. الأرقام أدناه غير متاحة.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dashboardQuery.refetch()}
          >
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="attendance-home-ledger">
        {[
          { key: "center", label: "المركز", counts: data?.bySection?.center },
          { key: "clinic", label: "العيادة", counts: data?.bySection?.clinic },
        ].map(({ key, label, counts }) => (
          <section
            key={key}
            className="attendance-home-pane"
            aria-labelledby={`attendance-pane-${key}`}
            aria-busy={isLoading}
          >
            <div className="attendance-home-pane-core">
              <h2
                id={`attendance-pane-${key}`}
                className="attendance-home-eyebrow"
              >
                {label} · متواجدون الآن
              </h2>
              <p className="attendance-home-net">{figure(counts?.insideNow)}</p>
              <dl className="attendance-home-entries">
                <div>
                  <dt>متأخرون اليوم</dt>
                  <dd>{figure(counts?.lateToday)}</dd>
                </div>
                <div>
                  <dt>بصمة ناقصة أمس</dt>
                  <dd>{figure(counts?.missingCheckoutYesterday)}</dd>
                </div>
                <div>
                  <dt>الوردية الصباحية</dt>
                  <dd>{figure(counts?.presentMorning)}</dd>
                </div>
                <div>
                  <dt>الوردية المسائية</dt>
                  <dd>{figure(counts?.presentEvening)}</dd>
                </div>
              </dl>
            </div>
          </section>
        ))}
      </div>
      {unassignedPresent > 0 && (
        <p className="attendance-home-unassigned" role="note">
          {unassignedPresent.toLocaleString("ar-EG")} موظف حاضر بدون قسم في
          الرواتب الأساسية، ولم يدخلوا في المركز أو العيادة.
        </p>
      )}
      <div className="attendance-home-columns">
        <div className="attendance-register-shell min-w-0">
          <TodayAttendanceRegister canSeeReports={canSeeReports} />
        </div>
        <aside className="min-w-0 space-y-4">
          <section
            className="attendance-home-device flex flex-wrap items-center justify-between gap-2"
            aria-labelledby="home-devices"
          >
            <div className="attendance-device-core">
              <h2
                id="home-devices"
                className="text-sm font-bold text-muted-foreground"
              >
                حالة الأجهزة
              </h2>
              <div className="flex items-center gap-4 text-sm" role="status">
                <span className="flex shrink-0 items-center justify-center">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      deviceState === "متصل"
                        ? "bg-success"
                        : deviceState === "غير متصل"
                          ? "bg-destructive"
                          : "bg-muted-foreground"
                    }`}
                  />
                </span>
                <div>
                  <div className="text-xs text-muted-foreground">
                    حالة الاتصال
                  </div>
                  <div className="font-bold text-foreground">{deviceState}</div>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {(syncMsg || recomputeMsg) && (
        <div className="grid gap-3 pt-2 md:grid-cols-2" role="status">
          {syncMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground shadow-xs">
              <div>
                <span className="font-bold text-foreground">المزامنة:</span>{" "}
                {syncMsg}
              </div>
            </div>
          )}
          {recomputeMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground shadow-xs">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <span className="font-bold text-foreground">
                  احتساب القواعد:
                </span>{" "}
                {recomputeMsg}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
