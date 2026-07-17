import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import {
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  Image as ImageIcon,
  Pill,
  ScanEye,
  Stethoscope,
} from "lucide-react";
import PatientPicker from "@/components/PatientPicker";
import { UnifiedRefractionTable } from "@/components/medical/UnifiedRefractionTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  firstNonEmpty,
  formatDate,
  formatDisplayValue,
  usePatientDetails,
} from "@/hooks/patient-details/usePatientDetails";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type ClinicalPortalProps = {
  mode: "file" | "report";
};

type EyeRow = {
  eye: string;
  ucva?: unknown;
  bcva?: unknown;
  s?: unknown;
  c?: unknown;
  axis?: unknown;
  iop?: unknown;
  pd?: unknown;
  add?: unknown;
};

type MetricRow = {
  label: string;
  od?: unknown;
  os?: unknown;
  unit?: string;
};

const fieldLabels: Record<string, string> = {
  k1: "K1",
  k2: "K2",
  thinnest: "Thinnest",
  apex: "Apex",
  residual: "Residual",
  ttt: "TTT",
  ablation: "Ablation",
};

const opticalFields = [
  { key: "s", label: "S" },
  { key: "c", label: "C" },
  { key: "axis", label: "A" },
];

function sourceEye(
  source: any,
  key: "autorefraction" | "after" | "glasses",
  eye: "od" | "os",
) {
  return source?.[key]?.[eye] ?? {};
}

function hasRefractionSource(
  source: any,
  type: "autorefraction" | "after" | "glasses",
) {
  return (["od", "os"] as const).some((eye) =>
    Object.values(sourceEye(source, type, eye)).some(
      (value) => value !== null && value !== undefined && value !== "",
    ),
  );
}

function RefractionSourceTable({
  source,
  type,
  date,
}: {
  source: any;
  type: "autorefraction" | "after" | "glasses";
  date?: ReactNode;
}) {
  const od = sourceEye(source, type, "od");
  const os = sourceEye(source, type, "os");
  if (type === "autorefraction") {
    return (
      <UnifiedRefractionTable
        title="Autoref"
        fields={[
          ...opticalFields,
          { key: "ucva", label: "UCVA" },
          { key: "iop", label: "IOP" },
        ]}
        od={od}
        os={os}
        date={date}
      />
    );
  }
  if (type === "after") {
    return (
      <UnifiedRefractionTable
        title="After"
        fields={opticalFields}
        od={od}
        os={os}
        date={date}
      />
    );
  }
  return (
    <UnifiedRefractionTable
      title="Refraction"
      fields={[...opticalFields, { key: "bcva", label: "BCVA" }]}
      od={od}
      os={os}
      trailing={[{ label: "IPD", value: od.pd || os.pd }]}
      reading={od.add || os.add}
      date={date}
    />
  );
}

function readable(value: unknown, fallback = "—") {
  const text = formatDisplayValue(value).trim();
  return text || fallback;
}

function dateValue(value: unknown) {
  const formatted = formatDate(value as string | Date | null | undefined);
  return formatted === "—" ? "" : formatted;
}

function sortByDateDesc<T>(items: T[], getValue: (item: T) => unknown) {
  return [...items].sort((a, b) => {
    const at = new Date(String(getValue(a) ?? "")).valueOf();
    const bt = new Date(String(getValue(b) ?? "")).valueOf();
    return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
  });
}

function compactText(...values: unknown[]) {
  return values
    .map((value) => readable(value, ""))
    .filter(Boolean)
    .join(" · ");
}

function buildEyeRows(source: any): EyeRow[] {
  const build = (key: "od" | "os", eye: "OD" | "OS") => {
    const row = source?.autorefraction?.[key] ?? {};
    return {
      eye,
      ucva: row.ucva,
      bcva: row.bcva,
      s: row.s,
      c: row.c,
      axis: row.axis,
      iop: row.iop,
    };
  };
  return [build("od", "OD"), build("os", "OS")].filter((row) =>
    [row.ucva, row.bcva, row.s, row.c, row.axis, row.iop].some(
      (value) => readable(value, "") !== "",
    ),
  );
}

