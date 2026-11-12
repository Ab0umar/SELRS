import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { DateInput } from "@/components/ui/date-input";
import PatientPicker from "@/components/PatientPicker";
import { ReportQueryState } from "@/components/reports/ClinicalReportFrame";
import { ReportPatientField } from "@/components/reports/ReportPatientField";
import { ReportSection, ReportDocumentTitle, ReportLetterhead, ReportPatientGrid, ReportPatientItem, ReportStationeryFooter } from "@/components/reports/ReportStationery";
import {
  displaySheetDate,
  formatSheetDate,
  getPatientSheetDateOfBirth,
} from "@/lib/sheetDates";
import { ReportHeader } from "@/components/reports/ReportHeader";

function formatFundusFinding(value: unknown) {
  if (!value) return "—";
  let finding = value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      finding = JSON.parse(value) as Record<string, unknown>;
    } catch {
      return value;
    }
  }
  return [
    finding.discStatus && `Disc: ${finding.discStatus}`,
    finding.cupDiscRatio && `C/D: ${finding.cupDiscRatio}`,
    finding.macuaStatus && `Macula: ${finding.macuaStatus}`,
    finding.vesselStatus && `Vessels: ${finding.vesselStatus}`,
    finding.otherFindings && `Other: ${finding.otherFindings}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export type ClinicalReportProps = {
  params?: { id?: string };
  patientId?: number;
  onSelectPatient?: (id: number | undefined) => void;
  hideHeaderSearch?: boolean;
  hidePrintButton?: boolean;
};

export default function ClinicalReport({
  params: routeParams,
  patientId: propPatientId,
  onSelectPatient,
  hideHeaderSearch = false,
  hidePrintButton = false,
}: ClinicalReportProps = {}) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/clinical-report/:id");
  const [, hubParams] = useRoute("/patient-hub/clinical-report/:id");
  const [, plainParams] = useRoute("/clinical-report/:id");
  const routePatientId =
    Number(params?.id ?? hubParams?.id ?? plainParams?.id ?? routeParams?.id ?? 0) || undefined;
  const queryParamId =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("patientId")) ||
        Number(new URLSearchParams(window.location.search).get("id")) ||
        undefined
      : undefined;

  const [activePatientId, setActivePatientId] = useState<number | undefined>(
    propPatientId ?? routePatientId ?? queryParamId,
  );

  useEffect(() => {
    if (hideHeaderSearch || onSelectPatient) {
      setActivePatientId(propPatientId);
    } else if (propPatientId !== undefined) {
      setActivePatientId(propPatientId);
    }
  }, [propPatientId, hideHeaderSearch, onSelectPatient]);

  const requestedVisitDate =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("visitDate") || ""
      : "";

  const patientQuery = trpc.patient.getPatient.useQuery(
    activePatientId ?? null,
    { enabled: Boolean(activePatientId), refetchOnWindowFocus: false },
  );
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: activePatientId ?? 0 },
    { enabled: Boolean(activePatientId), refetchOnWindowFocus: false },
  );
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: activePatientId ?? 0 },
    { enabled: Boolean(activePatientId), refetchOnWindowFocus: false },
  );
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    activePatientId ?? null,
    { enabled: Boolean(activePatientId), refetchOnWindowFocus: false },
  );
  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: activePatientId ?? 0 },
    { enabled: Boolean(activePatientId), refetchOnWindowFocus: false },
  );
  const autorefractometryQuery =
    trpc.medical.getAutorefractometryByPatient.useQuery(
      { patientId: activePatientId ?? 0 },
      { enabled: Boolean(activePatientId), refetchOnWindowFocus: false },
    );
  const medicalHistoryQuery = trpc.medical.getMedicalHistoryByPatient.useQuery(
    { patientId: activePatientId ?? 0 },
    { enabled: Boolean(activePatientId), refetchOnWindowFocus: false },
  );

  const reportQueries = [
    patientQuery,
    examinationsQuery,
    reportsQuery,
    visitsQuery,
    glassesRecordsQuery,
    autorefractometryQuery,
    medicalHistoryQuery,
  ];
  const reportLoading =
    Boolean(activePatientId) && reportQueries.some((query) => query.isLoading);
  const reportError =
    Boolean(activePatientId) && reportQueries.some((query) => query.isError);
  const retryReportQueries = () => {
    void Promise.all(reportQueries.map((query) => query.refetch()));
  };

  const patient = patientQuery.data as any;
  const latestExam = (examinationsQuery.data as any[] | undefined)?.[0];
  const visits = (visitsQuery.data as any[] | undefined) ?? [];

  const [selectedVisitId, setSelectedVisitId] = useState<number | undefined>();
  const [diagnosis, setDiagnosis] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [existingReportId, setExistingReportId] = useState<
    number | undefined
  >();
  const [patientName, setPatientName] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const selectedExam =
    ((examinationsQuery.data as any[] | undefined) ?? []).find(
      (exam) => Number(exam.visitId) === selectedVisitId,
    ) ?? latestExam;
  const selectedAutoref = (
    (autorefractometryQuery.data as any[] | undefined) ?? []
  ).find((record) => Number(record.examinationId) === Number(selectedExam?.id));
  const selectedGlassesRecord = (
    (glassesRecordsQuery.data as any[] | undefined) ?? []
  ).find((record) => Number(record.examinationId) === Number(selectedExam?.id));
  const selectedGlasses = {
    od: {
      s: selectedGlassesRecord?.sOD,
      c: selectedGlassesRecord?.cOD,
      axis: selectedGlassesRecord?.axisOD,
      pd: selectedGlassesRecord?.pdOD,
      add: selectedGlassesRecord?.addOD,
      bcva: selectedGlassesRecord?.bcvaOD,
    },
    os: {
      s: selectedGlassesRecord?.sOS,
      c: selectedGlassesRecord?.cOS,
      axis: selectedGlassesRecord?.axisOS,
      pd: selectedGlassesRecord?.pdOS,
      add: selectedGlassesRecord?.addOS,
      bcva: selectedGlassesRecord?.bcvaOS,
    },
  };
  const medicalHistory = ((medicalHistoryQuery.data as any[] | undefined) ??
    [])[0];
  const allergiesText =
    [
      medicalHistory?.allergies && "الحساسية",
      medicalHistory?.medications &&
        `أدوية حالية: ${medicalHistory.medications}`,
    ]
      .filter(Boolean)
      .join("، ") ||
    patient?.allergies ||
    "لا يوجد";
  const chronicConditionsText =
    [
      medicalHistory?.diabetes && "السكري",
      medicalHistory?.hypertension && "ضغط الدم",
      medicalHistory?.heartDisease && "أمراض القلب",
      medicalHistory?.asthma && "الربو",
      medicalHistory?.thyroid && "الغدة الدرقية",
      medicalHistory?.autoimmune && "أمراض مناعية",
      medicalHistory?.glaucoma && "جلوكوما (ماء زرقاء)",
      medicalHistory?.familyKeratoconus && "قرنية مخروطية بالعائلة",
      medicalHistory?.previousSurgeries &&
        `عمليات سابقة: ${medicalHistory.previousSurgeries}`,
      medicalHistory?.familyHistory &&
        `تاريخ عائلي: ${medicalHistory.familyHistory}`,
    ]
      .filter(Boolean)
      .join("، ") ||
    patient?.medicalHistory ||
    "لا يوجد";

  useEffect(() => {
    if (!activePatientId) {
      setPatientName("");
      setPatientCode("");
      setPatientDob("");
      setPatientGender("");
      setSelectedVisitId(undefined);
      setDiagnosis("");
      setRecommendations("");
      setFollowUpDate("");
      setExistingReportId(undefined);
      return;
    }
    if (!patient) return;
    setPatientName(patient.fullName || "");
    setPatientCode(patient.patientCode || "");
    setPatientDob(getPatientSheetDateOfBirth(patient));
    setPatientGender(patient.gender || "");
  }, [activePatientId, patient]);

  useEffect(() => {
    if (!selectedVisitId && visits.length > 0) {
      const matchingVisit = requestedVisitDate
        ? visits.find(
            (visit) =>
              String(visit.visitDate ?? "").split("T")[0] ===
              requestedVisitDate,
          )
        : undefined;
      setSelectedVisitId(Number((matchingVisit ?? visits[0]).id));
    }
  }, [visits, selectedVisitId, requestedVisitDate]);

  const reports = (reportsQuery.data as any[] | undefined) ?? [];
  useEffect(() => {
    if (!selectedVisitId) return;
    const forVisit = reports.find((r) => Number(r.visitId) === selectedVisitId);
    setExistingReportId(forVisit?.id ? Number(forVisit.id) : undefined);
    setDiagnosis(forVisit?.diagnosis ?? "");
    setRecommendations(forVisit?.recommendations ?? "");
    setFollowUpDate(
      forVisit?.followUpDate ? String(forVisit.followUpDate).split("T")[0] : "",
    );
    if (forVisit?.patientNameOverride)
      setPatientName(forVisit.patientNameOverride);
    if (forVisit?.patientCodeOverride)
      setPatientCode(forVisit.patientCodeOverride);
    if (forVisit?.patientDobOverride)
      setPatientDob(formatSheetDate(forVisit.patientDobOverride));
    if (forVisit?.patientGenderOverride)
      setPatientGender(forVisit.patientGenderOverride);
  }, [selectedVisitId, reports]);

  const createReportMutation = trpc.medical.createDoctorReport.useMutation();
  const updateReportMutation = trpc.medical.updateDoctorReport.useMutation();

  const handleSave = async () => {
    if (!activePatientId || !selectedVisitId) {
      toast.error("اختر زيارة أولاً");
      return;
    }
    try {
      if (existingReportId) {
        await updateReportMutation.mutateAsync({
          reportId: existingReportId,
          diagnosis,
          recommendations,
          followUpDate: followUpDate || undefined,
          patientNameOverride: patientName || undefined,
          patientCodeOverride: patientCode || undefined,
          patientDobOverride: patientDob || undefined,
          patientGenderOverride: patientGender || undefined,
        });
      } else {
        await createReportMutation.mutateAsync({
          visitId: selectedVisitId,
          patientId: activePatientId,
          diagnosis,
          recommendations,
          followUpDate: followUpDate || undefined,
          patientNameOverride: patientName || undefined,
          patientCodeOverride: patientCode || undefined,
          patientDobOverride: patientDob || undefined,
          patientGenderOverride: patientGender || undefined,
        });
      }
      toast.success("تم حفظ التقرير");
      await reportsQuery.refetch();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  const handlePrint = () => window.print();

  if (!isAuthenticated) return null;

  return (
    <div
      className="clinical-report-root medical-report-brand min-h-screen bg-background text-foreground print:min-h-0"
      dir="ltr"
    >
      <style>{`
        @media print {
          /* Sheet layout + 50mm letterhead: ClinicalReportFrame + medical-report-brand.css */
          body { background: white !important; }
          .clinical-report-root, html, body {
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .clinical-print-shell {
            padding: 0 !important;
            display: block !important;
          }
          main.clinical-report-frame {
            padding: 0 !important;
          }

          /* Tighten vertical rhythm so sheet fits one A4 under 5cm letterhead */
          @page {
            size: A4 portrait;
            margin: 0;
          }
          main.clinical-report-frame .report-sheet-body {
            padding: var(--report-top-clearance, 8mm) 15mm 8mm 15mm !important;
            font-size: 12px !important;
            line-height: 1.25 !important;
          }
          main.clinical-report-frame .report-sheet-body > header {
            margin-bottom: 3mm !important;
            padding-bottom: 2mm !important;
          }
          main.clinical-report-frame .report-sheet-body h1 {
            font-size: 15px !important;
            line-height: 1.15 !important;
          }
          main.clinical-report-frame .report-sheet-body section {
            margin-bottom: 2mm !important;
          }
          main.clinical-report-frame .report-sheet-body .mb-6 {
            margin-bottom: 3mm !important;
          }
          main.clinical-report-frame .report-sheet-body .mb-4 {
            margin-bottom: 2mm !important;
          }
          main.clinical-report-frame .report-sheet-body .mb-3,
          main.clinical-report-frame .report-sheet-body .mb-2 {
            margin-bottom: 1.5mm !important;
          }
          main.clinical-report-frame .report-sheet-body .gap-4,
          main.clinical-report-frame .report-sheet-body .gap-x-4,
          main.clinical-report-frame .report-sheet-body .gap-y-6 {
            gap: 2mm !important;
          }
          main.clinical-report-frame .report-sheet-body .gap-3,
          main.clinical-report-frame .report-sheet-body .gap-x-3,
          main.clinical-report-frame .report-sheet-body .gap-y-2 {
            gap: 1.5mm !important;
          }
          main.clinical-report-frame .report-sheet-body .p-4,
          main.clinical-report-frame .report-sheet-body .p-3,
          main.clinical-report-frame .report-sheet-body .px-3,
          main.clinical-report-frame .report-sheet-body .py-2 {
            padding: 1.5mm !important;
          }
          main.clinical-report-frame .report-sheet-body table th,
          main.clinical-report-frame .report-sheet-body table td,
          main.clinical-report-frame .report-sheet-body .clinical-report-content table th,
          main.clinical-report-frame .report-sheet-body .clinical-report-content table td {
            padding: 2px 4px !important;
            font-size: 12px !important;
            line-height: 1.25 !important;
          }
          main.clinical-report-frame .report-sheet-body p,
          main.clinical-report-frame .report-sheet-body label,
          main.clinical-report-frame .report-sheet-body input,
          main.clinical-report-frame .report-sheet-body textarea,
          main.clinical-report-frame .report-sheet-body select {
            font-size: 12px !important;
            line-height: 1.25 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }

        }
        .clinical-ltr { direction: ltr; text-align: left; }
        .clinical-refraction-table th,
        .clinical-refraction-table td {
          border: 1px solid #c3c6d6;
          text-align: center;
          vertical-align: middle;
        }
      `}</style>

      <ReportHeader className="sticky top-0 z-50 flex items-center justify-between border-b border-border/60 bg-card px-6 py-2 print:hidden">
        {!hideHeaderSearch ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => goBack()}
            type="button"
          >
            رجوع
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {!hideHeaderSearch && (
            <div className="w-72" dir="rtl">
              <PatientPicker
                initialPatientId={activePatientId}
                onSelect={(selected) => {
                  const newId = selected?.id ? Number(selected.id) : undefined;
                  setActivePatientId(newId);
                  onSelectPatient?.(newId);
                }}
              />
            </div>
          )}
          {visits.length > 0 ? (
            <select
              className="rounded border border-border/60 bg-card px-2 py-1.5 text-xs"
              value={selectedVisitId ?? ""}
              onChange={(e) => setSelectedVisitId(Number(e.target.value))}
            >
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {displaySheetDate(String(v.visitDate).split("T")[0])} —{" "}
                  {v.visitType}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="border-primary text-primary font-bold"
            onClick={handleSave}
            disabled={
              createReportMutation.isPending || updateReportMutation.isPending
            }
            type="button"
          >
            <Save className="h-4 w-4 ml-1" />
            {createReportMutation.isPending || updateReportMutation.isPending
              ? "جارٍ الحفظ…"
              : "حفظ"}
          </Button>
          {!hidePrintButton && (
            <Button
              size="sm"
              className="rounded bg-primary px-4 py-2 font-bold text-primary-foreground hover:opacity-90"
              onClick={handlePrint}
              type="button"
            >
              <Printer className="h-4 w-4 ml-1" /> طباعة / حفظ PDF
            </Button>
          )}
        </div>
      </ReportHeader>

      <div className="clinical-print-shell flex justify-center p-4 sm:p-8">
      <main className="clinical-report-frame medical-report-page mx-auto max-w-[210mm] bg-background p-4 text-foreground sm:p-8">
        <div className="report-sheet-body rounded-xl border border-border/60 bg-card p-4 sm:p-8 print:rounded-none print:border-0 print:shadow-none">
          <ReportLetterhead />
          <ReportDocumentTitle arabic="التقرير الشامل" english="Comprehensive clinical report" />

          {activePatientId && (reportError || reportLoading) ? (
            <ReportQueryState
              loading={reportLoading}
              error={reportError}
              onRetry={retryReportQueries}
            />
          ) : (
            <>
              <section className="report-patient-layout" dir="rtl">
                <ReportPatientGrid>
                  <ReportPatientItem label="اسم المريض:" className="report-patient-name">
                    <input
                      aria-label="اسم المريض:"
                      className="min-w-0 w-full text-right text-sm font-bold bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary outline-none print:border-0"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </ReportPatientItem>
                  <ReportPatientItem label="رقم الملف:">
                    <input
                      aria-label="رقم الملف:"
                      className="min-w-0 w-full text-right text-sm font-bold bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary outline-none print:border-0"
                      value={patientCode}
                      onChange={(e) => setPatientCode(e.target.value)}
                    />
                  </ReportPatientItem>
                  <ReportPatientItem label="تاريخ التقرير:">
                    {displaySheetDate(requestedVisitDate || String(visits.find((visit) => Number(visit.id) === selectedVisitId)?.visitDate ?? new Date().toISOString()).split("T")[0])}
                  </ReportPatientItem>
                  <ReportPatientItem label="السن:">
                    <ReportPatientField label="السن" value={patient?.age} />
                  </ReportPatientItem>
                  <ReportPatientItem label="تاريخ الميلاد:">
                    <ReportPatientField label="تاريخ الميلاد" type="date" value={patientDob} onChange={setPatientDob} />
                  </ReportPatientItem>
                  <ReportPatientItem label="موبايل:">
                    <ReportPatientField label="موبايل" type="tel" value={patient?.phone} />
                  </ReportPatientItem>
                  <ReportPatientItem label="الوظيفة:">
                    <ReportPatientField label="الوظيفة" value={patient?.occupation} />
                  </ReportPatientItem>
                </ReportPatientGrid>
              </section>
              <section className="report-clinical-context" dir="ltr">
                <div><strong>Allergies</strong><span>{allergiesText}</span></div>
                <div><strong>Chronic Conditions</strong><span>{chronicConditionsText}</span></div>
              </section>

              <ReportSection title="حدة الإبصار وضغط العين">
                <table dir="ltr" className="w-full table-fixed text-center text-[12px]">
                  <thead><tr><th scope="col">Eye</th><th scope="col">UCVA</th><th scope="col">BCVA</th><th scope="col">IOP</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">OD (R)</th><td>{selectedAutoref?.ucvaOD || "—"}</td><td>{selectedGlasses.od.bcva || selectedAutoref?.bcvaOD || "—"}</td><td>{selectedAutoref?.iopOD || "—"}</td></tr>
                    <tr><th scope="row">OS (L)</th><td>{selectedAutoref?.ucvaOS || "—"}</td><td>{selectedGlasses.os.bcva || selectedAutoref?.bcvaOS || "—"}</td><td>{selectedAutoref?.iopOS || "—"}</td></tr>
                  </tbody>
                </table>
              </ReportSection>
              <ReportSection title="قياس الانكسار · Refraction">
                <div className="border border-border/60 rounded overflow-hidden clinical-ltr">
                  <table className="clinical-refraction-table w-full table-fixed border-collapse text-center text-[12px]">
                    <thead>
                      <tr className="bg-muted border-b border-border/60">
                        <th className="w-[18%] px-3 py-2">Refraction</th>
                        <th colSpan={3} className="px-3 py-2 text-center">
                          OD
                        </th>
                        <th colSpan={3} className="px-3 py-2 text-center">
                          OS
                        </th>
                        <th className="w-[12%] px-3 py-2" />
                      </tr>
                      <tr className="bg-muted border-b border-border/60">
                        <th className="px-3 py-2">Distance</th>
                        <th className="px-3 py-2">S</th>
                        <th className="px-3 py-2">C</th>
                        <th className="px-3 py-2">A</th>
                        <th className="px-3 py-2">S</th>
                        <th className="px-3 py-2">C</th>
                        <th className="px-3 py-2">A</th>
                        <th className="px-3 py-2">IPD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr className="bg-primary/5">
                        <td className="px-3 py-2">&nbsp;</td>
                        <td className="px-3 py-2 font-mono">
                          {selectedGlasses.od.s || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {selectedGlasses.od.c || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {selectedGlasses.od.axis || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {selectedGlasses.os.s || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {selectedGlasses.os.c || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {selectedGlasses.os.axis || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {selectedGlasses.od.pd || selectedGlasses.os.pd
                            ? [selectedGlasses.od.pd, selectedGlasses.os.pd]
                                .filter(Boolean)
                                .join(" / ")
                            : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-3 font-bold text-primary">
                          Reading
                        </td>
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <span className="whitespace-nowrap font-bold">
                              Add +
                            </span>
                            <span className="min-w-24 text-center font-bold">
                              {[selectedGlasses.od.add, selectedGlasses.os.add]
                                .filter(Boolean)
                                .join(" / ") || " "}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </ReportSection>
              <div dir="rtl" className="grid grid-cols-2 gap-5">
                <ReportSection title="الجزء الأمامي">
                  <p><bdi>OD:</bdi> {selectedExam?.anteriorSegmentOD || "—"}</p>
                  <p><bdi>OS:</bdi> {selectedExam?.anteriorSegmentOS || "—"}</p>
                </ReportSection>
                <ReportSection title="قاع العين">
                  <p><bdi>OD:</bdi> {formatFundusFinding(selectedExam?.posteriorSegmentOD)}</p>
                  <p><bdi>OS:</bdi> {formatFundusFinding(selectedExam?.posteriorSegmentOS)}</p>
                </ReportSection>
              </div>
              <ReportSection title="التشخيص النهائي">
                <Textarea aria-label="التشخيص النهائي" className="text-sm print:hidden" rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                <p className="hidden whitespace-pre-wrap print:block">{diagnosis || "—"}</p>
              </ReportSection>
              <ReportSection title="العلاج والتوصيات">
                <Textarea aria-label="العلاج والتوصيات" className="text-sm print:hidden" rows={3} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
                <p className="hidden whitespace-pre-wrap print:block">{recommendations || "—"}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-semibold">موعد المتابعة:</span>
                  <DateInput className="w-44 print:hidden" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                  <span className="hidden print:inline">{followUpDate ? displaySheetDate(followUpDate) : "—"}</span>
                </div>
              </ReportSection>
              {/* Footer */}
              <footer className="mt-8 border-t border-border/60 pt-4 flex justify-between items-end">
                <div className="report-stamp-space">ختم المركز</div>
                <div className="text-center w-48">
                  <div className="mb-1 h-10 border-b border-border" />
                  <p className="text-[8px] text-muted-foreground uppercase">
                    توقيع الطبيب المعالج
                  </p>
                </div>
              </footer>
            </>
          )}
          <ReportStationeryFooter />
        </div>
      </main>
      </div>
    </div>
  );
}
