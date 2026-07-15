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
import { displaySheetDate } from "@/lib/sheetDates";

export default function ClinicalReport() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/clinical-report/:id");
  const [, hubParams] = useRoute("/patient-hub/clinical-report/:id");
  const [, plainParams] = useRoute("/clinical-report/:id");
  const initialPatientId = Number(
    params?.id ?? hubParams?.id ?? plainParams?.id ?? 0,
  ) || undefined;

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

  const patient = patientQuery.data as any;
  const latestExam = (examinationsQuery.data as any[] | undefined)?.[0];
  const visits = (visitsQuery.data as any[] | undefined) ?? [];

  const glasses: {
    od: { s?: string; c?: string; axis?: string; pd?: string; bcva?: string };
    os: { s?: string; c?: string; axis?: string; pd?: string; bcva?: string };
  } = (() => {
    const empty = { od: {}, os: {} };
    const glassesRecord = (
      glassesRecordsQuery.data as any[] | undefined
    )?.find((r) => r.examinationId === latestExam?.id);
    if (!glassesRecord) return empty;
    return {
      od: {
        s: glassesRecord.sOD,
        c: glassesRecord.cOD,
        axis: glassesRecord.axisOD,
        pd: glassesRecord.pdOD,
        bcva: glassesRecord.bcvaOD,
      },
      os: {
        s: glassesRecord.sOS,
        c: glassesRecord.cOS,
        axis: glassesRecord.axisOS,
        pd: glassesRecord.pdOS,
        bcva: glassesRecord.bcvaOS,
      },
    };
  })();

  const [selectedVisitId, setSelectedVisitId] = useState<number | undefined>();
  const [diagnosis, setDiagnosis] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [existingReportId, setExistingReportId] = useState<number | undefined>();
  const [patientName, setPatientName] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientGender, setPatientGender] = useState("");

  useEffect(() => {
    if (!patient) return;
    setPatientName(patient.fullName || "");
    setPatientCode(patient.patientCode || "");
    setPatientDob(patient.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "");
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
      forVisit?.followUpDate
        ? String(forVisit.followUpDate).split("T")[0]
        : "",
    );
    if (forVisit?.patientNameOverride) setPatientName(forVisit.patientNameOverride);
    if (forVisit?.patientCodeOverride) setPatientCode(forVisit.patientCodeOverride);
    if (forVisit?.patientDobOverride) setPatientDob(String(forVisit.patientDobOverride).split("T")[0]);
    if (forVisit?.patientGenderOverride) setPatientGender(forVisit.patientGenderOverride);
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
    <div className="clinical-report-root bg-[#f1f2f4] min-h-screen print:min-h-0" dir="rtl">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; }
          .clinical-report-root, html, body { min-height: 0 !important; height: auto !important; }
        }
        .clinical-ltr { direction: ltr; text-align: left; }
      `}</style>

      <header className="sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-white border-b border-[#c3c6d6]">
        <Button size="sm" variant="ghost" onClick={() => goBack()} type="button">
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          {visits.length > 0 ? (
            <select
              className="text-xs border border-[#c3c6d6] rounded px-2 py-1.5 bg-white"
              value={selectedVisitId ?? ""}
              onChange={(e) => setSelectedVisitId(Number(e.target.value))}
            >
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {displaySheetDate(String(v.visitDate).split("T")[0])} — {v.visitType}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="border-[#003d9b] text-[#003d9b] font-bold"
            onClick={handleSave}
            disabled={createReportMutation.isPending || updateReportMutation.isPending}
            type="button"
          >
            <Save className="h-4 w-4 ml-1" />
            {createReportMutation.isPending || updateReportMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
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

      <main className="max-w-[210mm] mx-auto p-8 print:p-[10mm]">
        <div className="bg-white rounded-xl p-8 print:p-0 print:rounded-none border border-[#c3c6d6] print:border-0 shadow-sm print:shadow-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-[#003d9b]">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-[#003d9b] leading-tight">مركز عيون الشروق</span>
            </div>
            <div className="text-left clinical-ltr">
              <h1 className="text-xl font-extrabold text-[#191c1e] uppercase tracking-tight">Clinical Report</h1>
              <p className="text-xs text-[#434654]">Generated: {displaySheetDate(new Date().toISOString().split("T")[0])}</p>
            </div>
          </div>

          {!initialPatientId ? (
            <div className="p-8 text-center text-[#434654]">اختر مريضاً لعرض التقرير</div>
          ) : (
            <>
              {/* Patient Info + Allergies/Chronic */}
              <section className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-8 grid grid-cols-3 gap-y-4 p-4 bg-[#f3f4f6] rounded-lg border border-[#c3c6d6]">
                  <div className="col-span-2">
                    <p className="text-[10px] text-[#434654] uppercase font-bold">اسم المريض / Patient Name</p>
                    <input
                      className="text-sm font-bold w-full bg-transparent border-b border-transparent hover:border-[#c3c6d6] focus:border-[#003d9b] outline-none print:border-0"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#434654] uppercase font-bold">كود المريض / ID</p>
                    <input
                      className="text-sm font-bold w-full bg-transparent border-b border-transparent hover:border-[#c3c6d6] focus:border-[#003d9b] outline-none print:border-0"
                      value={patientCode}
                      onChange={(e) => setPatientCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#434654] uppercase font-bold">DOB</p>
                    <DateInput
                      className="text-sm print:border-0 print:p-0 print:bg-transparent"
                      value={patientDob}
                      onChange={(e) => setPatientDob(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#434654] uppercase font-bold">الجنس / Gender</p>
                    <select
                      className="text-sm w-full bg-transparent border-b border-transparent hover:border-[#c3c6d6] focus:border-[#003d9b] outline-none print:border-0"
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="male">ذكر / Male</option>
                      <option value="female">أنثى / Female</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-4 flex flex-col gap-2">
                  <div className="bg-[#ffdad6]/50 p-3 rounded-lg border border-[#ba1a1a]/20 flex-1">
                    <div className="flex items-center gap-1 text-[#ba1a1a] text-[10px] font-bold uppercase mb-1">
                      الحساسية / Allergies
                    </div>
                    <p className="text-xs font-bold text-[#93000a]">{patient?.allergies || "لا يوجد"}</p>
                  </div>
                  <div className="bg-[#006476]/10 p-3 rounded-lg border border-[#006476]/20 flex-1">
                    <div className="flex items-center gap-1 text-[#006476] text-[10px] font-bold uppercase mb-1">
                      أمراض مزمنة / Chronic Conditions
                    </div>
                    <p className="text-xs font-bold text-[#004b58]">{patient?.medicalHistory || "لا يوجد"}</p>
                  </div>
                </div>
              </section>

              {/* Glasses Prescription & Visual Acuity */}
              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[#003d9b] uppercase tracking-wide mb-2 border-b border-[#e1e2e4] pb-1">
                  وصفة النظارة / Glasses Prescription &amp; Visual Acuity
                </h3>
                <div className="border border-[#c3c6d6] rounded overflow-hidden clinical-ltr">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-[#e7e8ea] border-b border-[#c3c6d6]">
                        <th className="px-3 py-2 text-left">Eye</th>
                        <th className="px-3 py-2 text-left">Sphere (S)</th>
                        <th className="px-3 py-2 text-left">Cylinder (C)</th>
                        <th className="px-3 py-2 text-left">Axis (A)</th>
                        <th className="px-3 py-2 text-left">PD</th>
                        <th className="px-3 py-2 text-left">UCVA</th>
                        <th className="px-3 py-2 text-left">BCVA</th>
                        <th className="px-3 py-2 text-left">IOP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c3c6d6]/30">
                      <tr className="bg-[#003d9b]/[0.04]">
                        <td className="px-3 py-2 font-bold text-[#003d9b]">OD (Right)</td>
                        <td className="px-3 py-2 font-mono">{glasses.od.s || "—"}</td>
                        <td className="px-3 py-2 font-mono">{glasses.od.c || "—"}</td>
                        <td className="px-3 py-2 font-mono">{glasses.od.axis || "—"}</td>
                        <td className="px-3 py-2 font-mono">{glasses.od.pd || "—"}</td>
                        <td className="px-3 py-2">{latestExam?.ucvaOD || "—"}</td>
                        <td className="px-3 py-2 font-bold">{glasses.od.bcva || "—"}</td>
                        <td className="px-3 py-2">{latestExam?.iopOD || "—"}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold">OS (Left)</td>
                        <td className="px-3 py-2 font-mono">{glasses.os.s || "—"}</td>
                        <td className="px-3 py-2 font-mono">{glasses.os.c || "—"}</td>
                        <td className="px-3 py-2 font-mono">{glasses.os.axis || "—"}</td>
                        <td className="px-3 py-2 font-mono">{glasses.os.pd || "—"}</td>
                        <td className="px-3 py-2">{latestExam?.ucvaOS || "—"}</td>
                        <td className="px-3 py-2 font-bold">{glasses.os.bcva || "—"}</td>
                        <td className="px-3 py-2">{latestExam?.iopOS || "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Anterior + Posterior Segment */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 border border-[#c3c6d6] rounded-lg">
                  <h3 className="text-[11px] font-bold text-[#003d9b] uppercase mb-2">الجزء الأمامي / Anterior Segment</h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-[9px] text-[#434654] font-bold uppercase">OD</p>
                      <p>{latestExam?.anteriorSegmentOD || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#434654] font-bold uppercase">OS</p>
                      <p>{latestExam?.anteriorSegmentOS || "—"}</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border border-[#c3c6d6] rounded-lg">
                  <h3 className="text-[11px] font-bold text-[#003d9b] uppercase mb-2">قاع العين / Fundus Exam</h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-[9px] text-[#434654] font-bold uppercase">OD</p>
                      <p>{latestExam?.posteriorSegmentOD || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#434654] font-bold uppercase">OS</p>
                      <p>{latestExam?.posteriorSegmentOS || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnosis + Recommendations */}
              <div className="p-4 border-2 border-[#c3c6d6] rounded-xl bg-white mb-6">
                <h3 className="text-[11px] font-bold text-[#003d9b] uppercase mb-2">التشخيص النهائي / Final Diagnosis</h3>
                <Textarea
                  className="text-sm mb-4 print:border-0 print:p-0 print:resize-none"
                  rows={2}
                  placeholder="التشخيص..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-[#003d9b] font-bold uppercase mb-2">التوصيات / Recommendations</p>
                    <Textarea
                      className="text-[11px] print:border-0 print:p-0 print:resize-none"
                      rows={4}
                      placeholder="التوصيات..."
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                    />
                  </div>
                  <div className="bg-[#003d9b]/5 p-3 rounded-lg border border-[#003d9b]/20">
                    <p className="text-[10px] text-[#003d9b] font-bold uppercase mb-1">المتابعة / Follow-up</p>
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
                <div className="text-[10px] text-[#434654] leading-relaxed">
                  <p>مركز عيون الشروق</p>
                </div>
                <div className="text-center w-48">
                  <div className="h-10 border-b border-[#434654] mb-1" />
                  <p className="text-[8px] text-[#434654] uppercase">توقيع الطبيب المعالج</p>
                </div>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
