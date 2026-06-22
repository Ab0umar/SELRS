import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  evaluateMedicalReference,
  findMedicalReference,
  medicalReferenceClass,
  type MedicalReference,
} from "@/lib/medical-reference";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";

const filterTabs = [
  { value: "all", label: "الكل" },
  { value: "OD", label: "RT" },
  { value: "OS", label: "LT" },
  { value: "accepted", label: "مقبول" },
  { value: "repeat", label: "يحتاج تكرار" },
];

const locationFilterTabs = [
  { value: "all", label: "الكل" },
  { value: "center", label: "المركز" },
  { value: "external", label: "الخارجي" },
];

function formatVisitDateAr(value: Date | string | null | undefined): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString("ar-EG");
  }
}

function parsePositiveNumber(value: string): number | undefined {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseInitialQuery(): {
  visitId?: number;
  resultId?: number;
  patientId?: number;
  fromDate?: string;
  toDate?: string;
} {
  try {
    const qs = new URLSearchParams(window.location.search);
    const visitRaw = qs.get("visitId");
    const resultRaw = qs.get("resultId");
    const patientRaw = qs.get("patientId");
    const fromDate = qs.get("fromDate") ?? qs.get("date") ?? undefined;
    const toDate = qs.get("toDate") ?? undefined;
    const visitId =
      visitRaw != null && visitRaw !== "" ? Number(visitRaw) : undefined;
    const resultId =
      resultRaw != null && resultRaw !== "" ? Number(resultRaw) : undefined;
    const patientId =
      patientRaw != null && patientRaw !== "" ? Number(patientRaw) : undefined;
    return {
      visitId: Number.isFinite(visitId) ? visitId : undefined,
      resultId:
        Number.isFinite(resultId) && (resultId ?? 0) > 0 ? resultId : undefined,
      patientId:
        Number.isFinite(patientId) && (patientId ?? 0) > 0
          ? patientId
          : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    };
  } catch {
    return {};
  }
}

type PentacamDashboardRow = {
  resultId: number;
  visitId: number;
  patientId: number;
  patientName: string;
  doctorName: string;
  visitDate: Date | string | null;
  eye: "OD" | "OS";
  k1: string | null;
  k2: string | null;
  axis: string | null;
  thinnest: string | null;
  quality: "accepted" | "repeat";
};

type RowAttention = {
  severity: "normal" | "repeat" | "abnormal";
  reasons: string[];
};

type DashboardEntry = {
  row: PentacamDashboardRow;
  attention: RowAttention;
};

type PatientGroupedRow = {
  patientId: number;
  patientName: string;
  doctorName: string;
  visitDate: Date | string | null;
  entries: Partial<Record<"OD" | "OS", DashboardEntry>>;
  attention: RowAttention;
};

function getPentacamRowAttention(
  row: PentacamDashboardRow,
  refs: {
    k1: MedicalReference | null;
    k2: MedicalReference | null;
    thinnest: MedicalReference | null;
  },
): RowAttention {
  const reasons: string[] = [];

  if (row.quality === "repeat") {
    reasons.push("بحاجة لتكرار");
  }

  const metrics: Array<{
    label: string;
    value: string | null;
    reference: MedicalReference | null;
  }> = [
    { label: "K1", value: row.k1, reference: refs.k1 },
    { label: "K2", value: row.k2, reference: refs.k2 },
    { label: "Thinnest", value: row.thinnest, reference: refs.thinnest },
  ];

  for (const metric of metrics) {
    const state = evaluateMedicalReference(metric.value, metric.reference);
    if (state === "low" || state === "high") {
      reasons.push(`${metric.label} ${state === "low" ? "منخفض" : "مرتفع"}`);
    }
  }

  if (reasons.some((reason) => /منخفض|مرتفع/u.test(reason))) {
    return { severity: "abnormal", reasons };
  }
  if (row.quality === "repeat") {
    return { severity: "repeat", reasons };
  }
  return { severity: "normal", reasons: [] };
}

function formatReasonBadge(reason: string): string {
  return reason.replace(/^Thinnest\b/i, "Thinnest").trim();
}

export type PentacamResultsDashboardProps = {
  embeddedPatientId?: number;
  hidePageChrome?: boolean;
  hubVisitDate?: string;
  patientHubReadOnly?: boolean;
  patientHubViewOnlyHint?: string;
};

export default function PentacamResultsDashboard({
  embeddedPatientId,
  hidePageChrome,
  hubVisitDate,
  patientHubReadOnly = false,
  patientHubViewOnlyHint = "العرض فقط داخل المركز",
}: PentacamResultsDashboardProps = {}) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const initial = useMemo(() => parseInitialQuery(), []);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [visitId, setVisitId] = useState<string>(
    initial.visitId != null ? String(initial.visitId) : "",
  );
  const [resultId, setResultId] = useState<string>(
    initial.resultId != null ? String(initial.resultId) : "",
  );
  const [patientId, setPatientId] = useState<string>(
    initial.patientId != null ? String(initial.patientId) : "",
  );
  const [fromDate, setFromDate] = useState<string>(initial.fromDate ?? "");
  const [toDate, setToDate] = useState<string>(initial.toDate ?? "");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(
    () =>
      initial.visitId != null ||
      initial.resultId != null ||
      initial.patientId != null ||
      Boolean(initial.fromDate) ||
      Boolean(initial.toDate),
  );
  const [viewMode, setViewMode] = useState<"list" | "review">("list");

  const eyeFilter = useMemo(() => {
    if (activeFilter === "OD" || activeFilter === "OS")
      return activeFilter as "OD" | "OS";
    return "all" as const;
  }, [activeFilter]);

  const qualityFilter = useMemo(() => {
    if (activeFilter === "accepted" || activeFilter === "repeat")
      return activeFilter as "accepted" | "repeat";
    return "all" as const;
  }, [activeFilter]);

  const listInput = useMemo(
    () => ({
      search: search.trim() || undefined,
      locationType:
        locationFilter === "center" || locationFilter === "external"
          ? (locationFilter as "center" | "external")
          : undefined,
      visitId: parsePositiveNumber(visitId),
      resultId: parsePositiveNumber(resultId),
      patientId: parsePositiveNumber(patientId),
      fromDate: fromDate.trim() || undefined,
      toDate: toDate.trim() || undefined,
      eye: eyeFilter,
      quality: qualityFilter,
      limit: 200,
      offset: 0,
    }),
    [
      search,
      locationFilter,
      visitId,
      resultId,
      patientId,
      fromDate,
      toDate,
      eyeFilter,
      qualityFilter,
    ],
  );

  const listQuery = trpc.medical.listPentacamDashboard.useQuery(listInput, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const statsQuery = trpc.medical.getPentacamDashboardStats.useQuery(
    locationFilter === "center" || locationFilter === "external"
      ? { locationType: locationFilter as "center" | "external" }
      : undefined,
    {
      enabled: isAuthenticated,
      refetchOnWindowFocus: false,
    },
  );

  const refsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (embeddedPatientId != null && embeddedPatientId > 0) {
      setPatientId(String(embeddedPatientId));
    }
  }, [embeddedPatientId]);

  useEffect(() => {
    if (
      hidePageChrome &&
      hubVisitDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(hubVisitDate)
    ) {
      setFromDate(hubVisitDate);
      setToDate(hubVisitDate);
    }
  }, [hidePageChrome, hubVisitDate]);

  const trendDelta = useMemo(() => {
    const t = statsQuery.data?.examsToday ?? 0;
    const y = statsQuery.data?.examsYesterday ?? 0;
    return t - y;
  }, [statsQuery.data?.examsToday, statsQuery.data?.examsYesterday]);

  const pentacamRefs = useMemo(() => {
    const rows = (refsQuery.data ?? []) as Record<string, unknown>[];
    return {
      k1: findMedicalReference(rows, ["K1", "Pentacam K1", "بنتاكام K1"]),
      k2: findMedicalReference(rows, ["K2", "Pentacam K2", "بنتاكام K2"]),
      thinnest: findMedicalReference(rows, [
        "Thinnest",
        "Thinnest Point",
        "CCT",
        "بنتاكام Thinnest",
      ]),
    };
  }, [refsQuery.data]);

  const dashboardRows = (listQuery.data?.rows ?? []) as PentacamDashboardRow[];

  const rowsWithAttention = useMemo(
    () =>
      dashboardRows.map((row) => ({
        row,
        attention: getPentacamRowAttention(row, pentacamRefs),
      })),
    [dashboardRows, pentacamRefs],
  );

  const groupedPatientRows = useMemo(() => {
    const byPatient = new Map<number, PatientGroupedRow>();

    for (const entry of rowsWithAttention) {
      const key = entry.row.patientId;
      const existing = byPatient.get(key);
      if (!existing) {
        byPatient.set(key, {
          patientId: entry.row.patientId,
          patientName: entry.row.patientName,
          doctorName: entry.row.doctorName,
          visitDate: entry.row.visitDate,
          entries: { [entry.row.eye]: entry },
          attention: entry.attention,
        });
        continue;
      }

      existing.entries[entry.row.eye] = entry;
      if (existing.doctorName === "—" && entry.row.doctorName) {
        existing.doctorName = entry.row.doctorName;
      }
      if (!existing.visitDate) {
        existing.visitDate = entry.row.visitDate;
      }
      if (
        existing.attention.severity === "normal" &&
        entry.attention.severity !== "normal"
      ) {
        existing.attention = entry.attention;
      } else if (
        existing.attention.severity === "repeat" &&
        entry.attention.severity === "abnormal"
      ) {
        existing.attention = entry.attention;
      }
      if (entry.attention.severity === "abnormal") {
        existing.attention = entry.attention;
      }
    }

    return Array.from(byPatient.values());
  }, [rowsWithAttention]);

  const summaryStats = useMemo(() => {
    const total = rowsWithAttention.length;
    const abnormal = rowsWithAttention.filter(
      (entry) => entry.attention.severity === "abnormal",
    ).length;
    const repeat = rowsWithAttention.filter(
      (entry) => entry.attention.severity === "repeat",
    ).length;
    const accepted = rowsWithAttention.filter(
      (entry) => entry.attention.severity === "normal",
    ).length;
    return { total, abnormal, repeat, accepted };
  }, [rowsWithAttention]);

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    () => new Set(),
  );

  const alertRows = useMemo(
    () =>
      rowsWithAttention
        .filter((entry) => entry.attention.severity !== "normal")
        .filter(
          (entry) =>
            !dismissedAlerts.has(`${entry.row.resultId}-${entry.row.eye}`),
        )
        .slice(0, 6),
    [rowsWithAttention, dismissedAlerts],
  );

  const visibleRowCount =
    activeFilter === "all"
      ? groupedPatientRows.length
      : rowsWithAttention.length;

  const renderEyeCell = (entry: DashboardEntry | undefined) => {
    if (!entry) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    return (
      <div className="space-y-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
              entry.row.eye === "OD"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/15 text-secondary",
            )}
          >
            {entry.row.eye === "OD" ? "RT" : "LT"}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              entry.row.quality === "accepted"
                ? "bg-success/15 text-success"
                : "bg-warning/20 text-warning/90",
            )}
          >
            {entry.row.quality === "accepted" ? "مقبول" : "تكرار"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span>K1</span>
            <span className="font-mono text-foreground">
              <RefValue value={entry.row.k1} reference={pentacamRefs.k1} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>K2</span>
            <span className="font-mono text-foreground">
              <RefValue value={entry.row.k2} reference={pentacamRefs.k2} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Axis</span>
            <span className="font-mono text-foreground">
              {entry.row.axis != null && entry.row.axis !== ""
                ? `${entry.row.axis}°`
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Thinnest</span>
            <span className="font-mono text-foreground">
              <RefValue
                value={entry.row.thinnest}
                reference={pentacamRefs.thinnest}
                suffix=" µm"
              />
            </span>
          </div>
        </div>
      </div>
    );
  };

  const RefValue = ({
    value,
    reference,
    suffix = "",
  }: {
    value: unknown;
    reference: MedicalReference | null;
    suffix?: string;
  }) => {
    const state = evaluateMedicalReference(value, reference);
    const empty = value == null || value === "";
    return (
      <span
        className={cn(
          "inline-flex rounded px-1.5 py-0.5",
          medicalReferenceClass(state),
        )}
        title={
          state === "low" || state === "high"
            ? `خارج الطبيعي: ${reference?.min} - ${reference?.max} ${reference?.unit}`
            : undefined
        }
      >
        {empty ? "—" : `${value}${suffix}`}
      </span>
    );
  };

  if (!isAuthenticated) return null;

  return (
    <div
      className={cn(
        hidePageChrome
          ? "prescription-root bg-background min-h-0"
          : "bg-muted/30 min-h-screen",
      )}
    >
      <div
        className={cn(
          "mx-auto w-full",
          hidePageChrome
            ? "max-w-none px-2 pb-4 pt-1"
            : "w-full px-3 py-6 sm:px-4 sm:py-8",
        )}
        dir="rtl"
      >
        {!hidePageChrome ? (
          <PageHeader
            title="بنتكام"
            description="مراجعة النتائج، اكتشاف التكرار، والتنبيه على الحالات الشاذة"
            icon={<Eye className="h-5 w-5 text-primary" />}
          />
        ) : null}

        {hidePageChrome && patientHubReadOnly ? (
          <div className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {patientHubViewOnlyHint}
          </div>
        ) : null}

        {/* Tab Selector */}
        <div className="mb-4 flex border-b border-border">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "pb-2.5 pt-1 px-4 text-sm font-semibold border-b-2 transition-colors",
              viewMode === "list"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            قائمة السجلات ({listQuery.isLoading ? "…" : (activeFilter === "all" ? groupedPatientRows.length : rowsWithAttention.length)})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("review")}
            className={cn(
              "pb-2.5 pt-1 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
              viewMode === "review"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span>سجلات للمراجعة / التنبيهات</span>
            {alertRows.length > 0 ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                {alertRows.length}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                0
              </span>
            )}
          </button>
        </div>

        {viewMode === "list" ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-4">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="ابحث بكود المريض أو الاسم أو الطبيب..."
                  className="w-full lg:max-w-2xl"
                  disabled={patientHubReadOnly}
                />

                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "w-full",
                        patientHubReadOnly && "pointer-events-none opacity-60",
                      )}
                    >
                      <FilterBar
                        filters={locationFilterTabs}
                        selected={locationFilter}
                        onSelect={setLocationFilter}
                        className="w-full flex-wrap"
                      />
                    </div>

                    <div
                      className={cn(
                        "w-full",
                        patientHubReadOnly && "pointer-events-none opacity-60",
                      )}
                    >
                      <FilterBar
                        filters={filterTabs}
                        selected={activeFilter}
                        onSelect={setActiveFilter}
                        className="w-full flex-wrap"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {statsQuery.isLoading
                        ? "...جارٍ تحديث الملخص"
                        : `${statsQuery.data?.examsToday ?? 0} نتيجة اليوم`}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {listQuery.isLoading
                        ? "...جارٍ تحديث النتائج"
                        : `${visibleRowCount} نتيجة ظاهرة`}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs"
                      onClick={() =>
                        setShowAdvancedFilters((current) => !current)
                      }
                    >
                      {showAdvancedFilters ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      بحث متقدم
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium text-primary">
                          اليوم
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                          {statsQuery.isLoading
                            ? "…"
                            : (statsQuery.data?.examsToday ?? 0)}
                        </p>
                      </div>
                      <div className="text-left">
                        <Activity className="mr-auto h-4 w-4 text-primary" />
                        <p className="mt-1 text-[11px] text-primary/70">
                          {statsQuery.isLoading
                            ? "..."
                            : `${Math.abs(trendDelta)} مقارنة بالأمس`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-success">
                      مقبولة
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {listQuery.isLoading ? "…" : summaryStats.accepted}
                    </p>
                  </div>

                  <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-warning-foreground">
                      تحتاج تكرار
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {listQuery.isLoading ? "…" : summaryStats.repeat}
                    </p>
                  </div>

                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-destructive">
                      شاذة
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {listQuery.isLoading ? "…" : summaryStats.abnormal}
                    </p>
                  </div>
                </div>

                {showAdvancedFilters ? (
                  <div className="grid gap-3 border-t border-border/70 pt-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        رقم السجل
                      </Label>
                      <Input
                        dir="ltr"
                        className="h-9 text-sm"
                        placeholder="pentacam result id"
                        value={resultId}
                        disabled={patientHubReadOnly}
                        onChange={(e) =>
                          setResultId(e.target.value.replace(/[^\d]/g, ""))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        رقم الزيارة
                      </Label>
                      <Input
                        dir="ltr"
                        className="h-9 text-sm"
                        placeholder="visit id"
                        value={visitId}
                        disabled={patientHubReadOnly}
                        onChange={(e) =>
                          setVisitId(e.target.value.replace(/[^\d]/g, ""))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        المريض
                      </Label>
                      <Input
                        dir="ltr"
                        className="h-9 text-sm"
                        placeholder="patient id"
                        value={patientId}
                        disabled={patientHubReadOnly}
                        onChange={(e) =>
                          setPatientId(e.target.value.replace(/[^\d]/g, ""))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        من تاريخ
                      </Label>
                      <DateInput
                        className="h-9 text-sm"
                        value={fromDate}
                        disabled={patientHubReadOnly}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        إلى تاريخ
                      </Label>
                      <DateInput
                        className="h-9 text-sm"
                        value={toDate}
                        disabled={patientHubReadOnly}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-right text-sm">
                  <thead>
                    <tr className="border-b bg-primary/10 text-[11px] font-semibold text-primary sm:text-xs">
                      <th className="p-2.5 whitespace-nowrap">المريض</th>
                      <th className="p-2.5 whitespace-nowrap">الطبيب</th>
                      <th className="p-2.5 whitespace-nowrap">التاريخ</th>
                      {activeFilter === "all" ? (
                        <>
                          <th className="p-2.5 whitespace-nowrap">RT</th>
                          <th className="p-2.5 whitespace-nowrap">LT</th>
                          <th className="p-2.5 whitespace-nowrap">الحالة</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2.5 whitespace-nowrap">K1</th>
                          <th className="p-2.5 whitespace-nowrap">K2</th>
                          <th className="p-2.5 whitespace-nowrap">Axis</th>
                          <th className="p-2.5 whitespace-nowrap">Thinnest</th>
                          <th className="p-2.5 whitespace-nowrap">الحالة</th>
                        </>
                      )}
                      <th className="p-2.5 whitespace-nowrap w-14">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listQuery.isLoading ? (
                      <tr>
                        <td
                          colSpan={activeFilter === "all" ? 7 : 9}
                          className="p-8 text-center text-muted-foreground"
                        >
                          ...جارٍ التحميل
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        if (activeFilter === "all") {
                          if (groupedPatientRows.length === 0) {
                            return (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="p-8 text-center text-muted-foreground"
                                >
                                  لا توجد نتائج مطابقة.
                                </td>
                              </tr>
                            );
                          }

                          return groupedPatientRows.map((group) => (
                            <tr
                              key={`patient-${group.patientId}`}
                              className={cn(
                                "border-b last:border-0 transition-colors hover:bg-primary/5",
                                group.attention.severity === "abnormal"
                                  ? "bg-destructive/10 hover:bg-destructive/15"
                                  : group.attention.severity === "repeat"
                                    ? "bg-warning/10 hover:bg-warning/15"
                                    : "",
                              )}
                            >
                              <td className="max-w-[220px] p-2.5 font-semibold whitespace-nowrap truncate">
                                {group.patientName}
                              </td>
                              <td className="max-w-[180px] p-2.5 whitespace-nowrap truncate text-muted-foreground">
                                {group.doctorName || "—"}
                              </td>
                              <td className="p-2.5 whitespace-nowrap tabular-nums">
                                {formatVisitDateAr(group.visitDate)}
                              </td>
                              <td className="p-2.5 align-top">
                                {renderEyeCell(group.entries.OD)}
                              </td>
                              <td className="p-2.5 align-top">
                                {renderEyeCell(group.entries.OS)}
                              </td>
                              <td className="p-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                                      group.attention.severity === "normal"
                                        ? "bg-success/15 text-success"
                                        : group.attention.severity === "repeat"
                                          ? "bg-warning/20 text-warning/90"
                                          : "bg-destructive/10 text-destructive",
                                    )}
                                  >
                                    {group.attention.severity === "normal"
                                      ? "مقبول"
                                      : group.attention.severity === "repeat"
                                        ? "يحتاج تكرار"
                                        : "شاذة"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 text-center">
                                {patientHubReadOnly ? (
                                  <span
                                    className="inline-flex h-8 w-8 items-center justify-center"
                                    title={patientHubViewOnlyHint}
                                  >
                                    <Eye
                                      className="h-4 w-4 text-muted-foreground/60"
                                      aria-hidden
                                    />
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11"
                                    asChild
                                    title="عرض"
                                    aria-label="عرض نتيجة Pentacam"
                                  >
                                    <Link
                                      href={`/sheets/pentacam/${group.patientId}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ));
                        }

                        if (dashboardRows.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={9}
                                className="p-8 text-center text-muted-foreground"
                              >
                                لا توجد نتائج مطابقة.
                              </td>
                            </tr>
                          );
                        }

                        return rowsWithAttention.map(
                          ({ row, attention }, idx) => (
                            <tr
                              key={`${row.resultId}-${row.eye}-${idx}`}
                              className={cn(
                                "border-b last:border-0 transition-colors",
                                attention.severity === "abnormal"
                                  ? "bg-destructive/10 hover:bg-destructive/15"
                                  : attention.severity === "repeat"
                                    ? "bg-warning/10 hover:bg-warning/15"
                                    : "hover:bg-primary/5",
                              )}
                            >
                              <td className="max-w-[220px] p-2.5 font-semibold whitespace-nowrap truncate">
                                {row.patientName}
                              </td>
                              <td className="max-w-[180px] p-2.5 whitespace-nowrap truncate text-muted-foreground">
                                {row.doctorName || "—"}
                              </td>
                              <td className="p-2.5 whitespace-nowrap tabular-nums">
                                {formatVisitDateAr(row.visitDate)}
                              </td>
                              <td className="p-2.5 font-mono text-xs tabular-nums">
                                <RefValue
                                  value={row.k1}
                                  reference={pentacamRefs.k1}
                                />
                              </td>
                              <td className="p-2.5 font-mono text-xs tabular-nums">
                                <RefValue
                                  value={row.k2}
                                  reference={pentacamRefs.k2}
                                />
                              </td>
                              <td className="p-2.5 font-mono text-xs tabular-nums">
                                {row.axis != null && row.axis !== ""
                                  ? `${row.axis}°`
                                  : "—"}
                              </td>
                              <td className="p-2.5 font-mono text-xs tabular-nums">
                                <RefValue
                                  value={row.thinnest}
                                  reference={pentacamRefs.thinnest}
                                  suffix=" µm"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                                      row.quality === "accepted"
                                        ? "bg-success/15 text-success"
                                        : "bg-warning/20 text-warning/90",
                                    )}
                                  >
                                    {row.quality === "accepted"
                                      ? "مقبول"
                                      : "يحتاج تكرار"}
                                  </span>
                                  {attention.severity === "abnormal" ? (
                                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                                      شاذة
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="p-2.5 text-center">
                                {patientHubReadOnly ? (
                                  <span
                                    className="inline-flex h-8 w-8 items-center justify-center"
                                    title={patientHubViewOnlyHint}
                                  >
                                    <Eye
                                      className="h-4 w-4 text-muted-foreground/60"
                                      aria-hidden
                                    />
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11"
                                    asChild
                                    title="عرض"
                                    aria-label="عرض نتيجة Pentacam"
                                  >
                                    <Link
                                      href={`/sheets/pentacam/${row.patientId}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ),
                        );
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {listQuery.error ? (
              <p className="text-center text-sm text-destructive">
                {String(listQuery.error.message)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm max-w-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    ملخص التنبيه
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    الحالات غير الطبيعية فقط.
                  </p>
                </div>
                <AlertTriangle className="h-4 w-4 text-warning-foreground" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-warning-foreground">
                    تكرار
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {listQuery.isLoading ? "…" : summaryStats.repeat}
                  </p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-destructive">
                    شاذة
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {listQuery.isLoading ? "…" : summaryStats.abnormal}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                القائمة الحرجة ({alertRows.length} عناصر)
              </h3>

              {listQuery.isLoading ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  ...جارٍ تحميل التنبيهات
                </div>
              ) : alertRows.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  لا توجد حالات حرجة في النتائج الحالية.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {alertRows.map(({ row, attention }) => (
                    <div
                      key={`alert-${row.resultId}-${row.eye}`}
                      className={cn(
                        "rounded-lg border p-3 flex flex-col justify-between",
                        attention.severity === "abnormal"
                          ? "border-destructive/30 bg-destructive/10"
                          : "border-warning/50 bg-warning/10",
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {row.patientName}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.doctorName || "—"} •{" "}
                              {formatVisitDateAr(row.visitDate)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                attention.severity === "abnormal"
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-warning/20 text-warning-foreground",
                              )}
                            >
                              {attention.severity === "abnormal"
                                ? "شاذة"
                                : "تكرار"}
                            </span>
                            <button
                              type="button"
                              aria-label="تجاهل التنبيه"
                              onClick={() =>
                                setDismissedAlerts((prev) =>
                                  new Set(prev).add(`${row.resultId}-${row.eye}`),
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-success/10 hover:text-success"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {attention.reasons.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {attention.reasons.map((reason) => (
                              <span
                                key={`${row.resultId}-${row.eye}-${reason}`}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                  attention.severity === "abnormal"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-warning/20 text-warning/90",
                                )}
                              >
                                {formatReasonBadge(reason)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-2">
                        <span className="text-xs text-muted-foreground">
                          {row.eye === "OD" ? "يمين" : "يسار"} •{" "}
                          {row.quality === "accepted" ? "مقبول" : "يحتاج تكرار"}
                        </span>
                        {patientHubReadOnly ? (
                          <span
                            className="text-xs text-muted-foreground"
                            title={patientHubViewOnlyHint}
                          >
                            عرض فقط
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            asChild
                          >
                            <Link href={`/sheets/pentacam/${row.patientId}`}>
                              عرض
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
