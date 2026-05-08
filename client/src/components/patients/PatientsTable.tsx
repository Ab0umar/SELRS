import React, { memo, useEffect, useState, useRef, Fragment } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, FileText, Printer, Edit, Trash2 } from "lucide-react";
import { normalizeServiceCode, normalizeSheetType } from "@/lib/patientsHelpers";
import { PatientTransactions } from "./PatientTransactions";
import { PatientRowActions } from "./PatientRowActions";
import { PatientMedicalStatusStrip, PatientMedicalStatusDots, type PatientMedicalStatus } from "./PatientMedicalStatusBadges";

interface PatientsTableProps {
  patients: any[];
  serviceType: string;
  serviceCodeToLabel: Map<string, string>;
  serviceCodeToType: Map<string, string>;
  onOpenRefraction: (patientId: number) => void;
  onPrintRefraction: (patientId: number) => void;
  onOpenFollowup: (serviceType: string, patientId: number) => void;
  onOpenSheet: (serviceType: string, patientId: number) => void;
  onPrintSheet: (serviceType: string, patientId: number) => void;
  onDeletePatient: (patientId: number) => void;
  onEditPatient: (patient: any) => void;
  onOpenDetails: (patientId: number) => void;
  user: any;
  canBulkManage: boolean;
  medicalStatuses?: Record<number, PatientMedicalStatus>;
  selectedRowKeys: Set<string>;
  onToggleSelect: (rowKey: string, checked: boolean) => void;
}

