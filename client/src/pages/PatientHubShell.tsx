import { Link, Redirect, Route, Switch, useLocation, useRoute } from "wouter";
import PatientDetails from "./PatientDetails";
import PatientSummary from "./PatientSummary";
import MedicalReports from "./MedicalReports";
import Followups from "./Followups";
import Visits from "./Visits";
import WritePrescription from "./WritePrescription";
import RequestTests from "./RequestTests";
import PentacamResultsDashboard from "./PentacamResultsDashboard";
import ConsultantSheet from "./ConsultantSheet";
import MedicalFilePanel from "@/components/MedicalFilePanel";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutGrid,
  MoreHorizontal,
  Pill,
  Repeat,
  Search,
} from "lucide-react";
import { AppShellFooter } from "@/components/layout/AppShellFooter";
import PatientHubHome from "./PatientHubHome";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const HUB_PATIENT_PATH_RE =
  /\/patient-hub\/(?:file|summary|reports|doctor|brief|examination|prescription|request-tests|visits|followups|pentacam-dashboard|sheets\/consultant)\/(\d+)/;

function extractHubPatientId(pathWithQuery: string): string | undefined {
  const pathOnly = pathWithQuery.split("?")[0] ?? "";
  const m = pathOnly.match(HUB_PATIENT_PATH_RE);
  return m?.[1];
}

function readVisitDateFromLocation(): string {
  try {
    const q = new URLSearchParams(window.location.search).get("visitDate");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  } catch {
    /* ignore */
  }
  return new Date().toISOString().split("T")[0];
}

