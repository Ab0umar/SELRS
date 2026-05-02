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
  ArrowRight,
  Activity,
  CalendarCheck,
  CircleDot,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutGrid,
  Pill,
  Repeat,
  RefreshCw,
  Search,
} from "lucide-react";
import { AppShellFooter } from "@/components/layout/AppShellFooter";
import PatientHubHome from "./PatientHubHome";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function formatVisitPickerLabel(visit: { visitDate?: unknown; visitType?: string | null; id: number }) {
  const day = visitDateKey(visit);
  const t = visit.visitType?.trim();
  return t ? `${day} — ${t}` : `#${visit.id} ${day}`;
}

/** عرض الطبيب أصبح داخل الموجز؛ الروابط القديمة تُحوَّل للموجز مع نفس الاستعلام */
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
        لم يُحدَّد مريض. استخدم بحث مركز المريض ثم اختر المريض لفتح هذا القسم.
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

/** Patient Hub: examinations are view-only (no save/create/delete inside panel). */
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
    <div className="min-h-0 flex-1 p-3 sm:p-4">
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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fafafa] dark:bg-background" dir="rtl">
      <header className="shrink-0 border-b border-border/80 bg-background">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-3 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => goBack()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <h1 className="text-lg font-black leading-tight text-foreground sm:text-xl">مركز المريض</h1>
            <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground tabular-nums">
              {patientId
                ? `${patientQuery.data?.fullName ?? ""} (${patientId})`.trim()
                : "لم يُختَر مريض"}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:max-w-none">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[15rem] md:max-w-[20rem]">
              <Label className="shrink-0 text-xs font-semibold whitespace-nowrap text-muted-foreground">
                الزيارة
              </Label>
              {patientId && visitsQuery.isLoading ? (
                <Input
                  type="date"
                  className="h-9 min-w-[9rem] flex-1 shrink-0"
                  value={visitDate}
                  disabled
                  title="جاري تحميل الزيارات…"
                />
              ) : patientId && visitsQuery.isSuccess && visits.length > 0 ? (
                <Select
                  value={visitId != null ? String(visitId) : ""}
                  onValueChange={(v) => {
                    const vid = Number(v);
                    const row = visits.find((x) => x.id === vid);
                    if (row) {
                      applyVisitSelection(visitDateKey(row), vid);
                    }
                  }}
                >
                  <SelectTrigger dir="rtl" className="h-9 min-w-0 flex-1 text-start">
                    <SelectValue placeholder="اختر الزيارة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {visits.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)} className="text-start">
                        {formatVisitPickerLabel(v as { id: number; visitDate?: unknown; visitType?: string | null })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="date"
                  className="h-9 min-w-[9rem] flex-1"
                  value={visitDate}
                  onChange={(e) => applyVisitSelection(e.target.value, null)}
                  disabled={!patientId || visitsQuery.isLoading}
                  title={
                    patientId && visitsQuery.isSuccess && visits.length === 0
                      ? "لا توجد زيارات مسجّلة؛ يمكن اختيار يوم مرجعي يدوياً"
                      : undefined
                  }
                />
              )}
            </div>
            {patientId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                asChild
              >
                <Link href={`/patient-hub?visitDate=${encodeURIComponent(visitDate)}`}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">تغيير المريض</span>
                  <span className="sm:hidden">بحث</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col md:flex-row md:min-h-0">
        {patientId ? (
          <aside className="shrink-0 border-b border-border/80 bg-background md:w-[13.5rem] md:border-b-0 md:border-s md:border-border/80 xl:w-56">
            <nav className="flex flex-row gap-0.5 overflow-x-auto px-2 py-2 md:flex-col md:overflow-y-auto md:px-2 md:py-3 scrollbar-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathOnly);
                return (
                  <Link key={item.key} href={item.href} className="shrink-0 md:w-full">
                    <span
                      className={cn(
                        "flex min-w-[8.5rem] cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors md:min-w-0 md:w-full",
                        active
                          ? "bg-primary/12 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                          active
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/40 text-muted-foreground",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <main
          className={cn(
            "flex min-h-[50vh] min-h-0 flex-1 flex-col bg-background md:min-h-0",
            patientId ? "md:border-s md:border-border/80" : "",
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
      </div>

      <AppShellFooter />
    </div>
  );
}
