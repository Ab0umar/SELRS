import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Eye,
  ListTree,
  Printer,
} from "lucide-react";
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value
      .map((item) => formatDisplayValue(item))
      .filter(Boolean)
      .join(", ");
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
    <div className="mb-4 flex items-center gap-3 border-b border-border pb-2">
      <h2
        id={`sum-${id}`}
        className="scroll-mt-20 shrink-0 text-base font-bold text-foreground"
      >
        {label}
      </h2>
    </div>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div
      className="overflow-x-auto rounded-lg border border-border/60"
      style={{ direction: "ltr" }}
    >
      <table
        className="w-full border-collapse text-center text-sm"
        style={{ direction: "ltr" }}
      >
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
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                لا توجد بيانات محفوظة في الجدول
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/40 last:border-0 hover:bg-muted/20"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-3 py-2 font-mono text-xs text-foreground"
                    dir="auto"
                  >
                    {formatDisplayValue(cell)}
                  </td>
                ))}
              </tr>
            ))
          )}
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
  const rawPatientId =
    summaryParams?.id ?? hubSummaryParams?.id ?? hubBriefParams?.id;
  const patientId = rawPatientId ? Number(rawPatientId) : undefined;

  const contentRef = useRef<HTMLDivElement>(null);

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });

  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 },
  );

  const autorefractometryQuery =
    trpc.medical.getAutorefractometryByPatient.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId), staleTime: 0 },
    );

  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 },
  );
  const afterRefractionQuery =
    trpc.medical.getAfterRefractionByPatient.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId), staleTime: 0 },
    );

  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const prescriptionsQuery =
    trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId) },
    );

  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: patientId ?? 0, limit: 500 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const pentacamFilesQuery =
    trpc.medical.getSrv100DiagnosticImagesByPatient.useQuery(
      { patientId: patientId ?? 0, limit: 500 },
      { enabled: Boolean(patientId), refetchOnWindowFocus: false },
    );
  const medicalHistoryQuery = trpc.medical.getMedicalHistoryByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const examinationChecklistsQuery =
    trpc.medical.getExaminationChecklistsByPatient.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId), refetchOnWindowFocus: false },
    );

  const testRequestsQuery = trpc.medical.getPatientTestRequests?.useQuery?.(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!patientId) return;
    examinationsQuery.refetch();
    visitsQuery.refetch();
    prescriptionsQuery.refetch();
    pentacamQuery.refetch();
    testRequestsQuery?.refetch?.();
  }, [patientId]);

  if (!isAuthenticated) return null;
  if (new URL(location.href).pathname === "/offline")
    return (
      <OfflinePageState
        title="Offline Mode"
        body="Patient summary is not available in offline mode"
      />
    );

  const patient = patientQuery.data as any;
  const examinations = examinationsQuery.data ?? [];

  const parsedExamSources = useMemo(() => {
    if (!Array.isArray(examinations)) return [];

    const autorefMap = new Map<number, any>();
    const glassesMap = new Map<number, any>();
    const afterMap = new Map<number, any>();

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
    if (Array.isArray(afterRefractionQuery.data)) {
      for (const record of afterRefractionQuery.data) {
        afterMap.set(record.examinationId, record);
      }
    }

    return examinations.map((exam) => {
      const autorefRecord = autorefMap.get(exam.id);
      const afterRecord = afterMap.get(exam.id);
      let autorefraction = autorefRecord
        ? {
            od: {
              s: autorefRecord.sphereOD,
              c: autorefRecord.cylinderOD,
              axis: autorefRecord.axisOD,
              ucva: autorefRecord.ucvaOD,
              bcva: autorefRecord.bcvaOD,
              iop: autorefRecord.iopOD,
            },
            os: {
              s: autorefRecord.sphereOS,
              c: autorefRecord.cylinderOS,
              axis: autorefRecord.axisOS,
              ucva: autorefRecord.ucvaOS,
              bcva: autorefRecord.bcvaOS,
              iop: autorefRecord.iopOS,
            },
          }
        : undefined;

      const glassesRecord = glassesMap.get(exam.id);
      let glassesData: any = undefined;
      if (glassesRecord) {
        glassesData = {
          od:
            glassesRecord.sOD || glassesRecord.cOD
              ? {
                  s: glassesRecord.sOD,
                  c: glassesRecord.cOD,
                  axis: glassesRecord.axisOD,
                  pd: glassesRecord.pdOD,
                  add: glassesRecord.addOD,
                  bcva: glassesRecord.bcvaOD,
                }
              : undefined,
          os:
            glassesRecord.sOS || glassesRecord.cOS
              ? {
                  s: glassesRecord.sOS,
                  c: glassesRecord.cOS,
                  axis: glassesRecord.axisOS,
                  pd: glassesRecord.pdOS,
                  add: glassesRecord.addOS,
                  bcva: glassesRecord.bcvaOS,
                }
              : undefined,
        };
      }

      const visitDate =
        autorefRecord?.visitDate || glassesRecord?.visitDate || exam?.createdAt;

      return {
        autorefraction,
        after: afterRecord
          ? {
              od: {
                s: afterRecord.sphereOD,
                c: afterRecord.cylinderOD,
                axis: afterRecord.axisOD,
              },
              os: {
                s: afterRecord.sphereOS,
                c: afterRecord.cylinderOS,
                axis: afterRecord.axisOS,
              },
            }
          : undefined,
        glasses: glassesData,
        visitDate,
        fundusOD: exam?.posteriorSegmentOD
          ? parseJson(exam.posteriorSegmentOD)
          : undefined,
        fundusOS: exam?.posteriorSegmentOS
          ? parseJson(exam.posteriorSegmentOS)
          : undefined,
      };
    });
  }, [
    examinations,
    afterRefractionQuery.data,
    autorefractometryQuery.data,
    glassesRecordsQuery.data,
  ]);

  const examinationData = useMemo(() => {
    const rows: any[] = [];
    for (const source of parsedExamSources) {
      if (!source) continue;
      const od = source.autorefraction?.od;
      const os = source.autorefraction?.os;
      const afterOD = source.after?.od;
      const afterOS = source.after?.os;
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
          afterS: afterOD?.s || "-",
          afterC: afterOD?.c || "-",
          afterAxis: afterOD?.axis || "-",
          iop: od.iop || "-",
          fundus: fundusOD
            ? typeof fundusOD === "object"
              ? [
                  fundusOD.discStatus,
                  fundusOD.cupDiscRatio,
                  fundusOD.macuaStatus,
                  fundusOD.vesselStatus,
                  fundusOD.otherFindings,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"
              : fundusOD
            : "-",
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
          afterS: afterOS?.s || "-",
          afterC: afterOS?.c || "-",
          afterAxis: afterOS?.axis || "-",
          iop: os.iop || "-",
          fundus: fundusOS
            ? typeof fundusOS === "object"
              ? [
                  fundusOS.discStatus,
                  fundusOS.cupDiscRatio,
                  fundusOS.macuaStatus,
                  fundusOS.vesselStatus,
                  fundusOS.otherFindings,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"
              : fundusOS
            : "-",
        });
      }
    }
    return rows;
  }, [parsedExamSources]);

  const afterData = useMemo(() => {
    const rows: (string | number)[][] = [];
    parsedExamSources.forEach((source) => {
      const visitDate = formatDate(source.visitDate);
      (["od", "os"] as const).forEach((eyeKey) => {
        const eye = source.after?.[eyeKey];
        if (!eye || ![eye.s, eye.c, eye.axis].some(Boolean)) return;
        rows.push([
          visitDate,
          eyeKey === "od" ? "OD" : "OS",
          eye.s || "—",
          eye.c || "—",
          eye.axis || "—",
        ]);
      });
    });
    return rows;
  }, [parsedExamSources]);

  const glassesRows = useMemo(() => {
    const rows: any[] = [];
    for (const source of parsedExamSources) {
      if (!source?.glasses) continue;
      const visitDate = formatDate(source.visitDate);
      const od = source.glasses?.od;
      const os = source.glasses?.os;
      const hasData =
        (od && [od.s, od.c, od.axis, od.bcva].some(Boolean)) ||
        (os && [os.s, os.c, os.axis, os.pd, os.bcva].some(Boolean));
      if (!hasData) continue;
      rows.push({
        visit: visitDate,
        odS: od?.s || "-",
        odC: od?.c || "-",
        odAx: od?.axis || "-",
        osS: os?.s || "-",
        osC: os?.c || "-",
        osAx: os?.axis || "-",
        osPd: os?.pd || "-",
        add: od?.add || os?.add || "-",
      });
    }
    return rows;
  }, [parsedExamSources]);

  const technicalTrendRows = useMemo(() => {
    const refractionRows = glassesRows.flatMap((row) => [
      [
        row.visit,
        "glassesrecords",
        "OD",
        row.odS,
        row.odC,
        row.odAx,
        "—",
        row.add,
        "—",
      ],
      [
        row.visit,
        "glassesrecords",
        "OS",
        row.osS,
        row.osC,
        row.osAx,
        row.osPd,
        row.add,
        "—",
      ],
    ]);
    const iopRows = examinationData
      .filter((row) => row.iop && row.iop !== "-" && row.iop !== "—")
      .map((row) => [
        row.visitDate,
        "autorefractometrydata",
        row.eye,
        "—",
        "—",
        "—",
        "—",
        "—",
        row.iop,
      ]);
    return [...refractionRows, ...iopRows];
  }, [examinationData, glassesRows]);

  const pentacamMeasurements = useMemo(
    () =>
      Array.isArray(pentacamQuery.data) ? (pentacamQuery.data as any[]) : [],
    [pentacamQuery.data],
  );

  const pentacamRows = useMemo(() => {
    const rows: any[] = [];
    for (const source of pentacamMeasurements) {
      const visitDate = formatDate(source?.visitDate);
      const odData = {
        k1: source?.k1OD ?? source?.keratometryOD,
        k2: source?.k2OD,
        thinnest: source?.thinnestPointOD ?? source?.pachymetryOD,
        apex: source?.apexOD,
        residual: source?.residualOD,
        ttt: source?.tttOD,
        ablation: source?.ablationOD,
      };
      if (
        [
          odData.k1,
          odData.k2,
          odData.thinnest,
          odData.apex,
          odData.residual,
          odData.ttt,
          odData.ablation,
        ].some(Boolean)
      ) {
        rows.push({
          visit: visitDate,
          eye: "OD",
          ...Object.fromEntries(
            Object.entries(odData).map(([k, v]) => [k, v || "-"]),
          ),
        });
      }
      const osData = {
        k1: source?.k1OS ?? source?.keratometryOS,
        k2: source?.k2OS,
        thinnest: source?.thinnestPointOS ?? source?.pachymetryOS,
        apex: source?.apexOS,
        residual: source?.residualOS,
        ttt: source?.tttOS,
        ablation: source?.ablationOS,
      };
      if (
        [
          osData.k1,
          osData.k2,
          osData.thinnest,
          osData.apex,
          osData.residual,
          osData.ttt,
          osData.ablation,
        ].some(Boolean)
      ) {
        rows.push({
          visit: visitDate,
          eye: "OS",
          ...Object.fromEntries(
            Object.entries(osData).map(([k, v]) => [k, v || "-"]),
          ),
        });
      }
    }

    return rows;
  }, [pentacamMeasurements]);

  const patientName = firstNonEmpty(patient?.fullName, "—");

  const medicalHistoryRows = useMemo(() => {
    const rows = Array.isArray(medicalHistoryQuery.data)
      ? (medicalHistoryQuery.data as any[])
      : [];
    return rows.map((row) => [
      formatDate(row.updatedAt ?? row.createdAt),
      row.diabetes ? "نعم" : "لا",
      row.hypertension ? "نعم" : "لا",
      row.heartDisease ? "نعم" : "لا",
      row.asthma ? "نعم" : "لا",
      row.allergies ? "نعم" : "لا",
      row.previousSurgeries || "—",
      row.medications || "—",
      row.familyHistory || "—",
    ]);
  }, [medicalHistoryQuery.data]);

  const symptomRows = useMemo(() => {
    const labels: Array<[string, string]> = [
      ["generalDiseases", "أمراض عامة"],
      ["pregnancyOrLactation", "حمل أو رضاعة"],
      [
        "usesAllergySupplementsSteroidsOrPressureMeds",
        "حساسية أو كورتيزون أو علاج ضغط",
      ],
      ["acneTreatment", "علاج حب الشباب"],
      ["familyKeratoconus", "تاريخ عائلي للقرنية المخروطية"],
      [
        "usesTearSubstituteOrExcessTearsOrSandySensation",
        "جفاف أو دموع زائدة أو إحساس بالرمل",
      ],
      ["symptomsWorseWithAirOrAC", "تزداد مع الهواء أو التكييف"],
      ["glaucomaTreatment", "علاج الجلوكوما"],
    ];
    const rows = Array.isArray(examinationChecklistsQuery.data)
      ? (examinationChecklistsQuery.data as any[])
      : [];
    const checklistRows = rows.map((row) => [
      formatDate(row.visitDate ?? row.updatedAt ?? row.createdAt),
      labels
        .filter(([key]) => Boolean(row[key]))
        .map(([, label]) => label)
        .join("، ") || "—",
    ]);
    return checklistRows;
  }, [examinationChecklistsQuery.data]);

  const diagnosticTestRows = useMemo(() => {
    const requests = Array.isArray(testRequestsQuery?.data)
      ? (testRequestsQuery.data as any[])
      : [];
    return requests.flatMap((request) =>
      (request.items ?? []).map((test: any) => [
        formatDate(request.requestDate ?? request.createdAt),
        test.testName || "—",
        test.result || "—",
        request.status || "—",
      ]),
    );
  }, [testRequestsQuery?.data]);

  const treatmentPlanRows = useMemo(() => {
    const rows = Array.isArray(prescriptionsQuery.data)
      ? (prescriptionsQuery.data as any[])
      : [];
    return rows.flatMap((prescription) =>
      (prescription.items ?? []).map((item: any) => [
        formatDate(prescription.prescriptionDate),
        item.medicationName || "—",
        item.dosage || "—",
        item.frequency || "—",
        item.duration || "—",
        item.instructions || prescription.notes || "—",
      ]),
    );
  }, [prescriptionsQuery.data]);

  const hasHistory = medicalHistoryRows.length > 0;
  const hasPrescriptions = treatmentPlanRows.length > 0;

  const tocSections = useMemo<TocSection[]>(
    () =>
      [
        { id: "basic", label: "البيانات الأساسية", show: true },
        { id: "symptoms", label: "Symptoms", show: true },
        { id: "history", label: "Medical History", show: true },
        {
          id: "examinations",
          label: "Autoref / IOP",
          show: true,
        },
        { id: "after", label: "After", show: true },
        {
          id: "glasses",
          label: "Clinical Refraction",
          show: true,
        },
        {
          id: "trends",
          label: "Technical Trends",
          show: true,
        },
        {
          id: "pentacam",
          label: "Pentacam HR Analysis",
          show: true,
        },
        {
          id: "topography",
          label: "Corneal Topography",
          show: true,
        },
        {
          id: "imaging",
          label: "Diagnostic Imaging",
          show: true,
        },
        {
          id: "tests",
          label: "Diagnostic Tests",
          show: true,
        },
        {
          id: "prescriptions",
          label: "Treatment Plan",
          show: true,
        },
        { id: "visits", label: "الزيارات", show: true },
      ].filter((s) => s.show),
    [
      hasHistory,
      symptomRows.length,
      examinationData.length,
      afterData.length,
      glassesRows.length,
      technicalTrendRows.length,
      pentacamRows.length,
      pentacamFilesQuery.data,
      diagnosticTestRows.length,
      hasPrescriptions,
    ],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/10" dir="rtl">
      <header className="z-20 shrink-0 border-b border-border bg-background print:border-b-2">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 print:hidden"
            onClick={() => goBack()}
            aria-label="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
              <ClipboardCheck className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  التقرير الملخص
                </h1>
                <span
                  className="truncate text-sm text-muted-foreground"
                  dir="auto"
                >
                  {patientName}
                </span>
                {patient?.patientCode && (
                  <span
                    dir="ltr"
                    className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                  >
                    {patient.patientCode as string}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {patient?.age && <span>العمر: {String(patient.age)} سنة</span>}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {visitsQuery.data?.length ?? 0} زيارة
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {examinations.length} كشف
                </span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            className="shrink-0 gap-1.5 print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" aria-hidden />
            طباعة التقرير
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[210px] shrink-0 border-e border-border bg-background lg:block print:hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <ListTree className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold">محتويات التقرير</p>
          </div>
          <nav className="space-y-0.5 p-2" aria-label="محتويات التقرير الملخص">
            {tocSections.map((section, index) => (
              <a
                key={section.id}
                href={`#sum-${section.id}`}
                className="flex min-h-9 items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-[10px]"
                  dir="ltr"
                >
                  {index + 1}
                </span>
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <main ref={contentRef} className="flex-1 overflow-y-auto">
          <article className="mx-auto w-full max-w-5xl space-y-8 bg-background px-4 py-6 pb-16 sm:px-6 lg:my-5 lg:border lg:border-border lg:px-8 print:my-0 print:max-w-none print:space-y-6 print:border-0 print:px-6 print:py-4">
            {/* البيانات الأساسية */}
            <section id="sum-basic" className="scroll-mt-4">
              <SectionHeading id="basic" label="البيانات الأساسية" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {[
                  { label: "الاسم", value: patientName },
                  {
                    label: "رقم المريض",
                    value: patient?.patientCode ?? "—",
                    mono: true,
                  },
                  { label: "الهاتف", value: patient?.phone ?? "—", mono: true },
                  { label: "العنوان", value: patient?.address ?? "—" },
                  {
                    label: "تاريخ الميلاد",
                    value: formatDate(patient?.dateOfBirth),
                    mono: true,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-0.5 text-sm font-medium text-foreground",
                        item.mono && "font-mono",
                      )}
                      dir="auto"
                    >
                      {item.value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {
              <section id="sum-symptoms" className="scroll-mt-4">
                <SectionHeading id="symptoms" label="Symptoms" />
                <DataTable
                  headers={["تاريخ الزيارة", "الأعراض المسجلة"]}
                  rows={symptomRows}
                />
              </section>
            }

            {/* التاريخ المرضي */}
            {
              <section id="sum-history" className="scroll-mt-4">
                <SectionHeading id="history" label="Medical History" />
                <DataTable
                  headers={[
                    "التاريخ",
                    "سكري",
                    "ضغط",
                    "قلب",
                    "ربو",
                    "حساسية",
                    "عمليات سابقة",
                    "أدوية",
                    "تاريخ عائلي",
                  ]}
                  rows={medicalHistoryRows}
                />
              </section>
            }

            {/* القياسات */}
            {
              <section id="sum-examinations" className="scroll-mt-4">
                <SectionHeading id="examinations" label="Autoref / IOP" />
                <DataTable
                  headers={[
                    "التاريخ",
                    "العين",
                    "UCVA",
                    "BCVA",
                    "S",
                    "C",
                    "Axis",
                    "IOP",
                  ]}
                  rows={examinationData.map((r) => [
                    r.visitDate,
                    r.eye,
                    r.ucva,
                    r.bcva,
                    r.s,
                    r.c,
                    r.axis,
                    r.iop,
                  ])}
                />
              </section>
            }

            {
              <section id="sum-after" className="scroll-mt-4">
                <SectionHeading id="after" label="After" />
                <DataTable
                  headers={["التاريخ", "العين", "S", "C", "Axis"]}
                  rows={afterData}
                />
              </section>
            }

            {/* النظارة */}
            {
              <section id="sum-glasses" className="scroll-mt-4">
                <SectionHeading id="glasses" label="Clinical Refraction" />
                <DataTable
                  headers={[
                    "التاريخ",
                    "OD S",
                    "OD C",
                    "OD Ax",
                    "OS S",
                    "OS C",
                    "OS Ax",
                    "OS PD",
                    "Add",
                  ]}
                  rows={glassesRows.map((r) => [
                    r.visit,
                    r.odS,
                    r.odC,
                    r.odAx,
                    r.osS,
                    r.osC,
                    r.osAx,
                    r.osPd,
                    r.add,
                  ])}
                />
              </section>
            }

            {
              <section id="sum-trends" className="scroll-mt-4">
                <SectionHeading
                  id="trends"
                  label="Technical Trends: Refraction and IOP"
                />
                <DataTable
                  headers={[
                    "التاريخ",
                    "المصدر",
                    "العين",
                    "S",
                    "C",
                    "Axis",
                    "PD",
                    "Add",
                    "IOP",
                  ]}
                  rows={technicalTrendRows}
                />
              </section>
            }

            {/* بنتاكام */}
            {
              <section id="sum-pentacam" className="scroll-mt-4">
                <SectionHeading id="pentacam" label="Pentacam HR Analysis" />
                <DataTable
                  headers={[
                    "التاريخ",
                    "العين",
                    "Thinnest",
                    "Apex",
                    "Residual",
                    "TTT",
                    "Ablation",
                  ]}
                  rows={pentacamRows.map((r) => [
                    r.visit,
                    r.eye,
                    r.thinnest,
                    r.apex,
                    r.residual,
                    r.ttt,
                    r.ablation,
                  ])}
                />
              </section>
            }

            {
              <section id="sum-topography" className="scroll-mt-4">
                <SectionHeading id="topography" label="Corneal Topography" />
                <DataTable
                  headers={["التاريخ", "العين", "K1", "K2", "Thinnest"]}
                  rows={pentacamRows.map((row) => [
                    row.visit,
                    row.eye,
                    row.k1,
                    row.k2,
                    row.thinnest,
                  ])}
                />
              </section>
            }

            {
              <section id="sum-imaging" className="scroll-mt-4">
                <SectionHeading id="imaging" label="Diagnostic Imaging" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
                  {(pentacamFilesQuery.data ?? []).length === 0 ? (
                    <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                      لا توجد صور محفوظة في srv100_uploads
                    </p>
                  ) : (
                    (pentacamFilesQuery.data ?? []).map((file: any) => (
                      <figure
                        key={file.id}
                        className="overflow-hidden rounded-lg border border-border"
                      >
                        <img
                          src={file.storageUrl}
                          alt={file.sourceFileName || "Diagnostic Imaging"}
                          className="aspect-[4/3] w-full object-contain"
                          loading="lazy"
                        />
                        <figcaption
                          className="px-3 py-2 text-xs text-muted-foreground"
                          dir="auto"
                        >
                          {file.sourceFileName || "Diagnostic Imaging"}
                        </figcaption>
                      </figure>
                    ))
                  )}
                </div>
              </section>
            }

            {/* الأشعات والتحاليل */}
            {
              <section id="sum-tests" className="scroll-mt-4">
                <SectionHeading id="tests" label="Diagnostic Tests" />
                <DataTable
                  headers={["التاريخ", "الفحص", "النتيجة", "الحالة"]}
                  rows={diagnosticTestRows}
                />
              </section>
            }

            {/* الروشتة والعلاج */}
            {
              <section id="sum-prescriptions" className="scroll-mt-4">
                <SectionHeading id="prescriptions" label="Treatment Plan" />
                {treatmentPlanRows.length > 0 && (
                  <DataTable
                    headers={[
                      "التاريخ",
                      "العلاج",
                      "الجرعة",
                      "التكرار",
                      "المدة",
                      "التعليمات",
                    ]}
                    rows={treatmentPlanRows}
                  />
                )}
              </section>
            }

            {/* الزيارات */}
            <section id="sum-visits" className="scroll-mt-4">
              <SectionHeading id="visits" label="الزيارات" />
              {visitsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg bg-muted"
                    />
                  ))}
                </div>
              ) : visitsQuery.isError ? (
                <p className="text-sm text-destructive">
                  خطأ في تحميل الزيارات
                </p>
              ) : (visitsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد زيارات مسجّلة
                </p>
              ) : (
                (() => {
                  const visitsByDate = new Map<string, any[]>();
                  const sorted = [...(visitsQuery.data ?? [])].sort(
                    (a, b) =>
                      new Date(b.visitDate).getTime() -
                      new Date(a.visitDate).getTime(),
                  );
                  sorted.forEach((visit) => {
                    const key = formatDate(visit.visitDate);
                    if (!visitsByDate.has(key)) visitsByDate.set(key, []);
                    visitsByDate.get(key)!.push(visit);
                  });
                  return (
                    <div className="space-y-4">
                      {Array.from(visitsByDate.entries()).map(
                        ([date, visits]) => (
                          <div key={date}>
                            <div className="mb-2 flex items-center gap-2">
                              <span
                                className="rounded bg-muted text-muted-foreground"
                                dir="auto"
                              >
                                {date}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({visits.length})
                              </span>
                            </div>
                            <ul className="space-y-1.5">
                              {visits.map((visit) => (
                                <li
                                  key={visit.id}
                                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5 text-sm"
                                >
                                  <span
                                    className="font-medium text-foreground"
                                    dir="auto"
                                  >
                                    {formatDisplayValue(
                                      visit.visitType || "زيارة",
                                    )}
                                  </span>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span dir="auto">
                                      {new Date(
                                        visit.visitDate,
                                      ).toLocaleTimeString("ar-EG", {
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
                        ),
                      )}
                    </div>
                  );
                })()
              )}
            </section>
          </article>
        </main>
      </div>
    </div>
  );
}
