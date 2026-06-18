import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type FollowupStatus = "upcoming" | "completed" | "overdue";

const filterOptions = [
  { value: "all", label: "الكل" },
  { value: "upcoming", label: "قادمة" },
  { value: "completed", label: "مكتملة" },
  { value: "overdue", label: "متأخرة" },
];

const SHEET_TYPE_LABEL: Record<string, string> = {
  consultant: "استشارة",
  specialist: "تخصص",
  lasik: "ليزك",
  external: "خارجي",
};

function deriveStatus(item: any): FollowupStatus {
  if (item.notes?.trim() || item.treatment?.trim()) return "completed";
  const d = item.followupDate ? new Date(String(item.followupDate)) : null;
  if (!d || Number.isNaN(d.getTime())) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today ? "overdue" : "upcoming";
}

function isInCurrentCalendarWeek(d: Date): boolean {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

function formatDate(raw: unknown): string {
  if (!raw) return "-";
  try {
    return new Date(String(raw)).toLocaleDateString("ar-EG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(raw);
  }
}

export type FollowupsProps = {
  embeddedPatientId?: number;
  hidePageChrome?: boolean;
  hubVisitDateFilter?: string;
  patientHubReadOnly?: boolean;
  patientHubViewOnlyHint?: string;
};

export default function Followups(props: Partial<FollowupsProps> & object = {}) {
  const embeddedPatientId = props?.embeddedPatientId;
  const hidePageChrome = props?.hidePageChrome;
  const hubVisitDateFilter = props?.hubVisitDateFilter;
  const patientHubReadOnly = Boolean(props?.patientHubReadOnly);
  const patientHubViewOnlyHint = props?.patientHubViewOnlyHint ?? "العرض فقط داخل المركز";

  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [patientId, setPatientId] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });

  // All items (no patient filter)
  const allItemsQuery = trpc.medical.getAllFollowupItems.useQuery(undefined, {
    enabled: patientId <= 0,
    refetchOnWindowFocus: false,
  });

  // Per-patient sheets (with items nested)
  const patientSheetsQuery = trpc.medical.getFollowupSheets.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: patientId > 0, refetchOnWindowFocus: false },
  );

  const patient = patientQuery.data as any;

  // Flatten patient sheets → items
  const patientItems = useMemo(() => {
    if (patientId <= 0) return [];
    const sheets = (patientSheetsQuery.data ?? []) as any[];
    return sheets.flatMap((sheet: any) =>
      (sheet.items ?? [])
        .filter((item: any) => item.followupDate)
        .map((item: any) => ({
          ...item,
          sheetType: sheet.sheetType,
          patientId: sheet.patientId,
          patientFullName: patient?.fullName ?? "",
          patientCode: patient?.patientCode ?? "",
        })),
    );
  }, [patientSheetsQuery.data, patientId, patient]);

  const allItems = patientId > 0 ? patientItems : ((allItemsQuery.data ?? []) as any[]);
  const isLoading = patientId > 0 ? patientSheetsQuery.isLoading : allItemsQuery.isLoading;

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (embeddedPatientId && embeddedPatientId > 0) setPatientId(embeddedPatientId);
  }, [embeddedPatientId]);

  const stats = useMemo(() => {
    const thisWeek = allItems.filter((item) => {
      const d = item.followupDate ? new Date(String(item.followupDate)) : null;
      return d && !Number.isNaN(d.getTime()) && isInCurrentCalendarWeek(d);
    }).length;
    const overdue = allItems.filter((item) => deriveStatus(item) === "overdue").length;
    return { total: allItems.length, thisWeek, overdue };
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allItems.filter((item) => {
      const st = deriveStatus(item);
      if (activeStatus !== "all" && st !== activeStatus) return false;
      if (hubVisitDateFilter?.trim()) {
        const key = item.followupDate
          ? new Date(String(item.followupDate)).toISOString().split("T")[0]
          : "";
        if (key !== hubVisitDateFilter) return false;
      }
      if (!needle) return true;
      const hay = [
        item.patientFullName,
        item.patientCode,
        item.followupName,
        item.notes,
        item.treatment,
        item.vaOD,
        item.vaOS,
        formatDate(item.followupDate),
        SHEET_TYPE_LABEL[item.sheetType] ?? item.sheetType,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [allItems, search, activeStatus, hubVisitDateFilter]);

  const getStatusBadge = (st: FollowupStatus) => {
    if (st === "completed")
      return <Badge className="border-0 bg-success/15 text-[10px] text-success hover:bg-success/15">مكتملة</Badge>;
    if (st === "overdue")
      return <Badge className="border-0 bg-destructive/10 text-[10px] text-destructive hover:bg-destructive/10">متأخرة</Badge>;
    return <Badge className="border-0 bg-primary/10 text-[10px] text-primary hover:bg-primary/10">قادمة</Badge>;
  };

  if (!isAuthenticated) return null;

  return (
    <div
      className={cn("mx-auto w-full", hidePageChrome ? "max-w-none px-2 py-3" : "max-w-[1280px]")}
      dir="rtl"
    >
      {!hidePageChrome ? (
        <>
          <PageHeader
            title="المتابعات"
            subtitle="إدارة مواعيد المتابعة"
            icon={<CalendarCheck className="h-5 w-5" />}
            action={
              <Button
                size="sm"
                className="selrs-gradient-btn gap-2 text-primary-foreground"
                onClick={() => setLocation("/followup/0")}
                type="button"
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs sm:text-sm">متابعة جديدة</span>
              </Button>
            }
          />
          <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-3 sm:gap-4")}>
            <StatCard title="إجمالي المتابعات" value={stats.total} icon={CalendarDays} description="إجمالي السجلات" iconColor="bg-primary text-primary-foreground" />
            <StatCard title="متابعة هذا الأسبوع" value={stats.thisWeek} icon={CalendarCheck} description="خلال الأسبوع الحالي" iconColor="bg-success/15 text-success" />
            <StatCard title="متأخرة" value={stats.overdue} icon={AlertTriangle} description="تحتاج تواصل" iconColor="bg-destructive/10 text-destructive" />
          </div>
        </>
      ) : null}

      {hidePageChrome && patientHubReadOnly ? (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {patientHubViewOnlyHint}
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:w-72">
          <SearchBar value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود أو الملاحظات..." />
        </div>
        <FilterBar filters={filterOptions} selected={activeStatus} onSelect={setActiveStatus} />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {patientId > 0 && patient ? (
              <div className="flex-1">
                <CardTitle className="text-2xl">{patient?.fullName || "المريض"}</CardTitle>
                <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  <div>الدكتور: <span className="font-medium text-foreground">{patient?.doctorName || "-"}</span></div>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <CardTitle className="text-2xl">جميع المتابعات</CardTitle>
                <div className="mt-2 text-sm text-muted-foreground">اختر مريضاً للتصفية حسب الملف</div>
              </div>
            )}
            <div className="w-full sm:w-auto sm:min-w-[300px]">
              <Card className="border-border shadow-sm">
                <CardHeader><CardTitle className="text-base">اختيار المريض</CardTitle></CardHeader>
                <CardContent>
                  <PatientPicker
                    initialPatientId={patientId > 0 ? patientId : undefined}
                    onSelect={(selected) => { setPatientId(selected.id); setExpandedId(null); }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-3">
            {isLoading && <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div>}

            {!isLoading && filteredItems.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                {allItems.length === 0 ? "لا توجد متابعات مسجلة" : "لا توجد متابعات مطابقة للبحث"}
              </div>
            )}

            {!isLoading && filteredItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const st = deriveStatus(item);
              const pid = Number(item.patientId ?? 0);

              return (
                <Card key={item.id} className="border-border transition-shadow hover:shadow-md">
                  <div className="flex items-stretch gap-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="min-w-0 flex-1 text-right"
                    >
                      <CardHeader className="hover:bg-muted/40">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base text-right">
                              {patientId <= 0 ? (
                                <>
                                  <span className="font-semibold">{item.patientFullName || `مريض #${pid}`}</span>
                                  {item.patientCode ? <span className="mr-2 text-sm font-normal text-muted-foreground">({item.patientCode})</span> : null}
                                  <span className="mr-2 text-sm font-normal text-muted-foreground">— {formatDate(item.followupDate)}</span>
                                </>
                              ) : (
                                <>{item.followupName || "متابعة"}: {formatDate(item.followupDate)}</>
                              )}
                            </CardTitle>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {getStatusBadge(st)}
                              {item.sheetType ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {SHEET_TYPE_LABEL[item.sheetType] ?? item.sheetType}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </CardHeader>
                    </button>
                    {pid > 0 ? (
                      <div className="flex items-center border-r border-border px-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => setLocation(patientHubReadOnly ? `/patient-hub/examination/${pid}${typeof window !== "undefined" ? window.location.search : ""}` : `/patient-file/${pid}`)}
                          title="ملف المريض"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {isExpanded && (
                    <CardContent className="space-y-4 border-t border-border pt-4">
                      {(item.vaOD || item.vaOS) && (
                        <div>
                          <h4 className="mb-2 font-semibold">حدة الإبصار</h4>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>OD: <strong className="text-foreground">{item.vaOD || "-"}</strong></span>
                            <span>OS: <strong className="text-foreground">{item.vaOS || "-"}</strong></span>
                          </div>
                        </div>
                      )}
                      {(item.iopOD || item.iopOS) && (
                        <div>
                          <h4 className="mb-2 font-semibold">IOP</h4>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>OD: <strong className="text-foreground">{item.iopOD || "-"}</strong></span>
                            <span>OS: <strong className="text-foreground">{item.iopOS || "-"}</strong></span>
                          </div>
                        </div>
                      )}
                      {item.treatment && (
                        <div>
                          <h4 className="mb-2 font-semibold">العلاج</h4>
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.treatment}</p>
                        </div>
                      )}
                      {item.notes && (
                        <div>
                          <h4 className="mb-2 font-semibold">الملاحظات</h4>
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.notes}</p>
                        </div>
                      )}
                      {!item.vaOD && !item.vaOS && !item.iopOD && !item.treatment && !item.notes && (
                        <div className="py-4 text-center text-muted-foreground">لا توجد بيانات مسجلة لهذه المتابعة</div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