function readVisitIdFromLocation(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("visitId");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function visitDateKey(visit: { visitDate?: unknown }): string {
  const d = visit.visitDate;
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  try {
    return new Date(d as string).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function formatVisitDisplay(visit: { visitDate?: unknown; visitType?: string | null; id: number }): string {
  const day = visitDateKey(visit);
  const dateStr = day
    ? (() => {
        try {
          return new Date(`${day}T12:00:00`).toLocaleDateString("ar-EG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        } catch {
          return day;
        }
      })()
    : `#${visit.id}`;
  const t = visit.visitType?.trim();
  return t ? `${dateStr} · ${t}` : dateStr;
}

function computeAge(data: { age?: number | null; dateOfBirth?: unknown }): number | null {
  if (data.age != null && data.age > 0) return data.age;
  if (!data.dateOfBirth) return null;
  try {
    const dob = new Date(data.dateOfBirth as string);
    const years = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    return years >= 0 && years < 150 ? years : null;
  } catch {
    return null;
  }
}

/** عرض الطبيب أصبح داخل الموجز؛ الروابط القديمة تُحوَّل للموجز مع نفس الاستعلام */
function PatientHubDoctorToBriefRedirect() {
  const [, params] = useRoute("/patient-hub/doctor/:id");
  const pid = params?.id?.trim();
  const qs = typeof window !== "undefined" ? window.location.search : "";
  if (!pid) return null;
  return <Redirect to={`/patient-hub/brief/${pid}${qs}`} />;
}

function PatientHubFileToExaminationRedirect() {
  const [, params] = useRoute("/patient-hub/file/:id");
  const pid = params?.id?.trim();
  const qs = typeof window !== "undefined" ? window.location.search : "";
  if (!pid) return null;
  return <Redirect to={`/patient-hub/examination/${pid}${qs}`} />;
}

function HubNeedPatientSearch({ visitDate }: { visitDate: string }) {
  return (
    <div className="flex min-h-[38vh] flex-col items-center justify-center gap-4 p-8 text-center" dir="rtl">
      <p className="max-w-sm text-sm text-muted-foreground">
        لم يُحدَّد مريض. استخدم بحث مركز المريض ثم اختر المريض لفتح هذا القسم.
      </p>
      <Button type="button" variant="outline" className="gap-2" asChild>
        <Link href={`/patient-hub?visitDate=${encodeURIComponent(visitDate)}`}>
          <Search className="h-4 w-4" />
          الانتقال للبحث
        </Link>
      </Button>
    </div>
  );
}

const PATIENT_HUB_VIEW_ONLY_HINT = "العرض فقط داخل المركز";

function PatientHubExaminationInner({
  visitDate,
  visitId,
  visits,
  applyVisitSelection,
}: {
  visitDate: string;
  visitId: number | null;
  visits: Array<{ id: number; visitDate: unknown; visitType?: string | null }>;
  applyVisitSelection: (d: string, id: number | null) => void;
}) {
  const [, params] = useRoute("/patient-hub/examination/:id");
  const id = Number(params?.id ?? 0);

  const resolveVisitFromPanelDate = useCallback(
    (d: string) => {
      const v = visits.find((x) => visitDateKey(x) === d);
      applyVisitSelection(d, v ? v.id : null);
    },
    [visits, applyVisitSelection],
  );

  if (!id) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center p-6 text-sm text-muted-foreground">
        اختر مريضاً من القائمة أولاً.
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 p-4 sm:p-6">
      <MedicalFilePanel
        embedded
        patientHubReadOnly
        patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
        patientId={id}
        hubVisitDate={visitDate}
        hubVisitId={visitId ?? undefined}
        onHubVisitDateChange={resolveVisitFromPanelDate}
      />
    </div>
  );
}

type NavKey =
  | "brief"
  | "exams"
  | "rx"
  | "labs"
  | "visits"
  | "followups"
  | "pentacam"
  | "sheets"
  | "summary"
  | "reports";

export default function PatientHubShell() {
  const [location, navigate] = useLocation();
  const { goBack } = useAppNavigation();

  const patientId = useMemo(() => extractHubPatientId(location), [location]);
  const pathOnly = useMemo(() => location.split("?")[0] ?? "", [location]);

  const [visitDate, setVisitDate] = useState(readVisitDateFromLocation);
  const [visitId, setVisitId] = useState<number | null>(readVisitIdFromLocation);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setVisitDate(readVisitDateFromLocation());
    setVisitId(readVisitIdFromLocation());
  }, [location]);

  const applyVisitSelection = useCallback(
    (nextDate: string, nextVisitId: number | null) => {
      setVisitDate(nextDate);
      setVisitId(nextVisitId);
      try {
        const base = window.location.pathname;
        const u = new URLSearchParams(window.location.search);
        u.set("visitDate", nextDate);
        if (nextVisitId != null) {
          u.set("visitId", String(nextVisitId));
        } else {
          u.delete("visitId");
        }
        const qs = u.toString();
        navigate(`${base}${qs ? `?${qs}` : ""}`, { replace: true });
      } catch {
        /* ignore */
      }
    },
    [navigate],
  );

  const pidNum = patientId ? Number(patientId) : 0;
  const patientQuery = trpc.patient.getPatient.useQuery(pidNum, {
    enabled: pidNum > 0,
    refetchOnWindowFocus: false,
  });

  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: pidNum },
    { enabled: pidNum > 0, refetchOnWindowFocus: false },
  );

  const visits = useMemo(() => visitsQuery.data ?? [], [visitsQuery.data]);

  const currentVisitIdx = useMemo(() => {
    if (visits.length === 0) return -1;
    if (visitId == null) return 0;
    const idx = visits.findIndex((v) => v.id === visitId);
    return idx >= 0 ? idx : 0;
  }, [visits, visitId]);

  useEffect(() => {
    if (!patientId || !visitsQuery.isSuccess) return;

    try {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get("visitDate");
      const urlIdStr = params.get("visitId");
      const urlId = urlIdStr ? Number(urlIdStr) : NaN;

      if (visits.length === 0) {
        if (params.has("visitId")) {
          params.delete("visitId");
          const qs = params.toString();
          navigate(`${pathOnly}${qs ? `?${qs}` : ""}`, { replace: true });
        }
        return;
      }

      const visitById =
        Number.isFinite(urlId) && urlId > 0 ? visits.find((v) => v.id === urlId) : undefined;

      if (visitById) {
        const key = visitDateKey(visitById);
        if (urlDate !== key) {
          applyVisitSelection(key, urlId);
        }
        return;
      }

      // قاعدة العمل: لا يُفترض أكثر من زيارة لنفس المريض في نفس اليوم.
      if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
        const v = visits.find((x) => visitDateKey(x) === urlDate);
        if (v && urlIdStr !== String(v.id)) {
          applyVisitSelection(urlDate, v.id);
          return;
        }
        if (v) return;
      }

      const v = visits[0];
      const key = visitDateKey(v);
      if (urlDate !== key || urlIdStr !== String(v.id)) {
        applyVisitSelection(key, v.id);
      }
    } catch {
      /* ignore */
    }
  }, [patientId, visitsQuery.isSuccess, visits, pathOnly, location, applyVisitSelection, navigate]);

  const withVisit = useCallback(
    (href: string) => {
      if (!patientId) return href;
      const sep = href.includes("?") ? "&" : "?";
      let qs = `visitDate=${encodeURIComponent(visitDate)}`;
      if (visitId != null) {
        qs += `&visitId=${visitId}`;
      }
      return `${href}${sep}${qs}`;
    },
    [patientId, visitDate, visitId],
  );

  const navItems: Array<{
    key: NavKey;
    label: string;
    href: string;
    icon: LucideIcon;
    match: (path: string) => boolean;
  }> = useMemo(
    () => [
      {
        key: "brief",
        label: "الموجز",
        href: patientId ? withVisit(`/patient-hub/brief/${patientId}`) : "/patient-hub/brief",
        icon: LayoutGrid,
        match: (p) => p.startsWith("/patient-hub/brief") || p.startsWith("/patient-hub/summary"),
      },
      {
        key: "exams",
        label: "الفحوصات",
        href: patientId ? withVisit(`/patient-hub/examination/${patientId}`) : "/patient-hub/examination",
        icon: Activity,
        match: (p) => p.startsWith("/patient-hub/examination"),
      },
      {
        key: "rx",
        label: "الروشتة",
        href: patientId ? withVisit(`/patient-hub/prescription/${patientId}`) : "/patient-hub/prescription",
        icon: Pill,
        match: (p) => p.startsWith("/patient-hub/prescription"),
      },
      {
        key: "labs",
        label: "تحاليل وأشعة",
        href: patientId ? withVisit(`/patient-hub/request-tests/${patientId}`) : "/patient-hub/request-tests",
        icon: FlaskConical,
        match: (p) => p.startsWith("/patient-hub/request-tests"),
      },
      {
        key: "visits",
        label: "الزيارات",
        href: patientId ? withVisit(`/patient-hub/visits/${patientId}`) : "/patient-hub/visits",
        icon: CalendarCheck,
        match: (p) => p.startsWith("/patient-hub/visits"),
      },
      {
        key: "followups",
        label: "المتابعات",
        href: patientId ? withVisit(`/patient-hub/followups/${patientId}`) : "/patient-hub/followups",
        icon: Repeat,
        match: (p) => p.startsWith("/patient-hub/followups"),
      },
      {
        key: "pentacam",
        label: "بنتاكام",
        href: patientId
          ? withVisit(`/patient-hub/pentacam-dashboard/${patientId}`)
          : "/patient-hub/pentacam-dashboard",
        icon: CircleDot,
        match: (p) => p.startsWith("/patient-hub/pentacam-dashboard"),
      },
      {
        key: "sheets",
        label: "الشيتات",
        href: patientId ? withVisit(`/patient-hub/sheets/consultant/${patientId}`) : "/patient-hub/sheets/consultant",
        icon: ClipboardList,
        match: (p) => p.startsWith("/patient-hub/sheets"),
      },
      {
        key: "reports",
        label: "تقارير",
        href: patientId ? withVisit(`/patient-hub/reports/${patientId}`) : "/patient-hub/reports",
        icon: FileText,
        match: (p) => p.startsWith("/patient-hub/reports"),
      },
    ],
    [patientId, withVisit],
  );

  const age = patientQuery.data ? computeAge(patientQuery.data as { age?: number | null; dateOfBirth?: unknown }) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background" dir="rtl">
      {/* Combined header: no patient → back + title; patient selected → back + identity + visit */}
      <header className="z-20 shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-sm print:border-b-0 print:bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => goBack()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </button>

          {patientId ? (
            <>
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="truncate font-semibold leading-tight text-foreground">
                  {patientQuery.data?.fullName ?? "جاري التحميل..."}
                </span>
                {age != null && (
                  <span className="shrink-0 text-xs text-muted-foreground">{age} سنة</span>
                )}
                <span dir="ltr" className="shrink-0 font-mono text-xs text-muted-foreground">
                  #{patientId}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {visitsQuery.isLoading ? (
                  <div className="h-7 w-28 animate-pulse rounded-md bg-muted" aria-hidden />
                ) : visits.length === 0 ? (
                  <span className="text-xs text-muted-foreground">لا توجد زيارات</span>
                ) : (
                  <div className="flex items-center gap-0.5" dir="ltr">
                    <button
                      type="button"
                      disabled={currentVisitIdx >= visits.length - 1}
                      onClick={() => {
                        const v = visits[currentVisitIdx + 1];
                        if (v) applyVisitSelection(visitDateKey(v), v.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      aria-label="زيارة أقدم"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 px-1 text-center" dir="rtl">
                      <p className="whitespace-nowrap text-sm font-medium leading-none text-foreground">
                        {formatVisitDisplay(visits[currentVisitIdx >= 0 ? currentVisitIdx : 0] as { id: number; visitDate?: unknown; visitType?: string | null })}
                      </p>
                      {visits.length > 1 && (
                        <p className="mt-0.5 text-[10px] leading-none text-muted-foreground" dir="ltr">
                          {(currentVisitIdx >= 0 ? currentVisitIdx : 0) + 1} / {visits.length}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={currentVisitIdx <= 0}
                      onClick={() => {
                        const v = visits[currentVisitIdx - 1];
                        if (v) applyVisitSelection(visitDateKey(v), v.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      aria-label="زيارة أحدث"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href={`/patient-hub?visitDate=${encodeURIComponent(visitDate)}`}>
                    <Search className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">تغيير</span>
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <h1 className="font-semibold text-foreground">مركز المريض</h1>
          )}
        </div>
      </header>

      {/* Horizontal tabs — desktop only, patient-specific sections */}
      {patientId ? (
        <div className="hidden shrink-0 border-b border-border/60 bg-background print:hidden md:block">
          <div
            className="mx-auto flex max-w-[1600px] overflow-x-auto scrollbar-none"
            dir="rtl"
            role="tablist"
            aria-label="أقسام ملف المريض"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathOnly);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                    active
                      ? "border-b-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-b-border",
                  )}
                >
                  <Icon
                    className="h-[15px] w-[15px] shrink-0"
                    strokeWidth={active ? 2.2 : 1.8}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Main content — full width, no sidebar */}
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col bg-background",
          patientId ? "pb-14 md:pb-0" : "",
        )}
      >
          <Switch>
            <Route
              path="/patient-hub/examination/:id"
              component={() => (
                <PatientHubExaminationInner
                  visitDate={visitDate}
                  visitId={visitId}
                  visits={visits}
                  applyVisitSelection={applyVisitSelection}
                />
              )}
            />
            <Route
              path="/patient-hub/examination"
              component={() => (
                <div className="flex min-h-[30vh] items-center justify-center p-6 text-sm text-muted-foreground">
                  اختر مريضاً لفتح ملف الفحص داخل المركز.
                </div>
              )}
            />

            <Route
              path="/patient-hub/prescription/:id"
              component={() => (
                <WritePrescription
                  hidePageChrome
                  hubVisitDate={visitDate}
                  embeddedInPatientHub
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />
            <Route
              path="/patient-hub/prescription"
              component={() => (
                <WritePrescription
                  hidePageChrome
                  hubVisitDate={visitDate}
                  embeddedInPatientHub
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />

            <Route
              path="/patient-hub/request-tests/:id"
              component={() => (
                <RequestTests
                  hidePageChrome
                  hubVisitDate={visitDate}
                  embeddedInPatientHub
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />
            <Route
              path="/patient-hub/request-tests"
              component={() => (
                <RequestTests
                  hidePageChrome
                  hubVisitDate={visitDate}
                  embeddedInPatientHub
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />

            <Route
              path="/patient-hub/visits/:id"
              component={() => (
                <Visits
                  hidePageChrome
                  hubVisitDateFilter={visitDate}
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />
            <Route
              path="/patient-hub/visits"
              component={() => (
                <Visits
                  hidePageChrome
                  hubVisitDateFilter={visitDate}
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />

            <Route
              path="/patient-hub/followups/:id"
              component={() => (
                <Followups
                  embeddedPatientId={patientId ? Number(patientId) : undefined}
                  hidePageChrome
                  hubVisitDateFilter={visitDate}
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />
            <Route
              path="/patient-hub/followups"
              component={() => (
                <Followups
                  hidePageChrome
                  hubVisitDateFilter={visitDate}
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />

            <Route path="/patient-hub/sheets/consultant/:id" component={ConsultantSheet} />

            <Route
              path="/patient-hub/pentacam-dashboard/:id"
              component={() => (
                <PentacamResultsDashboard
                  embeddedPatientId={patientId ? Number(patientId) : undefined}
                  hidePageChrome
                  hubVisitDate={visitDate}
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />
            <Route
              path="/patient-hub/pentacam-dashboard"
              component={() => (
                <PentacamResultsDashboard
                  hidePageChrome
                  hubVisitDate={visitDate}
                  patientHubReadOnly
                  patientHubViewOnlyHint={PATIENT_HUB_VIEW_ONLY_HINT}
                />
              )}
            />

            <Route path="/patient-hub/brief/:id" component={PatientSummary} />
            <Route path="/patient-hub/file/:id" component={PatientHubFileToExaminationRedirect} />
            <Route
              path="/patient-hub/file"
              component={() => <HubNeedPatientSearch visitDate={visitDate} />}
            />
            <Route
              path="/patient-hub/brief"
              component={() => <HubNeedPatientSearch visitDate={visitDate} />}
            />
            <Route path="/patient-hub/summary/:id" component={PatientSummary} />
            <Route
              path="/patient-hub/summary"
              component={() => <HubNeedPatientSearch visitDate={visitDate} />}
            />
            <Route path="/patient-hub/reports/:id" component={MedicalReports} />
            <Route path="/patient-hub/doctor/:id" component={PatientHubDoctorToBriefRedirect} />
            <Route
              path="/patient-hub/reports"
              component={() => <HubNeedPatientSearch visitDate={visitDate} />}
            />
            <Route
              path="/patient-hub/doctor"
              component={() => <HubNeedPatientSearch visitDate={visitDate} />}
            />
            <Route
              path="/patient-hub/sheets/consultant"
              component={() => <HubNeedPatientSearch visitDate={visitDate} />}
            />
            <Route path={/^\/patient-hub$/} component={() => <PatientHubHome visitDate={visitDate} />} />
            <Route path="/patients/:id" component={PatientDetails} />
            <Route path="/patient-file/:id" component={PatientDetails} />
            <Route path="/patient-file" component={PatientDetails} />
            <Route path="/patient-summary/:id" component={PatientSummary} />
            <Route path="/patient-summary" component={PatientSummary} />
            <Route path="/medical-reports/:id" component={MedicalReports} />
            <Route path="/medical-reports" component={MedicalReports} />
            <Route>
              <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-16 text-center">
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  محتوى مركز المريض — يتم تحميل الصفحة المحددة
                </p>
              </div>
            </Route>
          </Switch>
        </main>

      {/* Mobile bottom nav — 4 primary tabs + المزيد */}
      {patientId ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t border-border/60 bg-background md:hidden print:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          dir="rtl"
        >
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = item.match(pathOnly);
            return (
              <Link
                key={item.key}
                href={item.href}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
              >
                {active && (
                  <span className="absolute inset-x-2 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden />
                )}
                <Icon
                  className={cn("h-[20px] w-[20px] shrink-0", active ? "text-primary" : "text-muted-foreground/70")}
                  strokeWidth={active ? 2.2 : 1.8}
                  aria-hidden
                />
                <span
                  className={cn(
                    "whitespace-nowrap text-[9px] leading-none",
                    active ? "font-semibold text-primary" : "font-medium text-muted-foreground/70",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
            onClick={() => setMoreOpen(true)}
            aria-label="المزيد"
          >
            <MoreHorizontal className="h-[20px] w-[20px] shrink-0 text-muted-foreground/70" aria-hidden />
            <span className="whitespace-nowrap text-[9px] font-medium leading-none text-muted-foreground/70">المزيد</span>
          </button>
        </nav>
      ) : null}

      {/* More bottom sheet (mobile) */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0" dir="rtl">
          <SheetHeader className="px-6 pb-3 pt-4">
            <SheetTitle className="text-right text-base font-semibold">أقسام أخرى</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            {navItems.slice(4).map((item) => {
              const Icon = item.icon;
              const active = item.match(pathOnly);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex h-14 items-center gap-4 border-t border-border/40 px-6 transition-colors",
                    active
                      ? "bg-primary/5 text-primary"
                      : "text-foreground hover:bg-muted/40",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                    aria-hidden
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className={patientId ? "hidden md:block" : undefined}>
        <AppShellFooter />
      </div>
    </div>
  );
}
