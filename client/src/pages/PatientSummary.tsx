import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
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

type TocSection = { id: string; label: string };

function SectionHeading({ id, label }: { id: string; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 id={`sum-${id}`} className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 scroll-mt-20">
        {label}
      </h2>
      <div className="h-px flex-1 bg-border/50" aria-hidden />
    </div>
  );
}

function DataTable({
  headers,
  rows,
  dir = "ltr",
}: {
  headers: string[];
  rows: (string | number)[][];
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full border-collapse text-center text-sm" dir={dir}>
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-border/60 px-3 py-2 text-xs font-semibold text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 font-mono text-xs text-foreground">
                  {formatDisplayValue(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PatientSummary() {
  const { user, isAuthenticated } = useAuth();
  const { goBack } = useAppNavigation();
  const [, summaryParams] = useRoute("/patient-summary/:id");
  const [, hubSummaryParams] = useRoute("/patient-hub/summary/:id");
  const [, hubBriefParams] = useRoute("/patient-hub/brief/:id");
  const rawPatientId = summaryParams?.id ?? hubSummaryParams?.id ?? hubBriefParams?.id;
  const patientId = rawPatientId ? Number(rawPatientId) : undefined;

  const [activeSection, setActiveSection] = useState<string>("basic");
  const contentRef = useRef<HTMLDivElement>(null);

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 },
  );

  const autorefractometryQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 },
  );

  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 },
  );

  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) },
  );

  const consultantSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: "consultant" },
    { enabled: Boolean(patientId), staleTime: 0 },
  );
  const specialistSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: "specialist" },
    { enabled: Boolean(patientId), staleTime: 0 },
  );
  const lasikSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: "lasik" },
    { enabled: Boolean(patientId), staleTime: 0 },
  );
  const externalSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: "external" },
    { enabled: Boolean(patientId), staleTime: 0 },
  );

  const prescriptionsQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) },
  );

  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: patientId ?? 0, limit: 10 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const requestTestsStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "request-tests" },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const testRequestsQuery = trpc.medical.getPatientTestRequests?.useQuery?.(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!patientId) return;
    examinationsQuery.refetch();
    visitsQuery.refetch();
    reportsQuery.refetch();
    prescriptionsQuery.refetch();
    pentacamQuery.refetch();
    testRequestsQuery?.refetch?.();
  }, [patientId]);

  if (!isAuthenticated) return null;
  if (new URL(location.href).pathname === "/offline")
    return <OfflinePageState title="Offline Mode" body="Patient summary is not available in offline mode" />;

  const patient = patientQuery.data as any;
  const examinations = examinationsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];

  const parsedExamSources = useMemo(() => {
    if (!Array.isArray(examinations)) return [];

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
      const autorefRecord = autorefMap.get(exam.id);
      let autorefraction = autorefRecord
        ? {
            od: { s: autorefRecord.sphereOD, c: autorefRecord.cylinderOD, axis: autorefRecord.axisOD, ucva: autorefRecord.ucvaOD, bcva: autorefRecord.bcvaOD, iop: autorefRecord.iopOD },
            os: { s: autorefRecord.sphereOS, c: autorefRecord.cylinderOS, axis: autorefRecord.axisOS, ucva: autorefRecord.ucvaOS, bcva: autorefRecord.bcvaOS, iop: autorefRecord.iopOS },
          }
        : ((exam as any).sphereOD || (exam as any).sphereOS || (exam as any).cylinderOD || (exam as any).ucvaOD || (exam as any).ucvaOS)
          ? {
              od: { s: (exam as any).sphereOD, c: (exam as any).cylinderOD, axis: (exam as any).axisOD, ucva: (exam as any).ucvaOD, bcva: (exam as any).bcvaOD, iop: (exam as any).iopOD },
              os: { s: (exam as any).sphereOS, c: (exam as any).cylinderOS, axis: (exam as any).axisOS, ucva: (exam as any).ucvaOS, bcva: (exam as any).bcvaOS, iop: (exam as any).iopOS },
            }
          : undefined;

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
        rows.push({ visitDate, eye: "OD", ucva: od.ucva || "-", bcva: od.bcva || "-", s: od.s || "-", c: od.c || "-", axis: od.axis || "-", iop: od.iop || "-", fundus: fundusOD ? (typeof fundusOD === "object" ? [fundusOD.discStatus, fundusOD.cupDiscRatio, fundusOD.macuaStatus, fundusOD.vesselStatus, fundusOD.otherFindings].filter(Boolean).join(", ") || "-" : fundusOD) : "-" });
      }
      if (os && [os.ucva, os.bcva, os.s, os.c, os.axis, os.iop].some(Boolean)) {
        rows.push({ visitDate, eye: "OS", ucva: os.ucva || "-", bcva: os.bcva || "-", s: os.s || "-", c: os.c || "-", axis: os.axis || "-", iop: os.iop || "-", fundus: fundusOS ? (typeof fundusOS === "object" ? [fundusOS.discStatus, fundusOS.cupDiscRatio, fundusOS.macuaStatus, fundusOS.vesselStatus, fundusOS.otherFindings].filter(Boolean).join(", ") || "-" : fundusOS) : "-" });
      }
    }
    return rows;
  }, [parsedExamSources]);

  const glassesRows = useMemo(() => {
    const rows: any[] = [];
    for (const source of parsedExamSources) {
      if (!source?.glasses) continue;
      const visitDate = formatDate(source.visitDate);
      const od = source.glasses?.od;
      if (od && [od.s, od.c, od.axis, od.pd, od.bcva].some(Boolean)) {
        rows.push({ visit: visitDate, eye: "OD", s: od.s || "-", c: od.c || "-", axis: od.axis || "-", pd: od.pd || "-", bcva: od.bcva || "-" });
      }
      const os = source.glasses?.os;
      if (os && [os.s, os.c, os.axis, os.pd, os.bcva].some(Boolean)) {
        rows.push({ visit: visitDate, eye: "OS", s: os.s || "-", c: os.c || "-", axis: os.axis || "-", pd: os.pd || "-", bcva: os.bcva || "-" });
      }
    }
    return rows;
  }, [parsedExamSources]);

  const pentacamMeasurements = useMemo(
    () => (Array.isArray(pentacamQuery.data) ? (pentacamQuery.data as any[]) : []),
    [pentacamQuery.data],
  );

  const pentacamRows = useMemo(() => {
    const rows: any[] = [];
    for (const source of pentacamMeasurements) {
      const visitDate = formatDate(source?.visitDate);
      const odData = { k1: source?.k1OD, k2: source?.k2OD, thinnest: source?.thinnestPointOD, apex: source?.apexOD, residual: source?.residualOD, ttt: source?.tttOD, ablation: source?.ablationOD };
      if ([odData.k1, odData.k2, odData.thinnest, odData.apex, odData.residual, odData.ttt, odData.ablation].some(Boolean)) {
        rows.push({ visit: visitDate, eye: "OD", ...Object.fromEntries(Object.entries(odData).map(([k, v]) => [k, v || "-"])) });
      }
      const osData = { k1: source?.k1OS, k2: source?.k2OS, thinnest: source?.thinnestPointOS, apex: source?.apexOS, residual: source?.residualOS, ttt: source?.tttOS, ablation: source?.ablationOS };
      if ([osData.k1, osData.k2, osData.thinnest, osData.apex, osData.residual, osData.ttt, osData.ablation].some(Boolean)) {
        rows.push({ visit: visitDate, eye: "OS", ...Object.fromEntries(Object.entries(osData).map(([k, v]) => [k, v || "-"])) });
      }
    }

    const sheetSources = [consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data];
    for (const sheet of sheetSources) {
      if ((sheet as any)?.examData) {
        const sheetExamData = parseJson((sheet as any).examData);
        if (sheetExamData?.pentacam) {
          if (sheetExamData.pentacam.od) {
            rows.push({ visit: "Sheet Data", eye: "OD", k1: sheetExamData.pentacam.od.k1 || "-", k2: sheetExamData.pentacam.od.k2 || "-", thinnest: sheetExamData.pentacam.od.thinnest || "-", apex: sheetExamData.pentacam.od.apex || "-", residual: sheetExamData.pentacam.od.residualStroma || "-", ttt: "-", ablation: "-" });
          }
          if (sheetExamData.pentacam.os) {
            rows.push({ visit: "Sheet Data", eye: "OS", k1: sheetExamData.pentacam.os.k1 || "-", k2: sheetExamData.pentacam.os.k2 || "-", thinnest: sheetExamData.pentacam.os.thinnest || "-", apex: sheetExamData.pentacam.os.apex || "-", residual: sheetExamData.pentacam.os.residualStroma || "-", ttt: "-", ablation: "-" });
          }
        }
      }
    }
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
    const isUncategorized = category.includes("uncategorized");
    if (category.includes("اشع") || category.includes("تصوير") || category.includes("radiology") || category.includes("imaging") || name.includes("اشع") || name.includes("سونار") || name.includes("sonar") || name.includes("xray") || name.includes("x-ray") || name.includes("ct") || name.includes("mri") || name.includes("ultrasound") || name.includes("ocular") || name.includes("iol") || name.includes("pf iol")) return "imaging";
    if (category.includes("تحليل") || category.includes("lab") || name.includes("cbc") || name.includes("تحاليل") || name.includes("analysis") || name.includes("blood") || name.includes("sugar") || name.includes("urea") || name.includes("creatinine") || name.includes("culture") || name.includes("sensitivity") || name.includes("prothombine") || name.includes("prothrombin")) return "lab";
    if (isUncategorized) return "lab";
    return "other";
  };

  const treatmentFromExams = useMemo(() => {
    const allTreatment: any[] = [];
    for (const source of parsedExamSources) {
      if (source?.radiologyLabsNotes) {
        try {
          const parsed = JSON.parse(source.radiologyLabsNotes);
          if (parsed.treatment && Array.isArray(parsed.treatment) && parsed.treatment.length > 0) {
            allTreatment.push(...parsed.treatment);
          }
        } catch { /* ignore */ }
      }
    }
    return [...new Set(allTreatment)];
  }, [parsedExamSources]);

  const prescriptions = prescriptionsQuery.data ?? [];
  const medicationNames = useMemo(() => {
    const names: string[] = [];
    (prescriptions as any[]).forEach((prescription) => {
      if (prescription.prescriptionItems && Array.isArray(prescription.prescriptionItems)) {
        prescription.prescriptionItems.forEach((item: any) => {
          if (item.medicationName) names.push(item.medicationName);
        });
      }
    });
    return [...new Set(names)];
  }, [prescriptions]);

  const latestReport = reports && reports.length > 0 ? reports[0] : null;
  const latestReportContent = latestReport?.diagnosis ? parseJson(latestReport.diagnosis) || latestReport.diagnosis : null;
  const patientName = firstNonEmpty(patient?.fullName, "—");

  const clinicalTests = selectedTests.filter((t) => {
    const k = classifyTest(t);
    return k === "imaging" || k === "lab";
  });
  const hasHistory = !!(reports?.[0]?.clinicalOpinion || patient?.medicalHistory);
  const hasPrescriptions = medicationNames.length > 0 || treatmentFromExams.length > 0;

  const tocSections = useMemo<TocSection[]>(
    () =>
      [
        { id: "basic", label: "البيانات الأساسية", show: true },
        { id: "history", label: "التاريخ المرضي", show: hasHistory },
        { id: "examinations", label: "القياسات", show: examinationData.length > 0 },
        { id: "glasses", label: "النظارة", show: glassesRows.length > 0 },
        { id: "pentacam", label: "بنتاكام", show: pentacamRows.length > 0 },
        { id: "tests", label: "الأشعات والتحاليل", show: clinicalTests.length > 0 },
        { id: "prescriptions", label: "الروشتة والعلاج", show: hasPrescriptions },
        { id: "diagnosis", label: "التشخيص", show: !!latestReport },
        { id: "visits", label: "الزيارات", show: true },
      ].filter((s) => s.show),
    [hasHistory, examinationData.length, glassesRows.length, pentacamRows.length, clinicalTests.length, hasPrescriptions, latestReport],
  );

  // Scrollspy via IntersectionObserver anchored to content container
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id.replace("sum-", ""));
            break;
          }
        }
      },
      { root: content, threshold: 0, rootMargin: "-10% 0px -65% 0px" },
    );
    tocSections.forEach((s) => {
      const el = document.getElementById(`sum-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [tocSections]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`sum-${id}`);
    if (el && contentRef.current) {
      contentRef.current.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
      setActiveSection(id);
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col" dir="rtl">
      {/* Identity strip — info/blue tint distinguishes from patient-file */}
      <header className="z-20 shrink-0 border-b border-info/25 bg-info/5 print:border-border print:bg-background">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 print:hidden"
            onClick={() => goBack()}
            aria-label="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="truncate font-semibold leading-tight text-foreground">{patientName}</span>
            {patient?.patientCode && (
              <span dir="ltr" className="shrink-0 font-mono text-xs text-muted-foreground">
                #{patient.patientCode as string}
              </span>
            )}
            {patient?.age && (
              <span className="shrink-0 text-xs text-muted-foreground">{String(patient.age)} سنة</span>
            )}
            <Badge
              variant="outline"
              className="shrink-0 border-info/40 bg-info/10 text-[11px] text-info"
            >
              التقرير المجمع
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            طباعة
          </Button>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* TOC sidebar — right side in RTL, desktop only */}
        <aside className="hidden w-44 shrink-0 flex-col border-e border-border/60 bg-muted/15 lg:flex print:hidden">
          <p className="px-4 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            المحتويات
          </p>
          <nav className="flex flex-col overflow-y-auto pb-6" aria-label="فهرس التقرير">
            {tocSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "border-s-2 px-4 py-2 text-right text-sm transition-colors",
                  activeSection === s.id
                    ? "border-s-info bg-info/10 font-semibold text-info"
                    : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Scrollable content */}
        <main ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-10 px-4 py-6 pb-16 print:max-w-none print:space-y-8 print:px-6 print:py-4">

            {/* البيانات الأساسية */}
            <section id="sum-basic" className="scroll-mt-4">
              <SectionHeading id="basic" label="البيانات الأساسية" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {[
                  { label: "الاسم", value: patientName },
                  { label: "رقم المريض", value: patient?.patientCode ?? "—", mono: true },
                  { label: "الهاتف", value: patient?.phone ?? "—", mono: true },
                  { label: "العنوان", value: patient?.address ?? "—" },
                  { label: "تاريخ الميلاد", value: formatDate(patient?.dateOfBirth), mono: true },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className={cn("mt-0.5 text-sm font-medium text-foreground", item.mono && "font-mono")}>
                      {item.value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* التاريخ المرضي */}
            {hasHistory && (
              <section id="sum-history" className="scroll-mt-4">
                <SectionHeading id="history" label="التاريخ المرضي" />
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {reports?.[0]?.clinicalOpinion || patient?.medicalHistory || "لا توجد ملاحظات"}
                </p>
              </section>
            )}

            {/* القياسات */}
            {examinationData.length > 0 && (
              <section id="sum-examinations" className="scroll-mt-4">
                <SectionHeading id="examinations" label="القياسات البصرية" />
                <DataTable
                  headers={["التاريخ", "العين", "UCVA", "BCVA", "S", "C", "Axis", "IOP", "Fundus"]}
                  rows={examinationData.map((r) => [
                    r.visitDate, r.eye, r.ucva, r.bcva, r.s, r.c, r.axis, r.iop, r.fundus,
                  ])}
                />
              </section>
            )}

            {/* النظارة */}
            {glassesRows.length > 0 && (
              <section id="sum-glasses" className="scroll-mt-4">
                <SectionHeading id="glasses" label="النظارة" />
                <DataTable
                  headers={["التاريخ", "العين", "S", "C", "Axis", "PD", "BCVA"]}
                  rows={glassesRows.map((r) => [r.visit, r.eye, r.s, r.c, r.axis, r.pd, r.bcva])}
                />
              </section>
            )}

            {/* بنتاكام */}
            {pentacamRows.length > 0 && (
              <section id="sum-pentacam" className="scroll-mt-4">
                <SectionHeading id="pentacam" label="بنتاكام" />
                <DataTable
                  headers={["التاريخ", "العين", "K1", "K2", "Thinnest", "Apex", "Residual", "TTT", "Ablation"]}
                  rows={pentacamRows.map((r) => [r.visit, r.eye, r.k1, r.k2, r.thinnest, r.apex, r.residual, r.ttt, r.ablation])}
                />
              </section>
            )}

            {/* الأشعات والتحاليل */}
            {clinicalTests.length > 0 && (
              <section id="sum-tests" className="scroll-mt-4">
                <SectionHeading id="tests" label="الأشعات والتحاليل" />
                <ul className="space-y-2">
                  {clinicalTests.map((test: any, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-start justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {test.name || test.serviceName || "—"}
                        </p>
                        {(test.category || test.serviceCategory) && (
                          <p className="text-xs text-muted-foreground">
                            {test.category || test.serviceCategory}
                          </p>
                        )}
                      </div>
                      {test.result && (
                        <Badge variant="outline" className="ml-3 shrink-0 text-xs">
                          {test.result}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* الروشتة والعلاج */}
            {hasPrescriptions && (
              <section id="sum-prescriptions" className="scroll-mt-4">
                <SectionHeading id="prescriptions" label="الروشتة والعلاج" />
                {medicationNames.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">الروشات المحفوظة</p>
                    <div className="flex flex-wrap gap-2">
                      {medicationNames.map((name, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {formatDisplayValue(name)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {treatmentFromExams.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">من الملف الطبي</p>
                    <div className="flex flex-wrap gap-2">
                      {treatmentFromExams.map((id) => {
                        const med = (medicationsQuery.data ?? []).find((m: any) => m.id === id);
                        return (
                          <Badge key={id} className="text-xs">
                            {formatDisplayValue(med?.name ?? `علاج #${id}`)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* التشخيص */}
            {latestReport && (
              <section id="sum-diagnosis" className="scroll-mt-4">
                <SectionHeading id="diagnosis" label="التشخيص" />
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{formatDate((latestReport as any).createdAt)}</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                    {typeof latestReportContent === "string"
                      ? latestReportContent
                      : JSON.stringify(latestReportContent, null, 2)}
                  </p>
                </div>
              </section>
            )}

            {/* الزيارات */}
            <section id="sum-visits" className="scroll-mt-4">
              <SectionHeading id="visits" label="الزيارات" />
              {visitsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : visitsQuery.isError ? (
                <p className="text-sm text-destructive">خطأ في تحميل الزيارات</p>
              ) : (visitsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد زيارات مسجّلة</p>
              ) : (() => {
                const visitsByDate = new Map<string, any[]>();
                const sorted = [...(visitsQuery.data ?? [])].sort(
                  (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime(),
                );
                sorted.forEach((visit) => {
                  const key = formatDate(visit.visitDate);
                  if (!visitsByDate.has(key)) visitsByDate.set(key, []);
                  visitsByDate.get(key)!.push(visit);
                });
                return (
                  <div className="space-y-4">
                    {Array.from(visitsByDate.entries()).map(([date, visits]) => (
                      <div key={date}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                            {date}
                          </span>
                          <span className="text-xs text-muted-foreground">({visits.length})</span>
                        </div>
                        <ul className="space-y-1.5">
                          {visits.map((visit) => (
                            <li
                              key={visit.id}
                              className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5 text-sm"
                            >
                              <span className="font-medium text-foreground">
                                {formatDisplayValue(visit.visitType || "زيارة")}
                              </span>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  {new Date(visit.visitDate).toLocaleTimeString("ar-EG", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span dir="ltr" className="font-mono">
                                  #{visit.id}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
