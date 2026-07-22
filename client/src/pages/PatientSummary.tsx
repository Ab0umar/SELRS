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

type RefractionEyeValues = {
  s?: unknown;
  c?: unknown;
  axis?: unknown;
  ucva?: unknown;
  bcva?: unknown;
  iop?: unknown;
  pd?: unknown;
  add?: unknown;
};

function RefractionReportTable({
  title,
  visitDate,
  od,
  os,
  showReading = false,
  metrics = [],
  showIpd = false,
}: {
  title: string;
  visitDate: string;
  od: RefractionEyeValues;
  os: RefractionEyeValues;
  showReading?: boolean;
  metrics?: Array<"ucva" | "bcva" | "iop">;
  showIpd?: boolean;
}) {
  const shown = (value: unknown, fallback = "—") => {
    const text = String(value ?? "").trim();
    return text && text !== "-" ? text : fallback;
  };

  return (
    <div className="patient-summary-refraction-block break-inside-avoid-page">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500" dir="rtl">
          {visitDate}
        </span>
        {metrics.length > 0 && (
          <div
            className="flex flex-1 items-center justify-center gap-5 border-b border-[#b8c7dc] pb-1 text-center text-[11px] font-bold uppercase tracking-wide text-[#003d9b]"
            dir="ltr"
          >
            {metrics.includes("ucva") && (
              <span>
                UCVA {shown(od.ucva, ".........")} /{" "}
                {shown(os.ucva, ".........")}
              </span>
            )}
            {metrics.includes("bcva") && (
              <span>
                BCVA {shown(od.bcva, ".........")} /{" "}
                {shown(os.bcva, ".........")}
              </span>
            )}
            {metrics.includes("iop") && (
              <span>
                IOP {shown(od.iop, ".........")} / {shown(os.iop, ".........")}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className="overflow-hidden rounded border border-[#c3c6d6]"
        dir="ltr"
      >
        <table className="w-full table-fixed border-collapse text-center text-[11px]">
          <thead>
            <tr className="border-b border-[#b8c7dc] bg-[#eaf1fa] text-[#003d9b]">
              <th className="w-[18%] border-e border-[#c3c6d6] px-3 py-2">
                {title}
              </th>
              <th
                colSpan={3}
                className="border-e border-[#c3c6d6] px-3 py-2 text-center"
              >
                OD
              </th>
              <th
                colSpan={3}
                className="border-e border-[#c3c6d6] px-3 py-2 text-center"
              >
                OS
              </th>
              {showIpd && <th className="w-[12%] px-3 py-2" />}
            </tr>
            <tr className="border-b border-[#b8c7dc] bg-[#eaf1fa] text-[#003d9b]">
              <th className="border-e border-[#c3c6d6] px-3 py-2">Distance</th>
              {["S", "C", "A", "S", "C", "A"].map((label, index) => (
                <th
                  key={`${label}-${index}`}
                  className="border-e border-[#c3c6d6] px-3 py-2"
                >
                  {label}
                </th>
              ))}
              {showIpd && <th className="px-3 py-2">IPD</th>}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#003d9b]/[0.04]">
              <td className="border-e border-[#c3c6d6] px-3 py-2">&nbsp;</td>
              {[od.s, od.c, od.axis, os.s, os.c, os.axis].map(
                (value, index) => (
                  <td
                    key={index}
                    className="border-e border-[#c3c6d6] px-3 py-2 font-mono"
                  >
                    {shown(value)}
                  </td>
                ),
              )}
              {showIpd && (
                <td className="px-3 py-2 font-mono">
                  {[od.pd, os.pd]
                    .map((value) => shown(value, ""))
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </td>
              )}
            </tr>
            {showReading && (
              <tr className="border-t border-[#c3c6d6]">
                <td className="border-e border-[#c3c6d6] px-3 py-3 font-bold text-[#003d9b]">
                  Reading
                </td>
                <td colSpan={showIpd ? 7 : 6} className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-bold">Add +</span>
                    <span className="min-w-24 text-center font-bold">
                      {[od.add, os.add]
                        .map((value) => shown(value, ""))
                        .filter(Boolean)
                        .join(" / ") || " "}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PentacamReportTable({
  visitDate,
  od,
  os,
}: {
  visitDate: string;
  od?: Record<string, unknown>;
  os?: Record<string, unknown>;
}) {
  const shown = (value: unknown) => {
    const text = String(value ?? "").trim();
    return text && text !== "-" ? text : "—";
  };
  const metrics = [
    ["K1", "k1"],
    ["K2", "k2"],
    ["AX", "axis"],
    ["Thin", "thinnest"],
    ["Apex", "apex"],
    ["Residual", "residual"],
    ["TTT", "ttt"],
    ["Ablation", "ablation"],
  ] as const;

  return (
    <div className="patient-summary-refraction-block break-inside-avoid-page">
      <p className="mb-2 text-xs font-semibold text-slate-500" dir="rtl">
        {visitDate}
      </p>
      <div
        className="overflow-x-auto rounded border border-[#c3c6d6]"
        dir="ltr"
      >
        <table className="w-full min-w-[850px] table-fixed border-collapse text-center text-[10px] print:min-w-0 print:text-[7px]">
          <thead>
            <tr className="border-b border-[#b8c7dc] bg-[#eaf1fa] text-[#003d9b]">
              <th className="w-[11%] border-e border-[#b8c7dc] px-2 py-2">
                Pentacam
              </th>
              <th colSpan={8} className="border-e border-[#b8c7dc] px-2 py-2">
                OD
              </th>
              <th colSpan={8} className="px-2 py-2">
                OS
              </th>
            </tr>
            <tr className="border-b border-[#b8c7dc] bg-[#eaf1fa] text-[#003d9b]">
              <th
                className="border-e border-[#b8c7dc] px-2 py-2"
                aria-label="Pentacam values"
              />
              {[...metrics, ...metrics].map(([label, key], index) => (
                <th
                  key={`${key}-${index}`}
                  className="border-e border-[#b8c7dc] px-1 py-2 last:border-e-0"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#003d9b]/[0.04]">
              <td className="border-e border-[#c3c6d6] px-2 py-2">&nbsp;</td>
              {metrics.map(([, key]) => (
                <td
                  key={`od-${key}`}
                  className="border-e border-[#c3c6d6] px-1 py-2 font-mono"
                >
                  {shown(od?.[key])}
                </td>
              ))}
              {metrics.map(([, key], index) => (
                <td
                  key={`os-${key}`}
                  className={`px-1 py-2 font-mono ${index < metrics.length - 1 ? "border-e border-[#c3c6d6]" : ""}`}
                >
                  {shown(os?.[key])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionHeading({ id, label }: { id: string; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-[#b8c7dc] pb-2">
      <h2
        id={`sum-${id}`}
        className="scroll-mt-20 shrink-0 text-base font-bold text-[#003d9b]"
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
      className="patient-summary-data-table overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white my-1"
      dir="ltr"
    >
      <table className="w-full border-collapse text-center text-xs" dir="ltr">
        <thead>
          <tr className="border-b border-[#b8c7dc] bg-[#eaf1fa] font-bold text-[#003d9b]">
            {headers.map((h, idx) => (
              <th
                key={`${h}-${idx}`}
                className="border-x border-[#b8c7dc] px-3 py-2.5 text-center text-[11px] font-bold tracking-wide first:border-l-0 last:border-r-0 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-xs text-slate-400 font-medium italic"
              >
                لا توجد بيانات محفوظة في الجدول
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-blue-50/40 transition-colors odd:bg-white even:bg-slate-50/50"
              >
                {row.map((cell, j) => {
                  const val = formatDisplayValue(cell);
                  const isEyeOD = val === "OD";
                  const isEyeOS = val === "OS";
                  return (
                    <td
                      key={j}
                      className="px-3 py-2 font-mono text-xs text-slate-700 text-center whitespace-nowrap align-middle border-x border-slate-100 first:border-l-0 last:border-r-0"
                      dir="ltr"
                    >
                      {isEyeOD ? (
                        <span className="inline-block rounded bg-blue-100 text-blue-800 font-bold px-2 py-0.5 text-[10px]">
                          OD
                        </span>
                      ) : isEyeOS ? (
                        <span className="inline-block rounded bg-blue-100 text-blue-800 font-bold px-2 py-0.5 text-[10px]">
                          OS
                        </span>
                      ) : (
                        val || "—"
                      )}
                    </td>
                  );
                })}
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
        odBcva: od?.bcva || "-",
        odPd: od?.pd || "-",
        odAdd: od?.add || "-",
        osS: os?.s || "-",
        osC: os?.c || "-",
        osAx: os?.axis || "-",
        osBcva: os?.bcva || "-",
        osPd: os?.pd || "-",
        osAdd: os?.add || "-",
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
        axis: source?.axisOD,
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
          odData.axis,
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
        axis: source?.axisOS,
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
          osData.axis,
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

  const pentacamByVisit = useMemo(() => {
    type PentacamVisitGroup = {
      visitDate: string;
      od?: Record<string, unknown>;
      os?: Record<string, unknown>;
    };
    const grouped = new Map<string, PentacamVisitGroup>();
    for (const row of pentacamRows) {
      const entry: PentacamVisitGroup = grouped.get(row.visit) ?? {
        visitDate: row.visit,
      };
      if (row.eye === "OD") entry.od = row;
      if (row.eye === "OS") entry.os = row;
      grouped.set(row.visit, entry);
    }
    return Array.from(grouped.values());
  }, [pentacamRows]);

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
      row.thyroid ? "نعم" : "لا",
      row.autoimmune ? "نعم" : "لا",
      row.glaucoma ? "نعم" : "لا",
      row.familyKeratoconus ? "نعم" : "لا",
      row.previousSurgeries || "—",
      row.medications || "—",
      row.familyHistory || "—",
    ]);
  }, [medicalHistoryQuery.data]);

  const symptomRows = useMemo(() => {
    const rowsMap = new Map<string, Set<string>>();

    // 1. From visits (chiefComplaint)
    if (Array.isArray(visitsQuery.data)) {
      for (const v of visitsQuery.data as any[]) {
        const text = String(v.chiefComplaint || v.notes || "").trim();
        if (text) {
          const dateKey = formatDate(v.visitDate || v.createdAt);
          if (!rowsMap.has(dateKey)) rowsMap.set(dateKey, new Set());
          rowsMap.get(dateKey)!.add(text);
        }
      }
    }

    // 2. From examinations (chiefComplaint / symptoms)
    if (Array.isArray(examinations)) {
      for (const exam of examinations as any[]) {
        const text = String(
          exam.chiefComplaint || exam.symptoms || exam.notes || "",
        ).trim();
        if (text) {
          const dateKey = formatDate(exam.visitDate || exam.createdAt);
          if (!rowsMap.has(dateKey)) rowsMap.set(dateKey, new Set());
          rowsMap.get(dateKey)!.add(text);
        }
      }
    }

    // 3. From examinationChecklists (checklist fields)
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
    if (Array.isArray(examinationChecklistsQuery.data)) {
      for (const row of examinationChecklistsQuery.data as any[]) {
        const dateKey = formatDate(
          row.visitDate ?? row.updatedAt ?? row.createdAt,
        );
        const text = labels
          .filter(([key]) => Boolean(row[key]))
          .map(([, label]) => label)
          .join("، ");
        if (text) {
          if (!rowsMap.has(dateKey)) rowsMap.set(dateKey, new Set());
          rowsMap.get(dateKey)!.add(text);
        }
      }
    }

    const result: (string | number)[][] = [];
    rowsMap.forEach((symptomsSet, dateKey) => {
      result.push([dateKey, Array.from(symptomsSet).join(" • ")]);
    });
    return result;
  }, [visitsQuery.data, examinations, examinationChecklistsQuery.data]);

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
        {
          id: "symptoms",
          label: "الأعراض (Symptoms)",
          show: symptomRows.length > 0,
        },
        {
          id: "history",
          label: "التاريخ المرضي (Medical History)",
          show: hasHistory,
        },
        {
          id: "examinations",
          label: "القياسات (Autoref / IOP)",
          show: examinationData.length > 0,
        },
        {
          id: "after",
          label: "القياسات البعدية (After Refraction)",
          show: afterData.length > 0,
        },
        {
          id: "glasses",
          label: "مقاس النظارة (Clinical Refraction)",
          show: glassesRows.length > 0,
        },
        {
          id: "pentacam",
          label: "البنتاكام والقرنية (Pentacam & Topography)",
          show: pentacamRows.length > 0,
        },
        {
          id: "tests",
          label: "الفحوصات والأشعة (Diagnostic Tests)",
          show: diagnosticTestRows.length > 0,
        },
        {
          id: "prescriptions",
          label: "الخطة العلاجية (Treatment Plan)",
          show: hasPrescriptions,
        },
      ].filter((s) => s.show),
    [
      hasHistory,
      symptomRows.length,
      examinationData.length,
      afterData.length,
      glassesRows.length,
      pentacamRows.length,
      diagnosticTestRows.length,
      hasPrescriptions,
    ],
  );

  return (
    <div
      className="patient-summary-page flex h-full min-h-0 flex-col bg-muted/10"
      dir="rtl"
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 18mm 12mm 14mm;
        }

        @media print {
          html, body, #root {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          .patient-summary-page {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          .patient-summary-screen-header {
            display: none !important;
          }

          .patient-summary-page main,
          .patient-summary-page > div {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          .patient-summary-print-root {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            font-size: 10pt !important;
          }

          .patient-summary-print-root section {
            scroll-margin: 0 !important;
          }

          .patient-summary-print-root h2 {
            font-size: 11pt !important;
          }

          .patient-summary-data-table {
            overflow: visible !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid-page;
          }

          .patient-summary-data-table table {
            width: 100% !important;
            table-layout: auto !important;
            font-size: 8pt !important;
          }

          .patient-summary-data-table th,
          .patient-summary-data-table td {
            padding: 1.5mm 1mm !important;
            border: 1px solid #cbd5e1 !important;
            white-space: normal !important;
          }

          .patient-summary-print-root button,
          .patient-summary-print-root [role="button"] {
            display: none !important;
          }

          .patient-summary-print-root img {
            max-width: 100% !important;
            max-height: 78mm !important;
            object-fit: contain !important;
          }

          .patient-summary-print-root input,
          .patient-summary-print-root textarea,
          .patient-summary-print-root select {
            border: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          .patient-summary-print-root * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <header className="patient-summary-screen-header z-20 shrink-0 border-b border-border bg-background">
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
          <article className="patient-summary-print-root mx-auto w-full max-w-5xl space-y-8 bg-background px-4 py-6 pb-16 sm:px-6 lg:my-5 lg:border lg:border-border lg:px-8 print:space-y-5">
            <div className="hidden border-b-2 border-[#003d9b] pb-3 print:flex print:items-end print:justify-between">
              <div>
                <h1 className="text-xl font-black text-[#002f6c]">
                  التقرير الملخص | Patient Summary
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  سجل الزيارات والقياسات الطبية
                </p>
              </div>
              <div className="text-left text-xs text-slate-600" dir="rtl">
                <p className="font-bold text-[#002f6c]">{patientName}</p>
                <p dir="ltr">{patient?.patientCode ?? "—"}</p>
              </div>
            </div>
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
                  {
                    label: "موبايل 2",
                    value: patient?.alternatePhone ?? "—",
                    mono: true,
                  },
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
            <section id="sum-history" className="scroll-mt-4">
              <SectionHeading
                id="history"
                label="التاريخ المرضي (Medical History)"
              />
              {medicalHistoryRows.length > 0 && (
                <DataTable
                  headers={[
                    "التاريخ",
                    "سكري",
                    "ضغط",
                    "قلب",
                    "ربو",
                    "حساسية",
                    "غدة",
                    "مناعة",
                    "ماء زرقاء",
                    "قرنية مخروطية",
                    "عمليات سابقة",
                    "أدوية",
                    "تاريخ عائلي",
                  ]}
                  rows={medicalHistoryRows}
                />
              )}
            </section>

            {/* القياسات */}
            {
              <section id="sum-examinations" className="scroll-mt-4">
                <SectionHeading id="examinations" label="Autoref / IOP" />
                <div className="space-y-5">
                  {parsedExamSources.map((source, index) => (
                    <RefractionReportTable
                      key={`autoref-${formatDate(source.visitDate)}-${index}`}
                      title="Autoref"
                      visitDate={formatDate(source.visitDate)}
                      od={source.autorefraction?.od ?? {}}
                      os={source.autorefraction?.os ?? {}}
                      metrics={["ucva", "iop"]}
                    />
                  ))}
                </div>
              </section>
            }

            {
              <section id="sum-after" className="scroll-mt-4">
                <SectionHeading id="after" label="After" />
                <div className="space-y-5">
                  {parsedExamSources
                    .filter((source) => source.after?.od || source.after?.os)
                    .map((source, index) => (
                      <RefractionReportTable
                        key={`after-${formatDate(source.visitDate)}-${index}`}
                        title="After"
                        visitDate={formatDate(source.visitDate)}
                        od={source.after?.od ?? {}}
                        os={source.after?.os ?? {}}
                      />
                    ))}
                </div>
              </section>
            }

            {/* النظارة */}
            {
              <section id="sum-glasses" className="scroll-mt-4">
                <SectionHeading id="glasses" label="Clinical Refraction" />
                <div className="space-y-5">
                  {glassesRows.map((row, index) => (
                    <RefractionReportTable
                      key={`glasses-${row.visit}-${index}`}
                      title="Refraction"
                      visitDate={row.visit}
                      od={{
                        s: row.odS,
                        c: row.odC,
                        axis: row.odAx,
                        bcva: row.odBcva,
                        pd: row.odPd,
                        add: row.odAdd,
                      }}
                      os={{
                        s: row.osS,
                        c: row.osC,
                        axis: row.osAx,
                        bcva: row.osBcva,
                        pd: row.osPd,
                        add: row.osAdd,
                      }}
                      showReading
                      metrics={["bcva"]}
                      showIpd
                    />
                  ))}
                </div>
              </section>
            }

            {/* بنتاكام وتضاريس القرنية (دمج الجدولين المكررين) */}
            {pentacamRows.length > 0 && (
              <section id="sum-pentacam" className="scroll-mt-4">
                <SectionHeading
                  id="pentacam"
                  label="البنتاكام وتضاريس القرنية (Pentacam & Corneal Topography)"
                />
                <div className="space-y-5">
                  {pentacamByVisit.map((entry, index) => (
                    <PentacamReportTable
                      key={`pentacam-${entry.visitDate}-${index}`}
                      visitDate={entry.visitDate}
                      od={entry.od}
                      os={entry.os}
                    />
                  ))}
                </div>
              </section>
            )}

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
          </article>
        </main>
      </div>
    </div>
  );
}