function buildGlassesRows(source: any): EyeRow[] {
  const build = (key: "od" | "os", eye: "OD" | "OS") => {
    const row = source?.glasses?.[key] ?? {};
    return {
      eye,
      s: row.s,
      c: row.c,
      axis: row.axis,
      bcva: row.bcva,
      pd: row.pd,
      add: row.add,
    };
  };
  return [build("od", "OD"), build("os", "OS")].filter((row) =>
    [row.s, row.c, row.axis, row.bcva, row.pd, row.add].some(
      (value) => readable(value, "") !== "",
    ),
  );
}

function buildPentacamMetrics(rows: any[]): MetricRow[] {
  const od = rows.find((row) => row.eye === "OD") ?? {};
  const os = rows.find((row) => row.eye === "OS") ?? {};
  return Object.keys(fieldLabels)
    .map((key) => ({
      label: fieldLabels[key],
      od: od[key],
      os: os[key],
    }))
    .filter(
      (row) => readable(row.od, "") !== "" || readable(row.os, "") !== "",
    );
}

function Section({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-background shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function ClinicalTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}) {
  if (rows.length === 0) {
    return <EmptyLine>لا توجد بيانات مسجلة لهذا القسم.</EmptyLine>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead className="bg-muted/60 text-xs font-semibold text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 text-left">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.Date ?? ""}-${row.Eye ?? row.eye ?? row.label ?? index}`}
              className={cn(
                "border-t border-border/70",
                index > 0 &&
                  Boolean(row.Date) &&
                  row.Date !== rows[index - 1]?.Date &&
                  "border-t-4 border-t-primary/35",
              )}
            >
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 align-top tabular-nums">
                  {readable(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PatientHeader({
  patient,
  stats,
  mode,
}: {
  patient: any;
  stats: any;
  mode: "file" | "report";
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-4 shadow-sm md:px-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">
              {mode === "file" ? "ملف الزيارة الحالية" : "تقرير تاريخي"}
            </Badge>
            {stats.status ? (
              <Badge variant="outline">{stats.status}</Badge>
            ) : null}
          </div>
          <h1 className="truncate text-2xl font-extrabold text-foreground">
            {readable(patient?.fullName, "مريض غير محدد")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {compactText(patient?.patientCode, patient?.phone, patient?.mobile)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 md:min-w-[420px]">
          {[
            ["ID", patient?.patientCode],
            ["Age", stats.age],
            ["Gender", stats.gender],
            ["Last Visit", stats.lastVisit],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-md border border-border bg-muted/30 p-2"
            >
              <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1 font-semibold text-foreground">
                {readable(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function PatientFileView({ pd }: { pd: any }) {
  const sources = sortByDateDesc(
    (pd.parsedExamSources ?? []) as any[],
    (item) => item.visitDate,
  );
  const latestSource = sources[0];
  const pentacamMetrics = buildPentacamMetrics(pd.pentacamRows ?? []).map(
    (row) => ({
      Metric: row.label,
      OD: row.od,
      OS: row.os,
    }),
  );
  const latestReport = pd.latestReport ?? {};
  const diagnosis = firstNonEmpty(
    latestReport.diagnosis,
    latestReport.clinicalOpinion,
    pd.overviewData?.history,
  );
  const recommendations = firstNonEmpty(
    latestReport.recommendations,
    latestReport.treatment,
    latestReport.additionalNotes,
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
      <div className="space-y-4">
        <Section title="Autoref + IOP" icon={<Eye className="size-4" />}>
          <RefractionSourceTable source={latestSource} type="autorefraction" />
        </Section>

        <Section title="After Refraction" icon={<ScanEye className="size-4" />}>
          <RefractionSourceTable source={latestSource} type="after" />
        </Section>

        <Section title="Refraction" icon={<ScanEye className="size-4" />}>
          <RefractionSourceTable source={latestSource} type="glasses" />
        </Section>

        <Section
          title="Pentacam HR Analysis"
          icon={<ScanEye className="size-4" />}
        >
          <ClinicalTable
            columns={["Metric", "OD", "OS"]}
            rows={pentacamMetrics}
          />
        </Section>
      </div>

      <div className="space-y-4">
        <Section title="Symptoms" icon={<Stethoscope className="size-4" />}>
          {pd.overviewData?.symptoms?.length ? (
            <div className="flex flex-wrap gap-2">
              {pd.overviewData.symptoms.map((symptom: string) => (
                <Badge key={symptom} variant="outline">
                  {symptom}
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyLine>لا توجد أعراض مسجلة في آخر تقرير.</EmptyLine>
          )}
        </Section>

        <Section title="Medical History" icon={<FileText className="size-4" />}>
          {pd.overviewData?.history ? (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {pd.overviewData.history}
            </p>
          ) : (
            <EmptyLine>لا يوجد تاريخ مرضي مسجل.</EmptyLine>
          )}
        </Section>

        <Section
          title="Diagnostic Tests"
          icon={<ClipboardList className="size-4" />}
        >
          {pd.requestedImagingAndLabs?.length ? (
            <ul className="space-y-2">
              {pd.requestedImagingAndLabs
                .slice(0, 8)
                .map((test: any, index: number) => (
                  <li
                    key={test?.id ?? `${test?.name}-${index}`}
                    className={cn(
                      "rounded-md border border-border bg-muted/20 px-3 py-2 text-sm",
                      index > 0 &&
                        dateValue(test?.requestDate) !==
                          dateValue(
                            pd.requestedImagingAndLabs[index - 1]?.requestDate,
                          ) &&
                        "mt-4 border-t-4 border-t-primary/35",
                    )}
                  >
                    {compactText(
                      test?.name ?? test?.serviceName ?? test?.label,
                      test?.result,
                      test?.status,
                      dateValue(test?.requestDate),
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <EmptyLine>لا توجد طلبات فحوصات أو أشعة مسجلة.</EmptyLine>
          )}
        </Section>

        <Section title="Treatment Plan" icon={<Pill className="size-4" />}>
          {pd.treatmentRows?.length ? (
            <ol className="space-y-2">
              {pd.treatmentRows?.slice(0, 5).map((row: any, index: number) => (
                <li
                  key={`${row.medication}-${index}`}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  {compactText(
                    row.medication,
                    row.dose,
                    row.frequency,
                    row.duration,
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyLine>لا توجد خطة علاج مسجلة.</EmptyLine>
          )}
        </Section>
      </div>
    </div>
  );
}

function DiagnosticImages({ patientId }: { patientId: number }) {
  const uploadsQuery = trpc.medical.getSrv100DiagnosticImagesByPatient.useQuery(
    { patientId, limit: 500 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const images = uploadsQuery.data ?? [];

  if (uploadsQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
      </div>
    );
  }

  if (!images.length) {
    return <EmptyLine>لا توجد صور محفوظة في srv100_uploads.</EmptyLine>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {images.map((image) => (
        <a
          key={image.id}
          href={image.storageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="overflow-hidden rounded-lg border border-border bg-muted/20"
        >
          <img
            src={image.storageUrl}
            alt={image.sourceFileName || "صورة بنتاكام"}
            className="h-52 w-full object-cover"
            loading="lazy"
          />
          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            {compactText(
              image.sourceFileName,
              dateValue(image.capturedAt ?? image.importedAt),
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

function PatientReportView({ pd, patientId }: { pd: any; patientId: number }) {
  const sources = sortByDateDesc(
    (pd.parsedExamSources ?? []) as any[],
    (item) => item.visitDate,
  );
  const reports = sortByDateDesc(
    (pd.reports ?? []) as any[],
    (item) => item.createdAt,
  );
  return (
    <div className="space-y-4">
      <Section
        title="Chronological History"
        icon={<CalendarDays className="size-4" />}
      >
        {sources.length ? (
          <div className="flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <Badge key={`${source.visitDate}-${index}`} variant="outline">
                {dateValue(source.visitDate) || "بدون تاريخ"}
              </Badge>
            ))}
          </div>
        ) : (
          <EmptyLine>لا توجد زيارات مسجلة لهذا المريض.</EmptyLine>
        )}
      </Section>

      <Section title="Autoref + IOP" icon={<Eye className="size-4" />}>
        <div className="space-y-5">
          {sources
            .filter((source) => hasRefractionSource(source, "autorefraction"))
            .map((source, index) => (
              <RefractionSourceTable
                key={`autoref-${source.visitDate}-${index}`}
                source={source}
                type="autorefraction"
                date={dateValue(source.visitDate) || "بدون تاريخ"}
              />
            ))}
        </div>
      </Section>

      <Section title="After Refraction" icon={<ScanEye className="size-4" />}>
        <div className="space-y-5">
          {sources
            .filter((source) => hasRefractionSource(source, "after"))
            .map((source, index) => (
              <RefractionSourceTable
                key={`after-${source.visitDate}-${index}`}
                source={source}
                type="after"
                date={dateValue(source.visitDate) || "بدون تاريخ"}
              />
            ))}
        </div>
      </Section>

      <Section title="Refraction" icon={<ScanEye className="size-4" />}>
        <div className="space-y-5">
          {sources
            .filter((source) => hasRefractionSource(source, "glasses"))
            .map((source, index) => (
              <RefractionSourceTable
                key={`glasses-${source.visitDate}-${index}`}
                source={source}
                type="glasses"
                date={dateValue(source.visitDate) || "بدون تاريخ"}
              />
            ))}
        </div>
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Diagnostic Imaging"
          icon={<ImageIcon className="size-4" />}
        >
          <DiagnosticImages patientId={patientId} />
        </Section>

        <Section
          title="Corneal Topography"
          icon={<ScanEye className="size-4" />}
        >
          <ClinicalTable
            columns={["Metric", "OD", "OS"]}
            rows={buildPentacamMetrics(pd.pentacamRows ?? []).map((row) => ({
              Metric: row.label,
              OD: row.od,
              OS: row.os,
            }))}
          />
        </Section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Symptoms" icon={<Stethoscope className="size-4" />}>
          {pd.overviewData?.symptoms?.length ? (
            <div className="flex flex-wrap gap-2">
              {pd.overviewData.symptoms.map((symptom: string) => (
                <Badge key={symptom} variant="outline">
                  {symptom}
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyLine>لا توجد أعراض مسجلة.</EmptyLine>
          )}
        </Section>

        <Section
          title="Diagnostic Tests"
          icon={<ClipboardList className="size-4" />}
        >
          {pd.requestedImagingAndLabs?.length ? (
            <ul className="space-y-2">
              {pd.requestedImagingAndLabs.map((test: any, index: number) => (
                <li
                  key={test?.id ?? `${test?.name}-${index}`}
                  className={cn(
                    "rounded-md border border-border bg-muted/20 px-3 py-2 text-sm",
                    index > 0 &&
                      dateValue(test?.requestDate) !==
                        dateValue(
                          pd.requestedImagingAndLabs[index - 1]?.requestDate,
                        ) &&
                      "mt-4 border-t-4 border-t-primary/35",
                  )}
                >
                  {compactText(
                    test?.name,
                    test?.result,
                    test?.status,
                    dateValue(test?.requestDate),
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyLine>لا توجد طلبات فحوصات أو أشعة مسجلة.</EmptyLine>
          )}
        </Section>
      </div>

      <Section
        title="Assessment and Plan"
        icon={<FileText className="size-4" />}
      >
        {reports.length ? (
          <div className="space-y-3">
            {reports.map((report: any) => (
              <article
                key={report.id}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    {dateValue(report.createdAt) || "بدون تاريخ"}
                  </Badge>
                  {report.doctorName ? <span>{report.doctorName}</span> : null}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {readable(
                    firstNonEmpty(report.diagnosis, report.clinicalOpinion),
                    "تقرير بدون تشخيص نصي",
                  )}
                </p>
                {firstNonEmpty(report.recommendations, report.treatment) ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {firstNonEmpty(report.recommendations, report.treatment)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyLine>لا توجد تقارير طبية مسجلة لهذا المريض.</EmptyLine>
        )}
      </Section>
    </div>
  );
}

export default function ClinicalPortal({ mode }: ClinicalPortalProps) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, fileParams] = useRoute("/patient-file/:id");
  const [, medicalFileParams] = useRoute("/medicalfile/:id");
  const [, reportParams] = useRoute("/medical-reports/:id");
  const [, summaryParams] = useRoute("/patient-summary/:id");
  const rawPatientId =
    fileParams?.id ??
    medicalFileParams?.id ??
    reportParams?.id ??
    summaryParams?.id;
  const patientId = rawPatientId ? Number(rawPatientId) : undefined;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pd = usePatientDetails({
    patientId,
    user,
    isAuthenticated,
    setLocation,
    mode: mode === "file" ? "visit-report" : "clinical-portal",
  });

  const headerStats = useMemo(
    () => ({
      ...pd.overviewStats,
      lastVisit:
        dateValue(pd.parsedExamSources?.[0]?.visitDate) ||
        dateValue(pd.latestReport?.createdAt),
    }),
    [pd.overviewStats, pd.parsedExamSources, pd.latestReport],
  );

  if (!isAuthenticated) return null;

  if (!patientId) {
    return (
      <div className="min-h-full bg-muted/20 p-4 text-left md:p-6" dir="ltr">
        <div className="mx-auto max-w-3xl rounded-lg border border-border bg-background p-5 shadow-sm">
          <h1 className="mb-2 text-xl font-bold">
            {mode === "file" ? "ملف المريض" : "تقرير المريض"}
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">
            اختر مريضاً لعرض البيانات الحية المسجلة في النظام.
          </p>
          <PatientPicker
            onSelect={(patient) =>
              setLocation(
                mode === "file"
                  ? `/patient-file/${patient.id}`
                  : `/patient-summary/${patient.id}`,
              )
            }
          />
        </div>
      </div>
    );
  }

  const loading = pd.patientQuery.isLoading && !pd.patient;

  return (
    <div className="min-h-full bg-muted/20 text-left" dir="ltr">
      <div className="mx-auto max-w-[1440px] space-y-4 p-3 md:p-5">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-lg" />
            <div className="grid gap-4 xl:grid-cols-2">
              <Skeleton className="h-72 rounded-lg" />
              <Skeleton className="h-72 rounded-lg" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <PatientHeader
                  patient={pd.patient}
                  stats={headerStats}
                  mode={mode}
                />
              </div>
              <div className="flex gap-2 print:hidden">
                <Button
                  variant={mode === "file" ? "default" : "outline"}
                  onClick={() => setLocation(`/patient-file/${patientId}`)}
                >
                  ملف الزيارة
                </Button>
                <Button
                  variant={mode === "report" ? "default" : "outline"}
                  onClick={() => setLocation(`/patient-summary/${patientId}`)}
                >
                  التقرير التاريخي
                </Button>
                <Button
                  variant="outline"
                  disabled={isRefreshing}
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await pd.onRefresh();
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                >
                  تحديث
                </Button>
              </div>
            </div>

            {pd.patientQuery.isError ? (
              <Section
                title="حالة البيانات"
                icon={<FileText className="size-4" />}
              >
                <EmptyLine>تعذر تحميل بيانات المريض من الخادم.</EmptyLine>
              </Section>
            ) : mode === "file" ? (
              <PatientFileView pd={pd} />
            ) : (
              <PatientReportView pd={pd} patientId={patientId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
