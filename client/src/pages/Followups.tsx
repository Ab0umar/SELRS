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
import { AlertTriangle, CalendarCheck, CalendarDays, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type FollowupStatus = "upcoming" | "completed" | "overdue";

const filterOptions = [
  { value: "all", label: "الكل" },
  { value: "upcoming", label: "قادمة" },
  { value: "completed", label: "مكتملة" },
  { value: "overdue", label: "متأخرة" },
];

function followupHasRecord(row: Record<string, unknown>): boolean {
  for (const k of ["findings", "recommendations", "notes", "diagnosis", "treatmentPlan"]) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return true;
  }
  return false;
}

function deriveFollowupStatus(row: Record<string, unknown>, followupDateRaw: unknown): FollowupStatus {
  if (followupHasRecord(row)) return "completed";
  const d = followupDateRaw ? new Date(String(followupDateRaw)) : null;
  if (!d || Number.isNaN(d.getTime())) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return "overdue";
  return "upcoming";
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

function followupRowId(row: any, fallback: number): number {
  const id = row?.id;
  return typeof id === "number" && Number.isFinite(id) ? id : fallback;
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
  const [expandedFollowupId, setExpandedFollowupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });

  const allFollowupsQuery = trpc.medical.getPostOpFollowupsByPatient.useQuery(
    { patientId: 0 },
    { refetchOnWindowFocus: false },
  );

  const patientFollowupsQuery = trpc.medical.getPostOpFollowupsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const patient = patientQuery.data as any;
  const followups = (patientId > 0 ? patientFollowupsQuery.data ?? [] : allFollowupsQuery.data ?? []) as any[];
  const isLoading = patientId > 0 ? patientFollowupsQuery.isLoading : allFollowupsQuery.isLoading;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (embeddedPatientId && embeddedPatientId > 0) {
      setPatientId(embeddedPatientId);
    }
  }, [embeddedPatientId]);

  const getPatientAge = (dob: string) => {
    if (!dob) return "-";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const day = dayNames[date.getDay()];
      const dateFormatted = date.toLocaleDateString("ar-EG");
      const time = date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      return `${day} - ${dateFormatted} ${time}`;
    } catch {
      return dateString;
    }
  };

  const formatDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      return value.map((item) => formatDisplayValue(item)).filter(Boolean).join(", ");
    }
    if (typeof value === "object") {
      const maybeFundus = value as Record<string, unknown>;
      const fundusText = [
        maybeFundus.discStatus,
        maybeFundus.cupDiscRatio,
        maybeFundus.macuaStatus,
        maybeFundus.vesselStatus,
        maybeFundus.otherFindings,
      ]
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .join(", ");
      if (fundusText) return fundusText;
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }
    return "";
  };

  const stats = useMemo(() => {
    const rows = followups as Record<string, unknown>[];
    const thisWeek = rows.filter((f) => {
      const raw = f.followupDate ?? f.createdAt;
      const d = raw ? new Date(String(raw)) : null;
      return d && !Number.isNaN(d.getTime()) && isInCurrentCalendarWeek(d);
    }).length;
    const overdue = rows.filter((f) => deriveFollowupStatus(f, f.followupDate ?? f.createdAt) === "overdue").length;
    return { total: rows.length, thisWeek, overdue };
  }, [followups]);

  const filteredFollowups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const nameHint = patientId > 0 && patient?.fullName ? String(patient.fullName).toLowerCase() : "";
    return followups.filter((raw, idx) => {
      const f = raw as Record<string, unknown>;
      const status = deriveFollowupStatus(f, f.followupDate ?? f.createdAt);
      if (activeStatus !== "all" && status !== activeStatus) return false;
      if (hubVisitDateFilter?.trim()) {
        const vd = f.followupDate ?? f.createdAt;
        const key = vd ? new Date(String(vd)).toISOString().split("T")[0] : "";
        if (key !== hubVisitDateFilter) return false;
      }
      if (!needle) return true;
      const parts = [
        formatDateTime(String(f.followupDate ?? f.createdAt ?? "")),
        formatDisplayValue(f.findings),
        formatDisplayValue(f.recommendations),
        formatDisplayValue(f.notes),
        formatDisplayValue(f.status),
        nameHint,
        patientId <= 0 ? `مريض ${String(f.patientId ?? "")}` : "",
        `id ${followupRowId(raw, idx)}`,
      ];
      const hay = parts.join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [followups, search, activeStatus, patientId, patient, hubVisitDateFilter]);

  const getStatusBadge = (status: FollowupStatus) => {
    switch (status) {
      case "upcoming":
        return <Badge className="border-0 bg-primary/10 text-[10px] text-primary hover:bg-primary/10">قادمة</Badge>;
      case "completed":
        return (
          <Badge className="border-0 bg-success/15 text-[10px] text-success hover:bg-success/15">مكتملة</Badge>
        );
      case "overdue":
        return <Badge className="border-0 bg-destructive/10 text-[10px] text-destructive hover:bg-destructive/10">متأخرة</Badge>;
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className={cn("mx-auto w-full", hidePageChrome ? "max-w-none px-2 py-3" : "max-w-[1280px]")} dir="rtl">
      {!hidePageChrome ? (
        <>
          <PageHeader
            title="المتابعات"
            subtitle="إدارة مواعيد المتابعة"
            icon={<CalendarCheck className="h-5 w-5" />}
            action={
              <Button size="sm" className="selrs-gradient-btn gap-2 text-primary-foreground" onClick={() => setLocation("/patients")} type="button">
                <Plus className="h-4 w-4" />
                <span className="text-xs sm:text-sm">متابعة جديدة</span>
              </Button>
            }
          />

          <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-3 sm:gap-4")}>
            <StatCard
              title="إجمالي المتابعات"
              value={stats.total}
              icon={CalendarDays}
              description="إجمالي السجلات"
              iconColor="bg-primary text-primary-foreground"
            />
            <StatCard
              title="متابعة هذا الأسبوع"
              value={stats.thisWeek}
              icon={CalendarCheck}
              description="خلال الأسبوع الحالي"
              iconColor="bg-success/15 text-success"
            />
            <StatCard
              title="متأخرة"
              value={stats.overdue}
              icon={AlertTriangle}
              description="تحتاج تواصل"
              iconColor="bg-destructive/10 text-destructive"
            />
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
          <SearchBar value={search} onChange={setSearch} placeholder="بحث عن تاريخ أو ملاحظات أو رقم المريض..." />
        </div>
        <FilterBar filters={filterOptions} selected={activeStatus} onSelect={setActiveStatus} />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {patientId > 0 && patient ? (
              <div className="flex flex-1 items-start gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{patient?.fullName || "المريض"}</CardTitle>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                    <div>
                      العمر: <span className="font-medium text-foreground">{getPatientAge(patient?.dateOfBirth)} سنة</span>
                    </div>
                    <div>
                      الدكتور: <span className="font-medium text-foreground">{patient?.doctorName || "-"}</span>
                    </div>
                  </div>
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
                <CardHeader>
                  <CardTitle className="text-base">اختيار المريض</CardTitle>
                </CardHeader>
                <CardContent>
                  <PatientPicker
                    initialPatientId={patientId > 0 ? patientId : undefined}
                    onSelect={(selected) => {
                      setPatientId(selected.id);
                      setExpandedFollowupId(null);
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-3">
            {isLoading && <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div>}

            {!isLoading && filteredFollowups.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                {followups.length === 0 ? "لا توجد متابعات مسجلة" : "لا توجد متابعات مطابقة للبحث"}
              </div>
            )}

            {!isLoading &&
              filteredFollowups.map((followup, index) => {
                const row = followup as Record<string, unknown>;
                const fid = followupRowId(followup, index);
                const isExpanded = expandedFollowupId === fid;
                const followupDate = (followup as any).followupDate || (followup as any).createdAt;
                const st = deriveFollowupStatus(row, row.followupDate ?? row.createdAt);
                const pid = Number((followup as any).patientId ?? 0);

                return (
                  <Card key={fid} className="border-border transition-shadow hover:shadow-md">
                    <div className="flex items-stretch gap-0">
                      <button type="button" onClick={() => setExpandedFollowupId(isExpanded ? null : fid)} className="min-w-0 flex-1 text-right">
                        <CardHeader className="hover:bg-muted/40">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base text-right">
                                {patientId <= 0 && pid ? (
                                  <>
                                    مريض #{pid}
                                    <span className="mr-2 text-sm font-normal text-muted-foreground">— {formatDateTime(followupDate)}</span>
                                  </>
                                ) : (
                                  <>متابعة: {formatDateTime(followupDate)}</>
                                )}
                              </CardTitle>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {(followup as any).status ? (
                                  <div className="text-sm text-muted-foreground">
                                    الحالة: <span className="font-medium text-foreground">{formatDisplayValue((followup as any).status)}</span>
                                  </div>
                                ) : null}
                                {getStatusBadge(st)}
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
                            onClick={() => {
                              const qs = typeof window !== "undefined" ? window.location.search : "";
                              setLocation(
                                patientHubReadOnly ? `/patient-hub/examination/${pid}${qs}` : `/patient-file/${pid}`,
                              );
                            }}
                            title="ملف المريض"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {isExpanded && (
                      <CardContent className="space-y-6 border-t border-border pt-4">
                        {followup.notes && (
                          <div>
                            <h4 className="mb-2 font-semibold text-foreground">الملاحظات</h4>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formatDisplayValue(followup.notes)}</p>
                          </div>
                        )}

                        {followup.symptoms && (
                          <div>
                            <h4 className="mb-2 font-semibold text-foreground">الأعراض</h4>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formatDisplayValue(followup.symptoms)}</p>
                          </div>
                        )}

                        {(followup.findings || followup.recommendations) && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {followup.findings ? (
                              <div>
                                <h4 className="mb-2 font-semibold text-foreground">النتائج</h4>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formatDisplayValue(followup.findings)}</p>
                              </div>
                            ) : null}
                            {followup.recommendations ? (
                              <div>
                                <h4 className="mb-2 font-semibold text-foreground">التوصيات</h4>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formatDisplayValue(followup.recommendations)}</p>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {(followup.ucvaOD || followup.bcvaOD) && (
                          <div>
                            <h4 className="mb-3 font-semibold text-foreground">قياسات الرؤية</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="px-2 py-2 text-right">المقياس</th>
                                    <th className="px-2 py-2 text-center">OD</th>
                                    <th className="px-2 py-2 text-center">OS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(followup.ucvaOD || followup.ucvaOS) && (
                                    <tr className="border-b border-border/60">
                                      <td className="px-2 py-2 text-right">UCVA</td>
                                      <td className="px-2 py-2 text-center">{followup.ucvaOD || "-"}</td>
                                      <td className="px-2 py-2 text-center">{followup.ucvaOS || "-"}</td>
                                    </tr>
                                  )}
                                  {(followup.bcvaOD || followup.bcvaOS) && (
                                    <tr className="border-b border-border/60">
                                      <td className="px-2 py-2 text-right">BCVA</td>
                                      <td className="px-2 py-2 text-center">{followup.bcvaOD || "-"}</td>
                                      <td className="px-2 py-2 text-center">{followup.bcvaOS || "-"}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {(followup.k1OD || followup.k2OD) && (
                          <div>
                            <h4 className="mb-3 font-semibold text-foreground">البنتاكام</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="px-2 py-2 text-right">المقياس</th>
                                    <th className="px-2 py-2 text-center">OD</th>
                                    <th className="px-2 py-2 text-center">OS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-border/60">
                                    <td className="px-2 py-2 text-right">K1 / K2</td>
                                    <td className="px-2 py-2 text-center">
                                      {followup.k1OD} / {followup.k2OD}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      {followup.k1OS} / {followup.k2OS}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {followup.glassPrescription && (
                          <div>
                            <h4 className="mb-2 font-semibold text-foreground">وصفة النظارة</h4>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formatDisplayValue(followup.glassPrescription)}</p>
                          </div>
                        )}

                        {followup.medications && (
                          <div>
                            <h4 className="mb-2 font-semibold text-foreground">الأدوية</h4>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formatDisplayValue(followup.medications)}</p>
                          </div>
                        )}

                        {(followup.diagnosis || followup.treatmentPlan) && (
                          <div>
                            <h4 className="mb-3 font-semibold text-foreground">التشخيص والعلاج</h4>
                            {followup.diagnosis && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-muted-foreground">التشخيص:</p>
                                <p className="text-sm text-foreground">{formatDisplayValue(followup.diagnosis)}</p>
                              </div>
                            )}
                            {followup.treatmentPlan && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">خطة العلاج:</p>
                                <p className="text-sm text-foreground">{formatDisplayValue(followup.treatmentPlan)}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {!followup.notes &&
                          !followup.symptoms &&
                          !followup.ucvaOD &&
                          !followup.k1OD &&
                          !followup.glassPrescription &&
                          !followup.medications &&
                          !followup.diagnosis &&
                          !followup.findings &&
                          !followup.recommendations && (
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
