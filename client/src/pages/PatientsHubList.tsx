import { memo, useEffect, useMemo, useState } from "react";
import { Printer, Search, ChevronRight, ChevronLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { PatientMedicalStatusStrip, PatientMedicalStatusDots, type PatientMedicalStatus } from "@/components/patients/PatientMedicalStatusBadges";
import { patientSheetPathByServiceType } from "@/lib/patientNavPaths";
import { type PatientRow, type SheetTypeChoice, type ServiceType, normalizeSheetTypeChoice, toLegacyServiceType } from "@/hooks/admin-patients/adminPatientsShared";

/* ────────────────────── helpers ─────────────────────── */

function toIsoDate(val: string): string {
  const d = val?.trim();
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return "";
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  consultant: "استشاري", specialist: "أخصائي", lasik: "ليزك",
  external: "خارجي", surgery: "عمليات مركز", surgery_external: "عمليات خارجي",
  pentacam_c: "Pentacam C", pentacam_ex: "Pentacam Ex", pentacam_ex_c: "Pentacam Ex.C",
};

function serviceLabel(raw: string | undefined) {
  return SERVICE_TYPE_LABELS[String(raw ?? "").toLowerCase()] ?? raw ?? "—";
}

function formatVisitDateTime(patient: PatientRow): string {
  const raw =
    (patient as any).lastVisit ??
    (patient as any).visitDate ??
    (patient as any).createdAt ??
    (patient as any).updatedAt ??
    null;
  if (!raw) return "—";
  const dt = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(dt.valueOf())) return "—";
  return dt.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function printPatient(patient: PatientRow) {
  const serviceType = String(normalizeSheetTypeChoice(patient.__serviceCodeSingle ?? patient.serviceType ?? "consultant") || "consultant");
  const path = patientSheetPathByServiceType(serviceType, patient.id);
  window.open(`${path}?print=1`, "_blank");
}

/* ────────────────────── mobile card ─────────────────── */

const HubPatientCard = memo(function HubPatientCard({
  patient, status,
}: { patient: PatientRow; status: PatientMedicalStatus | undefined }) {
  const code = patient.patientCode
    ? (/^\d+$/.test(patient.patientCode) ? patient.patientCode.padStart(4, "0") : patient.patientCode)
    : "—";
  return (
    <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
      <PatientMedicalStatusStrip status={status} />
      <CardContent className="space-y-2 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 rounded-lg border-primary/25 bg-primary/5 px-2 text-xs text-primary hover:bg-primary/10"
            onClick={() => printPatient(patient)}
          >
            <Printer className="h-3.5 w-3.5" />
            طباعة
          </Button>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {serviceLabel(patient.__serviceCodeSingle ?? patient.serviceType)}
          </span>
        </div>
        <div className="text-sm font-bold text-foreground text-right">{patient.fullName || "—"}</div>
        <div className="grid grid-cols-2 gap-0.5 rounded-xl border border-border/50 bg-muted/30 px-2.5 py-2 text-xs">
          <span className="text-muted-foreground">الكود</span>
          <span dir="ltr" className="text-right text-foreground">{code}</span>
          <span className="text-muted-foreground">نوع الخدمة</span>
          <span className="text-right text-foreground">{serviceLabel(patient.__serviceCodeSingle ?? patient.serviceType)}</span>
          <span className="text-muted-foreground">الطبيب</span>
          <span className="text-right text-foreground">{patient.treatingDoctor || "—"}</span>
          <span className="text-muted-foreground">الوقت</span>
          <span className="text-right text-foreground">{formatVisitDateTime(patient)}</span>
          {patient.phone ? (
            <>
              <span className="text-muted-foreground">الهاتف</span>
              <span dir="ltr" className="text-right text-foreground">{patient.phone}</span>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});

/* ────────────────────── desktop table row ────────────── */

const HubPatientRow = memo(function HubPatientRow({
  patient, status,
}: { patient: PatientRow; status: PatientMedicalStatus | undefined }) {
  const code = patient.patientCode
    ? (/^\d+$/.test(patient.patientCode) ? patient.patientCode.padStart(4, "0") : patient.patientCode)
    : "—";
  return (
    <tr className="border-b border-slate-100 transition-colors hover:bg-primary/5">
      <td className="py-1.5 px-2 text-center" dir="ltr">{code}</td>
      <td className="py-1.5 px-2 text-right font-medium">{patient.fullName || "—"}</td>
      <td className="py-1.5 px-2 text-center">{serviceLabel(patient.__serviceCodeSingle ?? patient.serviceType)}</td>
      <td className="py-1.5 px-2 text-center">{patient.treatingDoctor || "—"}</td>
      <td className="py-1.5 px-2 text-center" dir="ltr">{patient.phone || "—"}</td>
      <td className="py-1.5 px-2 text-center">
        <PatientMedicalStatusDots status={status} />
      </td>
      <td className="py-1.5 px-2 text-center">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 rounded-lg border-primary/25 bg-primary/5 px-2 text-xs text-primary hover:bg-primary/10"
          onClick={() => printPatient(patient)}
        >
          <Printer className="h-3 w-3" />
          طباعة
        </Button>
      </td>
    </tr>
  );
});

/* ────────────────────── main list ───────────────────── */

export default function PatientsHubList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<"all" | SheetTypeChoice>("all");
  const [cursor, setCursor] = useState<unknown>(null);
  const [cursorHistory, setCursorHistory] = useState<unknown[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 180);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const patientsQuery = trpc.medical.getAllPatients.useQuery(
    {
      branch: undefined,
      searchTerm: debouncedSearch || undefined,
      dateFrom: toIsoDate(dateFrom) || undefined,
      dateTo: toIsoDate(dateTo) || undefined,
      serviceType: serviceTypeFilter === "all" ? undefined : toLegacyServiceType(serviceTypeFilter) as ServiceType,
      cursor: (cursor as any) ?? undefined,
      limit: pageSize,
    },
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const allRows = useMemo<PatientRow[]>(() => {
    const raw = (patientsQuery.data as any);
    const items = Array.isArray(raw?.rows) ? raw.rows
      : Array.isArray(raw?.patients) ? raw.patients
      : Array.isArray(raw) ? raw
      : [];
    return items as PatientRow[];
  }, [patientsQuery.data]);

  const nextCursor = (patientsQuery.data as any)?.nextCursor ?? null;
  const hasMore = Boolean(nextCursor);
  const currentPage = cursorHistory.length + 1;

  const visiblePatientIds = useMemo(() => allRows.map((r) => r.id).filter(Boolean), [allRows]);
  const statusQuery = trpc.medical.getPatientMedicalStatusBatch.useQuery(
    { patientIds: visiblePatientIds },
    { enabled: visiblePatientIds.length > 0, staleTime: 60_000 },
  );
  const statuses = statusQuery.data as Record<number, PatientMedicalStatus> | undefined;

  const goNext = () => {
    if (!nextCursor) return;
    setCursorHistory((h) => [...h, cursor]);
    setCursor(nextCursor);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goPrev = () => {
    const history = [...cursorHistory];
    const prev = history.pop() ?? null;
    setCursorHistory(history);
    setCursor(prev);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full space-y-3 pb-4 text-right" dir="rtl">
      {/* toolbar */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCursor(null); setCursorHistory([]); }}
              placeholder="بحث بالاسم أو الكود أو الهاتف…"
              className="pr-8 text-sm rounded-lg"
              dir="rtl"
            />
          </div>
          <Select value={serviceTypeFilter} onValueChange={(v) => { setServiceTypeFilter(v as any); setCursor(null); setCursorHistory([]); }}>
            <SelectTrigger className="h-9 w-36 rounded-lg text-xs"><SelectValue placeholder="نوع الخدمة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="consultant">استشاري</SelectItem>
              <SelectItem value="specialist">أخصائي</SelectItem>
              <SelectItem value="lasik">ليزك</SelectItem>
              <SelectItem value="external">خارجي</SelectItem>
              <SelectItem value="surgery">عمليات مركز</SelectItem>
              <SelectItem value="surgery_external">عمليات خارجي</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">من</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCursor(null); setCursorHistory([]); }} className="h-9 w-32 rounded-lg text-xs" />
            <label className="text-xs text-muted-foreground whitespace-nowrap">إلى</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCursor(null); setCursorHistory([]); }} className="h-9 w-32 rounded-lg text-xs" />
          </div>
          <Badge variant="secondary" className="tabular-nums shrink-0">
            <Users className="me-1 h-3 w-3" />
            {allRows.length}
          </Badge>
        </CardContent>
      </Card>

      {/* list */}
      {patientsQuery.isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((k) => <div key={k} className="h-24 animate-pulse rounded-xl bg-muted/40" />)}
        </div>
      ) : allRows.length === 0 ? (
        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات مرضى</CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {allRows.map((patient) => (
            <HubPatientCard key={String(patient.__rowKey ?? patient.id)} patient={patient} status={statuses?.[patient.id]} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[720px] w-full table-auto text-center text-xs sm:text-sm" dir="rtl">
              <thead className="bg-slate-50/95 shadow-[0_1px_0_rgba(148,163,184,0.25)]">
                <tr className="border-b border-slate-200">
                  <th className="py-2 px-2 whitespace-nowrap">الكود</th>
                  <th className="py-2 px-2 whitespace-nowrap text-right">الاسم</th>
                  <th className="py-2 px-2 whitespace-nowrap">الخدمة</th>
                  <th className="py-2 px-2 whitespace-nowrap">الطبيب</th>
                  <th className="py-2 px-2 whitespace-nowrap">الهاتف</th>
                  <th className="py-2 px-2 whitespace-nowrap">البيانات</th>
                  <th className="py-2 px-2 whitespace-nowrap">طباعة</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((patient) => (
                  <HubPatientRow key={String(patient.__rowKey ?? patient.id)} patient={patient} status={statuses?.[patient.id]} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCursor(null); setCursorHistory([]); }}>
            <SelectTrigger className="h-8 w-24 rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n} سجل</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">صفحة {currentPage}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" disabled={currentPage === 1} onClick={goPrev}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg" disabled={!hasMore} onClick={goNext}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
