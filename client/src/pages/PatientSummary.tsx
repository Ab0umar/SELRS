import { useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { OfflinePageState } from "@/components/OfflinePageState";

function parseJson(value?: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return date.toISOString().split("T")[0];
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatDisplayValue(item)).filter(Boolean).join(", ");
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
}

export default function PatientSummary() {
  const { user, isAuthenticated } = useAuth();
  const { goBack } = useAppNavigation();
  const [, summaryParams] = useRoute("/patient-summary/:id");
  const [, hubSummaryParams] = useRoute("/patient-hub/summary/:id");
  const [, hubBriefParams] = useRoute("/patient-hub/brief/:id");
  const rawPatientId = summaryParams?.id ?? hubSummaryParams?.id ?? hubBriefParams?.id;
  const patientId = rawPatientId ? Number(rawPatientId) : undefined;

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    {
      enabled: Boolean(patientId),
      staleTime: 0  // Always refetch when invalidated by exam form save
    }
  );

  // Load autorefraction data from separate table
  const autorefractometryQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 }
  );

  // Load glasses records from separate table
  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 }
  );

  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) }
  );

  // Fetch sheet data for existing refraction (backward compatibility)
  const consultantSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: 'consultant' },
    { enabled: Boolean(patientId), staleTime: 0 }
  );
  const specialistSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: 'specialist' },
    { enabled: Boolean(patientId), staleTime: 0 }
  );
  const lasikSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: 'lasik' },
    { enabled: Boolean(patientId), staleTime: 0 }
  );
  const externalSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: 'external' },
    { enabled: Boolean(patientId), staleTime: 0 }
  );

  const prescriptionsQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) }
  );

  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: patientId ?? 0, limit: 10 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const requestTestsStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "request-tests" },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const testRequestsQuery = trpc.medical.getPatientTestRequests?.useQuery?.(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Refetch all data when patient changes
  useEffect(() => {
    if (!patientId) return;
    console.log('[PatientSummary] Refetching data for patientId:', patientId);
    examinationsQuery.refetch();
    visitsQuery.refetch();
    reportsQuery.refetch();
    prescriptionsQuery.refetch();
    pentacamQuery.refetch();
    testRequestsQuery.refetch();
  }, [patientId]);

  if (!isAuthenticated) return null;
  if (new URL(location.href).pathname === "/offline") return <OfflinePageState title="Offline Mode" body="Patient summary is not available in offline mode" />;

  const patient = patientQuery.data as any;
  const examinations = examinationsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];

  const parsedExamSources = useMemo(() => {
    if (!Array.isArray(examinations)) return [];

    // Create lookup maps for autorefraction and glasses records
    const autorefMap = new Map<number, any>();
    const glassesMap = new Map<number, any>();

    if (Array.isArray(autorefractometryQuery.data)) {
      for (const record of autorefractometryQuery.data) {
        autorefMap.set(record.examinationId, record);
      }
    }

    if (Array.isArray(glassesRecordsQuery.data)) {
      for (const record of glassesRecordsQuery.data) {
        glassesMap.set(record.examinationId, record);
      }
    }

    return examinations.map((exam) => {
      // Get autorefraction from dedicated table, fallback to examination row columns
      const autorefRecord = autorefMap.get(exam.id);
      let autorefraction = autorefRecord ? {
        od: { s: autorefRecord.sphereOD, c: autorefRecord.cylinderOD, axis: autorefRecord.axisOD, ucva: autorefRecord.ucvaOD, bcva: autorefRecord.bcvaOD, iop: autorefRecord.iopOD },
        os: { s: autorefRecord.sphereOS, c: autorefRecord.cylinderOS, axis: autorefRecord.axisOS, ucva: autorefRecord.ucvaOS, bcva: autorefRecord.bcvaOS, iop: autorefRecord.iopOS },
      } : ((exam as any).sphereOD || (exam as any).sphereOS || (exam as any).cylinderOD || (exam as any).ucvaOD || (exam as any).ucvaOS) ? {
        od: { s: (exam as any).sphereOD, c: (exam as any).cylinderOD, axis: (exam as any).axisOD, ucva: (exam as any).ucvaOD, bcva: (exam as any).bcvaOD, iop: (exam as any).iopOD },
        os: { s: (exam as any).sphereOS, c: (exam as any).cylinderOS, axis: (exam as any).axisOS, ucva: (exam as any).ucvaOS, bcva: (exam as any).bcvaOS, iop: (exam as any).iopOS },
      } : undefined;

      // Get glasses from dedicated table, fallback to glassesData JSON on examination row
      const glassesRecord = glassesMap.get(exam.id);
      let glassesData: any = undefined;
      if (glassesRecord) {
        glassesData = {
          od: glassesRecord.sOD || glassesRecord.cOD ? { s: glassesRecord.sOD, c: glassesRecord.cOD, axis: glassesRecord.axisOD, pd: glassesRecord.pdOD, add: glassesRecord.addOD, bcva: glassesRecord.bcvaOD } : undefined,
          os: glassesRecord.sOS || glassesRecord.cOS ? { s: glassesRecord.sOS, c: glassesRecord.cOS, axis: glassesRecord.axisOS, pd: glassesRecord.pdOS, add: glassesRecord.addOS, bcva: glassesRecord.bcvaOS } : undefined,
        };
      } else if ((exam as any).glassesData) {
        try { glassesData = JSON.parse((exam as any).glassesData); } catch { /* ignore */ }
      }

      // Fallback: check sheets for existing refraction data (backward compatibility)
      if (!glassesData) {
        const sheetSources = [consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data];
        for (const sheet of sheetSources) {
          if ((sheet as any)?.examData) {
            const sheetExamData = parseJson((sheet as any).examData);
            if (sheetExamData?.glasses) {
              glassesData = sheetExamData.glasses;
              break;
            }
          }
        }
      }

      // Use visit date from refraction records if available, otherwise from examination
      const visitDate = autorefRecord?.visitDate || glassesRecord?.visitDate || exam?.createdAt;

      return {
        autorefraction,
        glasses: glassesData,
        visitDate,
        radiologyLabsNotes: exam?.radiologyLabsNotes,
        fundusOD: exam?.posteriorSegmentOD ? parseJson(exam.posteriorSegmentOD) : undefined,
        fundusOS: exam?.posteriorSegmentOS ? parseJson(exam.posteriorSegmentOS) : undefined,
      };
    });
  }, [examinations, autorefractometryQuery.data, glassesRecordsQuery.data, consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data]);

  const examinationData = useMemo(() => {
    const rows: any[] = [];
    for (const source of parsedExamSources) {
      if (!source) continue;
      const od = source.autorefraction?.od;
      const os = source.autorefraction?.os;
      const fundusOD = source.fundusOD;
      const fundusOS = source.fundusOS;
      const visitDate = formatDate(source.visitDate);

      if (od && [od.ucva, od.bcva, od.s, od.c, od.axis, od.iop].some(Boolean)) {
        rows.push({
          visitDate,
          eye: "OD",
          ucva: od.ucva || "-",
          bcva: od.bcva || "-",
          s: od.s || "-",
          c: od.c || "-",
          axis: od.axis || "-",
          iop: od.iop || "-",
          fundus: fundusOD ? (typeof fundusOD === "object" ? [fundusOD.discStatus, fundusOD.cupDiscRatio, fundusOD.macuaStatus, fundusOD.vesselStatus, fundusOD.otherFindings].filter(Boolean).join(", ") || "-" : fundusOD) : "-",
        });
      }
      if (os && [os.ucva, os.bcva, os.s, os.c, os.axis, os.iop].some(Boolean)) {
        rows.push({
          visitDate,
          eye: "OS",
          ucva: os.ucva || "-",
          bcva: os.bcva || "-",
          s: os.s || "-",
          c: os.c || "-",
          axis: os.axis || "-",
          iop: os.iop || "-",
          fundus: fundusOS ? (typeof fundusOS === "object" ? [fundusOS.discStatus, fundusOS.cupDiscRatio, fundusOS.macuaStatus, fundusOS.vesselStatus, fundusOS.otherFindings].filter(Boolean).join(", ") || "-" : fundusOS) : "-",
        });
      }
    }
    return rows;
  }, [parsedExamSources]);

  const glassesRows = useMemo(() => {
    const rows: any[] = [];
    // Show data from each visit/examination
    for (const source of parsedExamSources) {
      if (!source?.glasses) continue;

      const visitDate = formatDate(source.visitDate);

      // OD row
      const od = source.glasses?.od;
      if (od && [od.s, od.c, od.axis, od.pd, od.bcva].some(Boolean)) {
        rows.push({
          visit: visitDate,
          eye: "OD",
          s: od.s || "-",
          c: od.c || "-",
          axis: od.axis || "-",
          pd: od.pd || "-",
          bcva: od.bcva || "-",
        });
      }

      // OS row
      const os = source.glasses?.os;
      if (os && [os.s, os.c, os.axis, os.pd, os.bcva].some(Boolean)) {
        rows.push({
          visit: visitDate,
          eye: "OS",
          s: os.s || "-",
          c: os.c || "-",
          axis: os.axis || "-",
          pd: os.pd || "-",
          bcva: os.bcva || "-",
        });
      }
    }
    return rows;
  }, [parsedExamSources]);

  const pentacamMeasurements = useMemo(() => {
    return Array.isArray(pentacamQuery.data) ? (pentacamQuery.data as any[]) : [];
  }, [pentacamQuery.data]);

  const pentacamRows = useMemo(() => {
    const rows: any[] = [];

    // Show data from each pentacam measurement
    for (const source of pentacamMeasurements) {
      const visitDate = formatDate(source?.visitDate);

      // OD row
      const odData = {
        k1: source?.k1OD,
        k2: source?.k2OD,
        thinnest: source?.thinnestPointOD,
        apex: source?.apexOD,
        residual: source?.residualOD,
        ttt: source?.tttOD,
        ablation: source?.ablationOD,
      };
      if ([odData.k1, odData.k2, odData.thinnest, odData.apex, odData.residual, odData.ttt, odData.ablation].some(Boolean)) {
        rows.push({
          visit: visitDate,
          eye: "OD",
          k1: odData.k1 || "-",
          k2: odData.k2 || "-",
          thinnest: odData.thinnest || "-",
          apex: odData.apex || "-",
          residual: odData.residual || "-",
          ttt: odData.ttt || "-",
          ablation: odData.ablation || "-",
        });
      }

      // OS row
      const osData = {
        k1: source?.k1OS,
        k2: source?.k2OS,
        thinnest: source?.thinnestPointOS,
        apex: source?.apexOS,
        residual: source?.residualOS,
        ttt: source?.tttOS,
        ablation: source?.ablationOS,
      };
      if ([osData.k1, osData.k2, osData.thinnest, osData.apex, osData.residual, osData.ttt, osData.ablation].some(Boolean)) {
        rows.push({
          visit: visitDate,
          eye: "OS",
          k1: osData.k1 || "-",
          k2: osData.k2 || "-",
          thinnest: osData.thinnest || "-",
          apex: osData.apex || "-",
          residual: osData.residual || "-",
          ttt: osData.ttt || "-",
          ablation: osData.ablation || "-",
        });
      }
    }

    // Also add pentacam data from examinations (saved from RefractionPage)
    examinationData.forEach((exam) => {
      if (exam?.pentacam) {
        const visitDate = exam?.visitDate ? formatDate(exam.visitDate) : "Latest";

        // OD row
        if (exam.pentacam.od) {
          rows.push({
            visit: visitDate,
            eye: "OD",
            k1: exam.pentacam.od.k1 || "-",
            k2: exam.pentacam.od.k2 || "-",
            thinnest: exam.pentacam.od.thinnest || "-",
            apex: exam.pentacam.od.apex || "-",
            residual: exam.pentacam.od.residualStroma || "-",
            ttt: "-",
            ablation: "-",
          });
        }

        // OS row
        if (exam.pentacam.os) {
          rows.push({
            visit: visitDate,
            eye: "OS",
            k1: exam.pentacam.os.k1 || "-",
            k2: exam.pentacam.os.k2 || "-",
            thinnest: exam.pentacam.os.thinnest || "-",
            apex: exam.pentacam.os.apex || "-",
            residual: exam.pentacam.os.residualStroma || "-",
            ttt: "-",
            ablation: "-",
          });
        }
      }
    });

    // Also add pentacam data from sheets (backward compatibility for existing data)
    const sheetSources = [consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data];
    sheetSources.forEach((sheet) => {
      if ((sheet as any)?.examData) {
        const sheetExamData = parseJson((sheet as any).examData);
        if (sheetExamData?.pentacam) {
          // OD row
          if (sheetExamData.pentacam.od) {
            rows.push({
              visit: "Sheet Data",
              eye: "OD",
              k1: sheetExamData.pentacam.od.k1 || "-",
              k2: sheetExamData.pentacam.od.k2 || "-",
              thinnest: sheetExamData.pentacam.od.thinnest || "-",
              apex: sheetExamData.pentacam.od.apex || "-",
              residual: sheetExamData.pentacam.od.residualStroma || "-",
              ttt: "-",
              ablation: "-",
            });
          }

          // OS row
          if (sheetExamData.pentacam.os) {
            rows.push({
              visit: "Sheet Data",
              eye: "OS",
              k1: sheetExamData.pentacam.os.k1 || "-",
              k2: sheetExamData.pentacam.os.k2 || "-",
              thinnest: sheetExamData.pentacam.os.thinnest || "-",
              apex: sheetExamData.pentacam.os.apex || "-",
              residual: sheetExamData.pentacam.os.residualStroma || "-",
              ttt: "-",
              ablation: "-",
            });
          }
        }
      }
    });

    return rows;
  }, [pentacamMeasurements, examinationData, consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data]);

  const selectedTests = useMemo(() => {
    const data = (requestTestsStateQuery.data as any)?.data ?? {};
    return Array.isArray(data.selectedTests) ? (data.selectedTests as any[]) : [];
  }, [requestTestsStateQuery.data]);

  const classifyTest = (test: any): "lab" | "imaging" | "other" => {
    const type = String(test?.type ?? "").trim().toLowerCase();
    if (type === "lab") return "lab";
    if (type === "imaging") return "imaging";
    const category = String(test?.category ?? test?.serviceCategory ?? "").trim().toLowerCase();
    const name = String(test?.name ?? test?.serviceName ?? "").trim().toLowerCase();

    // If category explicitly says "Uncategorized", treat as imaging or lab based on name
    const isUncategorized = category.includes("uncategorized");

    if (
      category.includes("اشع") ||
      category.includes("تصوير") ||
      category.includes("radiology") ||
      category.includes("imaging") ||
      name.includes("اشع") ||
      name.includes("سونار") ||
      name.includes("sonar") ||
      name.includes("xray") ||
      name.includes("x-ray") ||
      name.includes("ct") ||
      name.includes("mri") ||
      name.includes("ultrasound") ||
      name.includes("ocular") ||
      name.includes("iol") ||
      name.includes("pf iol")
    ) {
      return "imaging";
    }

    if (
      category.includes("تحليل") ||
      category.includes("lab") ||
      name.includes("cbc") ||
      name.includes("تحاليل") ||
      name.includes("analysis") ||
      name.includes("blood") ||
      name.includes("sugar") ||
      name.includes("urea") ||
      name.includes("creatinine") ||
      name.includes("culture") ||
      name.includes("sensitivity") ||
      name.includes("prothombine") ||
      name.includes("prothrombin")
    ) {
      return "lab";
    }

    // Default: if uncategorized, assume it's something meaningful (lab or imaging)
    if (isUncategorized) {
      return "lab"; // Default uncategorized to lab
    }

    return "other";
  };

  // Extract diagnosis and treatment from examinations radiologyLabsNotes
  const diagnosisFromExams = useMemo(() => {
    let diagnosis = "";
    parsedExamSources.forEach((source) => {
      if (source?.radiologyLabsNotes) {
        try {
          const parsed = JSON.parse(source.radiologyLabsNotes);
          // Note: radiologyLabsNotes currently only contains tests and treatment
          // Actual diagnosis is stored in doctorReport table
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    return diagnosis;
  }, [parsedExamSources]);

  const treatmentFromExams = useMemo(() => {
    const allTreatment: any[] = [];
    parsedExamSources.forEach((source) => {
      if (source?.radiologyLabsNotes) {
        try {
          const parsed = JSON.parse(source.radiologyLabsNotes);
          if (parsed.treatment && Array.isArray(parsed.treatment) && parsed.treatment.length > 0) {
            allTreatment.push(...parsed.treatment);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    return [...new Set(allTreatment)]; // Remove duplicates
  }, [parsedExamSources]);

  const prescriptions = prescriptionsQuery.data ?? [];
  const medicationNames = useMemo(() => {
    const names: string[] = [];
    prescriptions.forEach((prescription: any) => {
      if (prescription.prescriptionItems && Array.isArray(prescription.prescriptionItems)) {
        prescription.prescriptionItems.forEach((item: any) => {
          if (item.medicationName) {
            names.push(item.medicationName);
          }
        });
      }
    });
    return [...new Set(names)];
  }, [prescriptions]);

  const latestReport = reports && reports.length > 0 ? reports[0] : null;
  const latestReportContent = latestReport?.diagnosis ? parseJson(latestReport.diagnosis) || latestReport.diagnosis : null;

  const patientName = firstNonEmpty(patient?.fullName, "—");

  return (
    <div className="min-h-screen selrs-page-bg" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => goBack()}
              className="rounded-lg p-2 hover:bg-white/50 transition-colors"
              title="رجوع"
            >
              <ArrowRight className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patientName}</h1>
              <p className="text-sm text-slate-500">ملخص بيانات المريض</p>
            </div>
          </div>
        </div>

        {/* Basic Patient Data */}
        <Card className="border-slate-200/80 bg-white/92 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg">البيانات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">الاسم</p>
                <p className="font-semibold">{patientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">رقم المريض</p>
                <p className="font-semibold">{patient?.patientCode ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الهاتف</p>
                <p className="font-semibold">{patient?.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">العنوان</p>
                <p className="font-semibold">{patient?.address ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">تاريخ الميلاد</p>
                <p className="font-semibold">{formatDate(patient?.dateOfBirth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical History */}
        {(reports?.[0]?.clinicalOpinion || patient?.medicalHistory) && (
          <Card className="border-slate-200/80 bg-white/92 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Medical History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {reports?.[0]?.clinicalOpinion || patient?.medicalHistory || "لا توجد ملاحظات"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Refraction & Examination */}
        {examinationData.length > 0 && (
          <Card className="border-slate-200/80 bg-white/92 shadow-sm" dir="ltr">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Refraction & Examination</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[700px] border-collapse text-center text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Eye</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">UCVA</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">BCVA</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">S</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">C</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Ax</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">IOP</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Fundus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examinationData.map((row, idx) => (
                      <tr key={idx} className="bg-white hover:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 font-bold">{formatDisplayValue(row.eye)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.ucva)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.bcva)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.s)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.c)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.axis)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.iop)}</td>
                        <td className="border border-slate-200 px-3 py-2 text-left text-xs">{formatDisplayValue(row.fundus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Glasses Prescription */}
        {glassesRows.length > 0 && (
          <Card className="border-slate-200/80 bg-white/92 shadow-sm" dir="ltr">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">👓 جدول النظاره</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] border-collapse text-center text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Date</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Eye</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">S</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">C</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Axis</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">PD</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">BCVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glassesRows.map((row, idx) => (
                      <tr key={`glass-${row.visit}-${row.eye}-${idx}`} className="bg-white hover:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{formatDisplayValue(row.visit)}</td>
                        <td className="border border-slate-200 px-3 py-2 font-bold">{formatDisplayValue(row.eye)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.s)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.c)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.axis)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.pd)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.bcva)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pentacam */}
        {pentacamRows.length > 0 && (
          <Card className="border-slate-200/80 bg-white/92 shadow-sm" dir="ltr">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">جدول البنتاكام</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[900px] border-collapse text-center text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Date</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Eye</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">K1</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">K2</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Thinnest</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Apex</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Residual</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">TTT</th>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Ablation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pentacamRows.map((row, idx) => (
                      <tr key={`pent-${row.visit}-${row.eye}-${idx}`} className="bg-white hover:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{formatDisplayValue(row.visit)}</td>
                        <td className="border border-slate-200 px-3 py-2 font-bold">{formatDisplayValue(row.eye)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.k1)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.k2)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.thinnest)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.apex)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.residual)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.ttt)}</td>
                        <td className="border border-slate-200 px-3 py-2">{formatDisplayValue(row.ablation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tests / Results - Imaging and Labs only */}
        {selectedTests.filter((test) => {
          const kind = classifyTest(test);
          return kind === "imaging" || kind === "lab";
        }).length > 0 && (
          <Card className="border-slate-200/80 bg-white/92 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">الأشعات والتحاليل</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {selectedTests
                  .filter((test) => {
                    const kind = classifyTest(test);
                    return kind === "imaging" || kind === "lab";
                  })
                  .map((test: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{test.name || test.serviceName || "—"}</p>
                        <p className="text-xs text-slate-500">{test.category || test.serviceCategory || ""}</p>
                      </div>
                      {test.result && (
                        <Badge variant="outline" className="ml-2">
                          {test.result}
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prescriptions & Treatments */}
        {(medicationNames.length > 0 || treatmentFromExams.length > 0) && (
          <Card className="border-slate-200/80 bg-white/92 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">الروشتة والعلاج</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Saved Prescriptions */}
              {medicationNames.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">الروشات المحفوظة</p>
                  <div className="flex flex-wrap gap-2">
                    {medicationNames.map((name, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {formatDisplayValue(name)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Treatment from Examinations */}
              {treatmentFromExams.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">العلاجات المختارة من الملف الطبي</p>
                  <div className="flex flex-wrap gap-2">
                    {treatmentFromExams.map((treatmentId) => {
                      const medication = (medicationsQuery.data ?? []).find((m: any) => m.id === treatmentId);
                      return (
                        <Badge key={treatmentId} variant="default" className="text-sm">
                          {formatDisplayValue(medication?.name ?? `العلاج #${treatmentId}`)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Diagnosis & Doctor Comment */}
        {latestReport && (
          <Card className="border-slate-200/80 bg-white/92 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Diagnosis & Doctor Comment</CardTitle>
              <p className="text-xs text-slate-500 mt-1">{formatDate(latestReport.createdAt)}</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-sm mb-1">Diagnosis:</p>
                  <p className="text-sm whitespace-pre-wrap text-slate-700">
                    {typeof latestReportContent === "string"
                      ? latestReportContent
                      : JSON.stringify(latestReportContent, null, 2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visits List */}
        <Card className="border-slate-200/80 bg-white/92 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg">الزيارات</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {visitsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : visitsQuery.isError ? (
              <div className="text-sm text-red-600">خطأ في تحميل الزيارات</div>
            ) : (visitsQuery.data ?? []).length === 0 ? (
              <div className="text-sm text-slate-500">لا توجد زيارات</div>
            ) : (() => {
              // Group visits by date and sort by most recent first
              const visitsByDate = new Map<string, any[]>();
              const sortedVisits = [...(visitsQuery.data ?? [])].sort(
                (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
              );

              sortedVisits.forEach((visit) => {
                const dateKey = formatDate(visit.visitDate);
                if (!visitsByDate.has(dateKey)) {
                  visitsByDate.set(dateKey, []);
                }
                visitsByDate.get(dateKey)!.push(visit);
              });

              return (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Array.from(visitsByDate.entries()).map(([date, visits]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white/95 py-1 z-10">
                        <div className="text-xs font-bold text-slate-700 px-2 py-1 bg-slate-100 rounded">
                          {date}
                        </div>
                        <span className="text-xs text-slate-500">({visits.length} زيارة)</span>
                      </div>
                      <div className="space-y-2 ml-4 border-l border-slate-200 pl-3">
                        {visits.map((visit) => (
                          <div key={visit.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono text-slate-600">#{visit.id}</span>
                              <span className="text-xs text-slate-500">
                                {new Date(visit.visitDate).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-slate-800">
                              {formatDisplayValue(visit.visitType || "زيارة")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
