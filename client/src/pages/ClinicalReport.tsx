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
import {
  displaySheetDate,
  formatSheetDate,
  getPatientSheetDateOfBirth,
} from "@/lib/sheetDates";

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

export default function ClinicalReport() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/clinical-report/:id");
  const [, hubParams] = useRoute("/patient-hub/clinical-report/:id");
  const [, plainParams] = useRoute("/clinical-report/:id");
  const initialPatientId =
    Number(params?.id ?? hubParams?.id ?? plainParams?.id ?? 0) || undefined;

  const patientQuery = trpc.patient.getPatient.useQuery(
    initialPatientId ?? null,
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    initialPatientId ?? null,
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const autorefractometryQuery =
    trpc.medical.getAutorefractometryByPatient.useQuery(
      { patientId: initialPatientId ?? 0 },
      { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
    );
  const medicalHistoryQuery = trpc.medical.getMedicalHistoryByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );

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
    if (!patient) return;
    setPatientName(patient.fullName || "");
    setPatientCode(patient.patientCode || "");
    setPatientDob(getPatientSheetDateOfBirth(patient));
    setPatientGender(patient.gender || "");
  }, [patient]);

  useEffect(() => {
    if (!selectedVisitId && visits.length > 0) {
      setSelectedVisitId(Number(visits[0].id));
    }
  }, [visits, selectedVisitId]);

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
    if (!initialPatientId || !selectedVisitId) {
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
          patientId: initialPatientId,
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
      className="clinical-report-root medical-report-brand bg-[#f1f2f4] min-h-screen print:min-h-0"
      dir="ltr"
    >
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; }
          .clinical-report-root, html, body { min-height: 0 !important; height: auto !important; }
          .clinical-report-root > main {
            box-sizing: border-box;
            display: block;
            width: 210mm;
            margin: 0 auto;
            padding: 40mm 10mm 10mm !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .clinical-report-root > main > div {
            position: static;
            width: 190mm;
            margin: 0 auto;
            transform: none;
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

      <header className="sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-white border-b border-[#c3c6d6]">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => goBack()}
          type="button"
        >
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-72" dir="rtl">
            <PatientPicker
              initialPatientId={initialPatientId}
              onSelect={(selected) => {
                if (selected?.id) {
                  setLocation(`/clinical-report/${selected.id}`);
                }
              }}
            />
          </div>
          {visits.length > 0 ? (
            <select
              className="text-xs border border-[#c3c6d6] rounded px-2 py-1.5 bg-white"
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
            className="border-[#003d9b] text-[#003d9b] font-bold"
            onClick={handleSave}
            disabled={
              createReportMutation.isPending || updateReportMutation.isPending
            }
            type="button"
          >
            <Save className="h-4 w-4 ml-1" />
            {createReportMutation.isPending || updateReportMutation.isPending
              ? "جارٍ الحفظ..."
              : "حفظ"}
          </Button>
          <Button
            size="sm"
            className="bg-[#003d9b] text-white font-bold px-4 py-2 rounded hover:opacity-90"
            onClick={handlePrint}
            type="button"
          >
            <Printer className="h-4 w-4 ml-1" /> طباعة / تصدير PDF
          </Button>
        </div>
      </header>

      <main className="medical-report-page max-w-[210mm] mx-auto p-8 print:p-[10mm]">
        <div className="bg-white rounded-xl p-8 print:p-0 print:rounded-none border border-[#c3c6d6] print:border-0 shadow-sm print:shadow-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-[#003d9b]">
            <div />
            <div className="text-left clinical-ltr">
              <h1 className="text-xl font-extrabold text-[#191c1e] uppercase tracking-tight">
                Clinical Report | تقرير طبي
              </h1>
              <p className="text-xs text-[#434654]">
                Generated:{" "}
                {displaySheetDate(new Date().toISOString().split("T")[0])}
              </p>
            </div>
          </div>

          {!initialPatientId ? (
            <div className="p-8 text-center text-[#434654]">
              اختر مريضاً لعرض التقرير
            </div>
          ) : (
            <>
              {/* Patient Info + Allergies/Chronic */}
              <section className="grid grid-cols-12 gap-4 mb-6" dir="rtl">
                <div
                  className="col-span-8 grid grid-cols-12 auto-rows-min content-center gap-x-4 gap-y-6 p-4 bg-[#f3f4f6] rounded-lg border border-[#c3c6d6] text-center"
                  dir="rtl"
                >
                  <div className="col-span-6 min-w-0">
                    <p className="mb-1 text-[10px] text-[#434654] uppercase font-bold">
                      اسم المريض:
                    </p>
                    <input
                      className="min-w-0 w-full text-center text-sm font-bold bg-transparent border-b border-transparent hover:border-[#c3c6d6] focus:border-[#003d9b] outline-none print:border-0"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="mb-1 text-[10px] text-[#434654] uppercase font-bold">
                      الكود:
                    </p>
                    <input
                      className="min-w-0 w-full text-center text-sm font-bold bg-transparent border-b border-transparent hover:border-[#c3c6d6] focus:border-[#003d9b] outline-none print:border-0"
                      value={patientCode}
                      onChange={(e) => setPatientCode(e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="mb-1 text-[10px] text-[#434654] uppercase font-bold">
                      السن:
                    </p>
                    <p className="w-full text-center text-sm font-bold">
                      {patient?.age ?? "—"}
                    </p>
                  </div>
                  <div className="col-span-5 min-w-0">
                    <p className="mb-1 whitespace-nowrap text-[10px] text-[#434654] uppercase font-bold">
                      تاريخ الميلاد:
                    </p>
                    <p
                      className="w-full whitespace-nowrap text-center text-sm font-bold"
                      dir="ltr"
                    >
                      {patientDob ? displaySheetDate(patientDob) : "—"}
                    </p>
                  </div>
                  <div className="col-span-4 min-w-0">
                    <p className="mb-1 text-[10px] text-[#434654] uppercase font-bold">
                      موبايل:
                    </p>
                    <p
                      className="shrink-0 whitespace-nowrap text-sm font-bold"
                      dir="ltr"
                    >
                      {patient?.phone || "—"}
                    </p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="mb-1 text-[10px] text-[#434654] uppercase font-bold">
                      الوظيفة:
                    </p>
                    <p className="min-w-0 truncate text-sm font-bold">
                      {patient?.occupation || "—"}
                    </p>
                  </div>
                </div>
                <div
                  className="col-span-4 flex flex-col gap-2 text-left"
                  dir="ltr"
                >
                  <div className="bg-[#ffdad6]/50 p-3 rounded-lg border border-[#ba1a1a]/20 flex-1">
                    <div className="flex items-center gap-1 text-[#ba1a1a] text-[10px] font-bold uppercase mb-1">
                      Allergies
                    </div>
                    <p className="text-xs font-bold text-[#93000a]">
                      {allergiesText}
                    </p>
                  </div>
                  <div className="bg-[#006476]/10 p-3 rounded-lg border border-[#006476]/20 flex-1">
                    <div className="flex items-center gap-1 text-[#006476] text-[10px] font-bold uppercase mb-1">
                      Chronic Conditions
                    </div>
                    <p className="text-xs font-bold text-[#004b58]">
                      {chronicConditionsText}
                    </p>
                  </div>
                </div>
              </section>

              {/* Refraction */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-center gap-5 border-b border-[#e1e2e4] pb-1 text-center text-[11px] font-bold uppercase tracking-wide">
                  <span>
                    UCVA {selectedAutoref?.ucvaOD || "........."} /{" "}
                    {selectedAutoref?.ucvaOS || "........."}
                  </span>
                  <span>
                    BCVA{" "}
                    {selectedGlasses.od.bcva ||
                      selectedAutoref?.bcvaOD ||
                      "........."}{" "}
                    /{" "}
                    {selectedGlasses.os.bcva ||
                      selectedAutoref?.bcvaOS ||
                      "........."}
                  </span>
                  <span>
                    IOP {selectedAutoref?.iopOD || "........."} /{" "}
                    {selectedAutoref?.iopOS || "........."}
                  </span>
                </div>
                <div className="border border-[#c3c6d6] rounded overflow-hidden clinical-ltr">
                  <table className="clinical-refraction-table w-full table-fixed border-collapse text-center text-[11px]">
                    <thead>
                      <tr className="bg-[#e7e8ea] border-b border-[#c3c6d6]">
                        <th className="w-[18%] px-3 py-2">Refraction</th>
                        <th colSpan={3} className="px-3 py-2 text-center">
                          OD
                        </th>
                        <th colSpan={3} className="px-3 py-2 text-center">
                          OS
                        </th>
                        <th className="w-[12%] px-3 py-2" />
                      </tr>
                      <tr className="bg-[#e7e8ea] border-b border-[#c3c6d6]">
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
                    <tbody className="divide-y divide-[#c3c6d6]/30">
                      <tr className="bg-[#003d9b]/[0.04]">
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
                        <td className="px-3 py-3 font-bold text-[#003d9b]">
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
              </div>

              {/* Anterior + Posterior Segment */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 border border-[#c3c6d6] rounded-lg">
                  <h3 className="text-[11px] font-bold text-[#003d9b] uppercase mb-2">
                    Anterior Segment
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-[9px] text-[#434654] font-bold uppercase">
                        OD
                      </p>
                      <p>{selectedExam?.anteriorSegmentOD || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#434654] font-bold uppercase">
                        OS
                      </p>
                      <p>{selectedExam?.anteriorSegmentOS || "—"}</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border border-[#c3c6d6] rounded-lg">
                  <h3 className="text-[11px] font-bold text-[#003d9b] uppercase mb-2">
                    Fundus Exam
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-[9px] text-[#434654] font-bold uppercase">
                        OD
                      </p>
                      <p>
                        {formatFundusFinding(selectedExam?.posteriorSegmentOD)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#434654] font-bold uppercase">
                        OS
                      </p>
                      <p>
                        {formatFundusFinding(selectedExam?.posteriorSegmentOS)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnosis + Recommendations */}
              <div className="p-4 border-2 border-[#c3c6d6] rounded-xl bg-white mb-6">
                <h3 className="text-[11px] font-bold text-[#003d9b] uppercase mb-2">
                  Final Diagnosis
                </h3>
                <Textarea
                  className="text-sm mb-4 print:border-0 print:p-0 print:resize-none"
                  rows={2}
                  placeholder="Diagnosis..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-[#003d9b] font-bold uppercase mb-2">
                      Recommendations
                    </p>
                    <Textarea
                      className="text-[11px] print:border-0 print:p-0 print:resize-none"
                      rows={4}
                      placeholder="Recommendations..."
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                    />
                  </div>
                  <div className="bg-[#003d9b]/5 p-3 rounded-lg border border-[#003d9b]/20">
                    <p className="text-[10px] text-[#003d9b] font-bold uppercase mb-1">
                      Follow-up
                    </p>
                    <DateInput
                      className="print:border-0 print:p-0 print:bg-transparent"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-8 border-t border-[#c3c6d6] pt-4 flex justify-between items-end">
                <div />
                <div className="text-center w-48">
                  <div className="h-10 border-b border-[#434654] mb-1" />
                  <p className="text-[8px] text-[#434654] uppercase">
                    توقيع الطبيب المعالج
                  </p>
                </div>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