export const PatientsTable = memo(function PatientsTable({
  patients,
  serviceType,
  serviceCodeToLabel,
  serviceCodeToType,
  onOpenRefraction,
  onPrintRefraction,
  onOpenFollowup,
  onOpenSheet,
  onPrintSheet,
  onDeletePatient,
  onEditPatient,
  onOpenDetails,
  user,
  canBulkManage,
  selectedRowKeys,
  onToggleSelect,
  medicalStatuses,
}: PatientsTableProps) {
  const [isMobile, setIsMobile] = useState(false);
  const desktopTableRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [tableViewportHeight, setTableViewportHeight] = useState(640);
  const [expandedPatientIds, setExpandedPatientIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const element = desktopTableRef.current;
    if (!element) return;
    const apply = () => {
      setTableScrollTop(element.scrollTop);
      setTableViewportHeight(element.clientHeight || 640);
    };
    apply();
    element.addEventListener("scroll", apply, { passive: true });
    if (typeof window !== "undefined") {
      window.addEventListener("resize", apply);
    }
    return () => {
      element.removeEventListener("scroll", apply);
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", apply);
      }
    };
  }, [isMobile, patients.length]);

  const canEditPatients = user?.role === "admin" || user?.role === "manager" || user?.role === "reception";
  const isExpanded = (patientId: number) => expandedPatientIds.has(patientId);
  const toggleExpanded = (patientId: number) => {
    setExpandedPatientIds((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };
  const getPatientRowKey = (patient: any) =>
    String(
      (patient as any).__rowKey ??
        `${patient.id}-${normalizeServiceCode((patient as any).__serviceCodeSingle || (patient as any).serviceCode || "base")}`
    );

  if (patients.length === 0) {
    return (
      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardContent className="pt-6 text-center text-muted-foreground">
          لا توجد بيانات مرضى في هذا القسم
        </CardContent>
      </Card>
    );
  }

  const getServiceLabel = (value: string) => {
    const key = normalizeSheetType(value);
    if (key === "consultant") return "استشاري";
    if (key === "specialist") return "اخصائي";
    if (key === "pentacam_c") return "Pentacam C";
    if (key === "pentacam_ex") return "Pentacam Ex";
    if (key === "pentacam_ex_c") return "Pentacam Ex.C";
    if (key === "pentacam" || key === "pentacam_center" || key === "pentacam_external") return "بنتاكام";
    if (key === "lasik") return "فحوصات الليزك";
    if (key === "external") return "خارجي";
    if (key === "surgery") return "عمليات";
    return value || "-";
  };

  const getSheetTypeLabel = (value: string) => {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === "surgery_external") return "عمليات خارجي";
    const key = normalizeSheetType(value);
    if (key === "consultant") return "استشاري";
    if (key === "specialist") return "اخصائي";
    if (key === "pentacam_center" || key === "pentacam_c") return "Pentacam C";
    if (key === "pentacam_external" || key === "pentacam_ex") return "Pentacam Ex";
    if (key === "pentacam_ex_c") return "Pentacam Ex.C";
    if (key === "lasik") return "فحوصات الليزك";
    if (key === "external") return "خارجي";
    if (key === "surgery") return "عمليات";
    return value || "-";
  };

  const getServiceDisplay = (patient: any) => {
    const singleName = String((patient as any)?.__serviceNameSingle ?? "").trim();
    if (singleName) return singleName;
    const defaultName = String((patient as any)?.__defaultServiceName ?? "").trim();
    if (defaultName) return defaultName;
    const singleCode = normalizeServiceCode((patient as any)?.__serviceCodeSingle);
    if (singleCode) {
      const mapped = String(serviceCodeToLabel.get(singleCode) ?? "").trim();
      if (mapped) return mapped;
    }
    const codes = [
      ...((Array.isArray(patient?.serviceCodes) ? patient.serviceCodes : []) as unknown[]),
      patient?.serviceCode,
    ]
      .map((v) => normalizeServiceCode(v))
      .filter(Boolean);
    if (codes.length > 0) {
      const names = Array.from(
        new Set(
          codes
            .map((code) => String(serviceCodeToLabel.get(code) ?? "").trim())
            .filter(Boolean)
        )
      );
      if (names.length > 0) return names.join(" / ");
    }
    return getServiceLabel(String(patient?.serviceType ?? ""));
  };

  const getRowSheetType = (patient: any) => {
    const singleCode = normalizeServiceCode((patient as any)?.__serviceCodeSingle);
    if (singleCode) {
      const mapped = normalizeSheetType((patient as any)?.serviceSheetTypeByCode?.[singleCode]);
      if (mapped) return mapped;
      const defaultType = normalizeSheetType(serviceCodeToType.get(singleCode));
      if (defaultType) return defaultType;
    }
    const singleType = normalizeSheetType((patient as any)?.__serviceTypeSingle);
    if (singleType) return singleType;
    const fallback = normalizeSheetType(patient?.serviceType ?? serviceType);
    return fallback || serviceType;
  };

  const getRowSheetSource = (patient: any): "manual" | "default" | "fallback" => {
    const singleCode = normalizeServiceCode((patient as any)?.__serviceCodeSingle);
    if (singleCode) {
      const manual = normalizeSheetType((patient as any)?.serviceSheetTypeByCode?.[singleCode]);
      if (manual) return "manual";
      const byDefault = normalizeSheetType(serviceCodeToType.get(singleCode));
      if (byDefault) return "default";
    }
    return "fallback";
  };

  const getSheetSourceLabel = (source: "manual" | "default" | "fallback") => {
    if (source === "manual") return "يدوي";
    if (source === "default") return "افتراضي";
    return "عام";
  };

  const shouldVirtualizeDesktop = !isMobile && patients.length > 80;
  const desktopRowHeight = 48;
  const overscanRows = 8;
  const visibleDesktopRange = (() => {
    if (!shouldVirtualizeDesktop) {
      return {
        start: 0,
        end: patients.length,
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }
    const visibleCount = Math.max(1, Math.ceil(tableViewportHeight / desktopRowHeight));
    const start = Math.max(0, Math.floor(tableScrollTop / desktopRowHeight) - overscanRows);
    const end = Math.min(patients.length, start + visibleCount + overscanRows * 2);
    const topSpacer = start * desktopRowHeight;
    const bottomSpacer = Math.max(0, (patients.length - end) * desktopRowHeight);
    return { start, end, topSpacer, bottomSpacer };
  })();

  const desktopPatients = shouldVirtualizeDesktop
    ? patients.slice(visibleDesktopRange.start, visibleDesktopRange.end)
    : patients;
  const desktopColSpan = canBulkManage ? 10 : 9;

  const formatDisplayDate = (value: any) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  if (isMobile) {
    return (
      <div className="mt-1 space-y-2">
        {patients.map((patient) => {
          const serviceLabel = getServiceDisplay(patient);
          const displayCode = patient.patientCode
            ? /^\d+$/.test(String(patient.patientCode))
              ? String(patient.patientCode).padStart(4, "0")
              : String(patient.patientCode)
            : "";
          return (
            <Card
              key={String((patient as any).__rowKey ?? patient.id)}
              className="cursor-pointer overflow-hidden border-border/80 bg-card shadow-sm transition-colors hover:border-primary/25 hover:bg-accent/30"
              onClick={() => onOpenDetails(patient.id)}
            >
              <PatientMedicalStatusStrip status={medicalStatuses?.[patient.id]} />
              <CardContent className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2">
                  {canBulkManage ? (
                    <label
                      className="flex items-center gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedRowKeys.has(getPatientRowKey(patient))}
                        onCheckedChange={(checked) => onToggleSelect(getPatientRowKey(patient), Boolean(checked))}
                      />
                      <span className="text-xs text-muted-foreground">تحديد</span>
                    </label>
                  ) : (
                    <span />
                  )}
                  <span
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                  >
                    {serviceLabel}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2" dir="rtl">
                  <div className="text-sm font-bold break-words text-foreground">{patient.fullName}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 rounded-lg border-border bg-background p-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleExpanded(Number(patient.id));
                    }}
                  >
                    {isExpanded(Number(patient.id)) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs">
                  <div className="text-muted-foreground">الكود</div>
                  <div dir="ltr" className="text-right text-foreground">{displayCode || "-"}</div>
                  <div className="text-muted-foreground">الدكتور</div>
                  <div className="text-right text-foreground">{String((patient as any).treatingDoctor ?? "").trim() || "-"}</div>
                  <div className="text-muted-foreground">نوع الشيت</div>
                  <div className="text-right text-foreground">
                    <span>{getSheetTypeLabel(getRowSheetType(patient))}</span>
                    <span className="mr-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {getSheetSourceLabel(getRowSheetSource(patient))}
                    </span>
                  </div>
                  <div className="text-muted-foreground">تاريخ فتح الملف</div>
                  <div dir="ltr" className="text-right text-foreground">{patient.lastVisit ? formatDisplayDate(patient.lastVisit) : ""}</div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-xl border-primary/25 bg-primary/5 p-0 text-primary shadow-sm hover:border-primary/40 hover:bg-primary/10"
                    title="فتح الشيت"
                    aria-label="فتح الشيت"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenSheet(getRowSheetType(patient), patient.id);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  {canEditPatients && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 rounded-xl border-amber-200 bg-amber-50 p-0 text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-100"
                      title="تعديل المريض"
                      aria-label="تعديل المريض"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditPatient(patient);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-xl border-border bg-background p-0 shadow-sm"
                    title="طباعة الشيت"
                    aria-label="طباعة الشيت"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPrintSheet(getRowSheetType(patient), patient.id);
                    }}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  {user?.role === "admin" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 w-9 rounded-xl p-0 shadow-sm"
                      title="حذف المريض"
                      aria-label="حذف المريض"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeletePatient(patient.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isExpanded(Number(patient.id)) ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-2">
                    <PatientTransactions patientId={Number(patient.id)} serviceCodeToLabel={serviceCodeToLabel} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Card className="mt-1 overflow-hidden border-slate-200/80 bg-white/92 shadow-sm">
      <CardContent className="pt-6">
        <div
          ref={desktopTableRef}
          className="w-full overflow-auto patients-table-wrap"
          style={{ maxHeight: "70vh" }}
        >
          <table className="patients-table min-w-[840px] w-max table-auto text-center text-xs md:text-sm" dir="rtl">
            <colgroup>
              {canBulkManage ? <col className="w-[44px]" /> : null}
              <col className="w-[72px]" />
              <col className="w-[190px]" />
              <col className="w-[130px]" />
              <col className="w-[105px]" />
              <col className="w-[120px]" />
              <col className="w-[118px]" />
              <col className="w-[250px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50/95 shadow-[0_1px_0_rgba(148,163,184,0.25)] backdrop-blur">
              <tr className="border-b border-slate-200">
                {canBulkManage ? <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">تحديد</th> : null}
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الكود</th>
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الاسم</th>
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">تاريخ الميلاد</th>
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الدكتور</th>
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الخدمة</th>
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">نوع الشيت</th>
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">تاريخ فتح الملف</th>
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">البيانات</th>
                <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {shouldVirtualizeDesktop && visibleDesktopRange.topSpacer > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={desktopColSpan} style={{ height: `${visibleDesktopRange.topSpacer}px`, padding: 0 }} />
                </tr>
              ) : null}
              {desktopPatients.map((patient) => (
                <Fragment key={String((patient as any).__rowKey ?? patient.id)}>
                  <tr
                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-primary/5"
                    onClick={() => onOpenDetails(patient.id)}
                  >
                    {canBulkManage ? (
                      <td className="py-0 px-0.5 text-center" dir="ltr" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedRowKeys.has(getPatientRowKey(patient))}
                          onCheckedChange={(checked) => onToggleSelect(getPatientRowKey(patient), Boolean(checked))}
                        />
                      </td>
                    ) : null}
                    <td className="py-0 px-0.5 text-center" dir="ltr">
                      {patient.patientCode
                        ? (/^\d+$/.test(String(patient.patientCode))
                          ? String(patient.patientCode).padStart(4, "0")
                          : patient.patientCode)
                        : ""}
                    </td>
                    <td className="py-0 px-0.5 text-center break-words">
                      <div className="flex flex-col items-end gap-1" dir="rtl">
                        <div className="flex items-center justify-end gap-2">
                          <span>{patient.fullName}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExpanded(Number(patient.id));
                            }}
                          >
                            {isExpanded(Number(patient.id)) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                        {isExpanded(Number(patient.id)) ? (
                          <div className="w-full rounded border border-slate-200 bg-slate-50/60 p-2 text-right">
                            <PatientTransactions patientId={Number(patient.id)} serviceCodeToLabel={serviceCodeToLabel} />
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-0 px-0.5 text-center" dir="ltr">
                      {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "/") : "-"}
                    </td>
                    <td className="py-0 px-0.5 text-center break-words">
                      {String((patient as any).treatingDoctor ?? "").trim() || "-"}
                    </td>
                    <td className="py-0 px-0.5 text-center">-</td>
                    <td className="py-0 px-0.5 text-center">
                      <span>{getSheetTypeLabel(getRowSheetType(patient))}</span>
                      <span className="mr-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {getSheetSourceLabel(getRowSheetSource(patient))}
                      </span>
                    </td>
                    <td className="py-0 px-0.5 text-center" dir="ltr">
                      {patient.lastVisit ? formatDisplayDate(patient.lastVisit) : ""}
                    </td>
                    <td className="py-0 px-1 text-center">
                      <PatientMedicalStatusDots status={medicalStatuses?.[patient.id]} />
                    </td>
                    <td className="py-0 px-0.5">
                      <PatientRowActions
                        patientId={patient.id}
                        onOpenSheet={onOpenSheet}
                        onPrintSheet={onPrintSheet}
                        onDeletePatient={onDeletePatient}
                        onEditPatient={onEditPatient}
                        user={user}
                        canEditPatients={canEditPatients}
                        serviceType={serviceType}
                      />
                    </td>
                  </tr>
                </Fragment>
                ))}
                {shouldVirtualizeDesktop && visibleDesktopRange.bottomSpacer > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={desktopColSpan} style={{ height: `${visibleDesktopRange.bottomSpacer}px`, padding: 0 }} />
                  </tr>
                ) : null}
              </tbody>
            </table>
        </div>
      </CardContent>
    </Card>
  );
});
