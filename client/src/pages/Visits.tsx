import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";
import { CalendarDays, ClipboardList, Edit, CalendarRange, Check, ChevronDown, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const visitKindTabs = [
  { value: "all", label: "الكل" },
  { value: "examination", label: "فحص" },
  { value: "followup", label: "متابعة" },
  { value: "consultation", label: "استشارة" },
  { value: "surgery", label: "عملية" },
];

const visitTypeLabels: Record<string, string> = {
  examination: "فحص",
  followup: "متابعة",
  consultation: "استشارة",
  surgery: "عملية",
};

const visitTypeStyles: Record<string, string> = {
  examination: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  followup: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  consultation: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  surgery: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
};

function visitRowId(row: Record<string, unknown>, fallback: number): number {
  const id = row?.id;
  return typeof id === "number" && Number.isFinite(id) ? id : fallback;
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

export type VisitsProps = {
  hubVisitDateFilter?: string;
  hidePageChrome?: boolean;
  patientHubReadOnly?: boolean;
  patientHubViewOnlyHint?: string;
};

export default function Visits(props: Partial<VisitsProps> & object = {}) {
  const hubVisitDateFilter = props?.hubVisitDateFilter;
  const hidePageChrome = props?.hidePageChrome;
  const patientHubReadOnly = Boolean(props?.patientHubReadOnly);
  const patientHubViewOnlyHint = props?.patientHubViewOnlyHint ?? "العرض فقط داخل المركز";
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, routeParamsVisits] = useRoute("/visits/:id");
  const [, routeParamsHub] = useRoute("/patient-hub/visits/:id");
  const [patientId, setPatientId] = useState<number>(0);
  const [expandedVisitId, setExpandedVisitId] = useState<number | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeVisitKind, setActiveVisitKind] = useState("all");
  const [editingExamType, setEditingExamType] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editAutorefraction, setEditAutorefraction] = useState<any>(null);
  const [editPentacam, setEditPentacam] = useState<any>(null);

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const allVisitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: 0 },
    { refetchOnWindowFocus: false }
  );

  const patientVisitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const updateVisitDateMutation = trpc.medical.updateVisitDate.useMutation();
  const updateExamDataMutation = trpc.medical.updateVisitExamData.useMutation();

  const patient = patientQuery.data as any;
  const visits = (patientId > 0 ? patientVisitsQuery.data ?? [] : allVisitsQuery.data ?? []) as any[];
  const isLoading = patientId > 0 ? patientVisitsQuery.isLoading : allVisitsQuery.isLoading;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const raw = (routeParamsVisits as { id?: string } | undefined)?.id ?? (routeParamsHub as { id?: string } | undefined)?.id;
    const routeId = Number(raw ?? 0);
    if (Number.isFinite(routeId) && routeId > 0) {
      setPatientId(routeId);
    }
  }, [routeParamsVisits, routeParamsHub]);

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

  const stats = useMemo(() => {
    const rows = visits as Record<string, unknown>[];
    let thisWeek = 0;
    let followups = 0;
    for (const v of rows) {
      const raw = v.visitDate ?? v.createdAt;
      const d = raw ? new Date(String(raw)) : null;
      if (d && !Number.isNaN(d.getTime()) && isInCurrentCalendarWeek(d)) thisWeek += 1;
      if (String(v.visitType ?? "") === "followup") followups += 1;
    }
    return { total: rows.length, thisWeek, followups };
  }, [visits]);

  const filteredVisits = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return visits.filter((visit, idx) => {
      const row = visit as Record<string, unknown>;
      const vt = String(row.visitType ?? "");
      if (activeVisitKind !== "all" && vt !== activeVisitKind) return false;
      if (hubVisitDateFilter?.trim()) {
        const vd = row.visitDate ?? row.createdAt;
        const key = vd ? new Date(String(vd)).toISOString().split("T")[0] : "";
        if (key !== hubVisitDateFilter) return false;
      }
      if (!needle) return true;
      const nameLine = patientId > 0 && patient?.fullName ? String(patient.fullName) : String(row.patientName ?? "");
      const hay = [
        formatDateTime(String(row.visitDate ?? row.createdAt ?? "")),
        String(row.chiefComplaint ?? ""),
        nameLine,
        `مريض ${String(row.patientId ?? "")}`,
        `id ${visitRowId(row, idx)}`,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [visits, search, activeVisitKind, patientId, patient, hubVisitDateFilter]);

  const handleStartEditDate = (visit: any) => {
    if (patientHubReadOnly) return;
    const dateObj = new Date(visit.visitDate);
    const dateStr = dateObj.toISOString().split("T")[0];
    setEditDate(dateStr);
  };

  const handleSaveDate = async (visit: any) => {
    if (patientHubReadOnly) return;
    if (!editDate) return;
    try {
      const result = await updateVisitDateMutation.mutateAsync({
        visitId: visit.id,
        visitDate: editDate
      });
      console.log("Date update result:", result);

      // Wait a moment then refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      if (patientId > 0) {
        await patientVisitsQuery.refetch();
      } else {
        await allVisitsQuery.refetch();
      }
      setEditingVisitId(null);
      setEditDate("");
    } catch (error) {
      console.error("Failed to update visit date:", error);
      alert("خطأ في حفظ التاريخ: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleStartEditExam = (examType: string, examData: any) => {
    if (patientHubReadOnly) return;
    setEditingExamType(examType);
    if (examType === "autorefraction") {
      setEditAutorefraction(JSON.parse(JSON.stringify(examData)));
    } else {
      setEditPentacam(JSON.parse(JSON.stringify(examData)));
    }
  };

  const handleSaveExam = async (visit: any, examType: string) => {
    if (patientHubReadOnly) return;
    try {
      const updates: any = {};
      if (examType === "autorefraction") {
        updates.autorefraction = editAutorefraction;
      } else {
        updates.pentacam = editPentacam;
      }

      await updateExamDataMutation.mutateAsync({
        visitId: visit.id,
        updates
      });
      if (patientId > 0) {
        await patientVisitsQuery.refetch();
      } else {
        await allVisitsQuery.refetch();
      }
      setEditingExamType(null);
    } catch (error) {
      console.error("Failed to update exam:", error);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className={cn("mx-auto w-full", hidePageChrome ? "max-w-none px-2 py-3" : "max-w-[1280px]")} dir="rtl">
      {!hidePageChrome ? (
        <>
          <PageHeader
            title="الزيارات"
            subtitle="سجل الزيارات والفحوصات المرتبطة"
            icon={<ClipboardList className="h-5 w-5" />}
          />

          <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-3 sm:gap-4")}>
            <StatCard
              title="إجمالي الزيارات"
              value={stats.total}
              icon={ClipboardList}
              description="كل السجلات المعروضة"
              iconColor="bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
            />
            <StatCard
              title="زيارات هذا الأسبوع"
              value={stats.thisWeek}
              icon={CalendarDays}
              description="ضمن الأسبوع الحالي"
              iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
            />
            <StatCard
              title="زيارات متابعة"
              value={stats.followups}
              icon={CalendarRange}
              description={`نوع: متابعة`}
              iconColor="bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
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
          <SearchBar value={search} onChange={setSearch} placeholder="بحث باسم المريض، التاريخ، الشكوى..." />
        </div>
        <FilterBar filters={visitKindTabs} selected={activeVisitKind} onSelect={setActiveVisitKind} />
      </div>

      <Card className="border-border shadow-sm">
        {patientId > 0 && patient ? (
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          </CardHeader>
        ) : null}

        <CardContent className="pt-6">
          <div className="space-y-3">
            {isLoading && <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div>}

            {!isLoading && visits.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">لا توجد زيارات مسجلة</div>
            )}

            {!isLoading && visits.length > 0 && filteredVisits.length === 0 && (
              <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">لا توجد زيارات مطابقة للبحث أو التصفية</div>
            )}

            {filteredVisits.map((visit, index) => {
                const vid = visitRowId(visit as Record<string, unknown>, index);
                const isExpanded = expandedVisitId === vid;
                const visitDate = visit.visitDate || visit.createdAt;
                const isEditingDate = editingVisitId === vid;
                const vType = String((visit as any).visitType ?? "");

                return (
                  <Card key={vid} className="border-border transition-shadow hover:shadow-md">
                      {/* Visit Header - Expandable */}
                      <CardHeader className="cursor-pointer hover:bg-muted/40">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedVisitId(isExpanded ? null : vid)}
                            className="flex flex-1 items-center gap-2 text-right"
                          >
                            {isEditingDate ? (
                              <div className="flex-1 flex items-center gap-2">
                                <Input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="max-w-xs"
                                  dir="ltr"
                                />
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveDate(visit);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVisitId(null);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                                  <span>
                                    {(visit as any).patientName || "مريض"} — {formatDateTime(visitDate)}
                                  </span>
                                  {vType && visitTypeLabels[vType] ? (
                                    <Badge variant="outline" className={cn("border-0 text-[10px] font-semibold", visitTypeStyles[vType])}>
                                      {visitTypeLabels[vType]}
                                    </Badge>
                                  ) : null}
                                  {visit.patientId ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const qs = typeof window !== "undefined" ? window.location.search : "";
                                        setLocation(
                                          patientHubReadOnly ? `/patient-hub/examination/${visit.patientId}${qs}` : `/patient-file/${visit.patientId}`,
                                        );
                                      }}
                                      title="فتح ملف المريض"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </CardTitle>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            {!patientHubReadOnly && !isEditingDate && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditDate(visit);
                                  setEditingVisitId(vid);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedVisitId(isExpanded ? null : vid)}
                              className="p-2"
                            >
                              <ChevronDown
                                className={`h-5 w-5 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Visit Details - Expandable Content */}
                      {isExpanded && (
                        <CardContent className="space-y-6 border-t border-border pt-4">
                          {/* Exam Data */}
                          {(visit.sphereOD || visit.sphereOS || visit.iopOD || visit.iopOS || visit.ucvaOD || visit.ucvaOS || visit.bcvaOD || visit.bcvaOS) && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">بيانات الفحص</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200">
                                      <th className="text-right px-2 py-2">القياس</th>
                                      <th className="text-center px-2 py-2">OD</th>
                                      <th className="text-center px-2 py-2">OS</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(visit.ucvaOD || visit.ucvaOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">UCVA</td>
                                        <td className="text-center px-2 py-2">{visit.ucvaOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.ucvaOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.bcvaOD || visit.bcvaOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">BCVA</td>
                                        <td className="text-center px-2 py-2">{visit.bcvaOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.bcvaOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.sphereOD || visit.sphereOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">Sphere</td>
                                        <td className="text-center px-2 py-2">{visit.sphereOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.sphereOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.cylinderOD || visit.cylinderOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">Cylinder</td>
                                        <td className="text-center px-2 py-2">{visit.cylinderOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.cylinderOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.axisOD || visit.axisOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">Axis</td>
                                        <td className="text-center px-2 py-2">{visit.axisOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.axisOS || "-"}</td>
                                      </tr>
                                    )}
                                    {(visit.iopOD || visit.iopOS) && (
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">IOP</td>
                                        <td className="text-center px-2 py-2">{visit.iopOD || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.iopOS || "-"}</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {/* Autorefraction Data */}
                          {visit.autorefraction && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-slate-900">الأوتوريفراكشن</h4>
                                {!patientHubReadOnly && editingExamType !== "autorefraction" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStartEditExam("autorefraction", visit.autorefraction)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              {editingExamType === "autorefraction" ? (
                                <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm">UCVA OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.ucva || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, ucva: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">UCVA OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.ucva || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, ucva: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">BCVA OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.bcva || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, bcva: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">BCVA OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.bcva || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, bcva: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">S OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.s || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, s: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">S OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.s || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, s: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">C OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.c || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, c: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">C OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.c || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, c: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">Axis OD</Label>
                                      <Input
                                        value={editAutorefraction?.od?.axis || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            od: { ...editAutorefraction.od, axis: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">Axis OS</Label>
                                      <Input
                                        value={editAutorefraction?.os?.axis || ""}
                                        onChange={(e) =>
                                          setEditAutorefraction({
                                            ...editAutorefraction,
                                            os: { ...editAutorefraction.os, axis: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveExam(visit, "autorefraction")}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      حفظ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingExamType(null)}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      إلغاء
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200">
                                        <th className="text-right px-2 py-2">المقياس</th>
                                        <th className="text-center px-2 py-2">OD</th>
                                        <th className="text-center px-2 py-2">OS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">UCVA</td>
                                        <td className="text-center px-2 py-2">{visit.autorefraction.od?.ucva || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.autorefraction.os?.ucva || "-"}</td>
                                      </tr>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">BCVA</td>
                                        <td className="text-center px-2 py-2">{visit.autorefraction.od?.bcva || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.autorefraction.os?.bcva || "-"}</td>
                                      </tr>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">S / C / A</td>
                                        <td className="text-center px-2 py-2">
                                          {visit.autorefraction.od?.s} / {visit.autorefraction.od?.c} / {visit.autorefraction.od?.axis}
                                        </td>
                                        <td className="text-center px-2 py-2">
                                          {visit.autorefraction.os?.s} / {visit.autorefraction.os?.c} / {visit.autorefraction.os?.axis}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Pentacam Data */}
                          {visit.pentacam && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-slate-900">البنتاكام</h4>
                                {!patientHubReadOnly && editingExamType !== "pentacam" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStartEditExam("pentacam", visit.pentacam)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              {editingExamType === "pentacam" ? (
                                <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm">K1 OD</Label>
                                      <Input
                                        value={editPentacam?.od?.k1 || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            od: { ...editPentacam.od, k1: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">K1 OS</Label>
                                      <Input
                                        value={editPentacam?.os?.k1 || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            os: { ...editPentacam.os, k1: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">K2 OD</Label>
                                      <Input
                                        value={editPentacam?.od?.k2 || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            od: { ...editPentacam.od, k2: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">K2 OS</Label>
                                      <Input
                                        value={editPentacam?.os?.k2 || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            os: { ...editPentacam.os, k2: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">Thinnest OD</Label>
                                      <Input
                                        value={editPentacam?.od?.thinnest || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            od: { ...editPentacam.od, thinnest: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">Thinnest OS</Label>
                                      <Input
                                        value={editPentacam?.os?.thinnest || ""}
                                        onChange={(e) =>
                                          setEditPentacam({
                                            ...editPentacam,
                                            os: { ...editPentacam.os, thinnest: e.target.value }
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveExam(visit, "pentacam")}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      حفظ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingExamType(null)}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      إلغاء
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200">
                                        <th className="text-right px-2 py-2">المقياس</th>
                                        <th className="text-center px-2 py-2">OD</th>
                                        <th className="text-center px-2 py-2">OS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">K1 / K2</td>
                                        <td className="text-center px-2 py-2">
                                          {visit.pentacam.od?.k1} / {visit.pentacam.od?.k2}
                                        </td>
                                        <td className="text-center px-2 py-2">
                                          {visit.pentacam.os?.k1} / {visit.pentacam.os?.k2}
                                        </td>
                                      </tr>
                                      <tr className="border-b border-slate-100">
                                        <td className="text-right px-2 py-2">Thinnest Point</td>
                                        <td className="text-center px-2 py-2">{visit.pentacam.od?.thinnest || "-"}</td>
                                        <td className="text-center px-2 py-2">{visit.pentacam.os?.thinnest || "-"}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Empty State */}
                          {!visit.autorefraction && !visit.pentacam && (
                            <div className="text-center text-slate-500 py-4">
                              لا توجد بيانات مسجلة لهذه الزيارة
                            </div>
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
