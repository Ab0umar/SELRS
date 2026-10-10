import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FollowupStatus = "upcoming" | "completed" | "overdue" | "invalid-date";

const filterOptions = [
  { value: "all", label: "الكل" },
  { value: "upcoming", label: "قادمة" },
  { value: "completed", label: "مكتملة" },
  { value: "overdue", label: "متأخرة" },
];

const SHEET_TYPE_LABEL: Record<string, string> = {
  consultant: "استشارة",
  specialist: "تخصص",
  lasik: "ليزك",
  external: "خارجي",
};

function deriveStatus(item: any): FollowupStatus {
  if (item.notes?.trim() || item.treatment?.trim()) return "completed";
  const d = item.followupDate ? new Date(String(item.followupDate)) : null;
  if (!d || Number.isNaN(d.getTime())) return "invalid-date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today ? "overdue" : "upcoming";
}

function isInCurrentCalendarWeek(d: Date): boolean {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

function formatDate(raw: unknown): string {
  if (!raw) return "-";
  try {
    return new Date(String(raw)).toLocaleDateString("ar-EG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(raw);
  }
}

export type FollowupsProps = {
  embeddedPatientId?: number;
  hidePageChrome?: boolean;
  hubVisitDateFilter?: string;
  patientHubReadOnly?: boolean;
  patientHubViewOnlyHint?: string;
};

export default function Followups(
  props: Partial<FollowupsProps> & object = {},
) {
  const embeddedPatientId = props?.embeddedPatientId;
  const hidePageChrome = props?.hidePageChrome;
  const hubVisitDateFilter = props?.hubVisitDateFilter;
  const patientHubReadOnly = Boolean(props?.patientHubReadOnly);
  const patientHubViewOnlyHint =
    props?.patientHubViewOnlyHint ?? "العرض فقط داخل المركز";

  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [patientId, setPatientId] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });

  // All items (no patient filter)
  const allItemsQuery = trpc.medical.getAllFollowupItems.useQuery(undefined, {
    enabled: patientId <= 0,
    refetchOnWindowFocus: false,
  });

  // Per-patient sheets (with items nested)
  const patientSheetsQuery = trpc.medical.getFollowupSheets.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: patientId > 0, refetchOnWindowFocus: false },
  );

  const patient = patientQuery.data as any;

  // Flatten patient sheets → items
  const patientItems = useMemo(() => {
    if (patientId <= 0) return [];
    const sheets = (patientSheetsQuery.data ?? []) as any[];
    return sheets.flatMap((sheet: any) =>
      (sheet.items ?? [])
        .filter((item: any) => item.followupDate)
        .map((item: any) => ({
          ...item,
          sheetType: sheet.sheetType,
          patientId: sheet.patientId,
          patientFullName: patient?.fullName ?? "",
          patientCode: patient?.patientCode ?? "",
        })),
    );
  }, [patientSheetsQuery.data, patientId, patient]);

  const allItems =
    patientId > 0 ? patientItems : ((allItemsQuery.data ?? []) as any[]);
  const isLoading =
    patientId > 0 ? patientSheetsQuery.isLoading : allItemsQuery.isLoading;
  const followupsQuery = patientId > 0 ? patientSheetsQuery : allItemsQuery;

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (embeddedPatientId && embeddedPatientId > 0)
      setPatientId(embeddedPatientId);
  }, [embeddedPatientId]);

  const stats = useMemo(() => {
    const thisWeek = allItems.filter((item) => {
      const d = item.followupDate ? new Date(String(item.followupDate)) : null;
      return d && !Number.isNaN(d.getTime()) && isInCurrentCalendarWeek(d);
    }).length;
    const overdue = allItems.filter(
      (item) => deriveStatus(item) === "overdue",
    ).length;
    return { total: allItems.length, thisWeek, overdue };
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allItems.filter((item) => {
      const st = deriveStatus(item);
      if (activeStatus !== "all" && st !== activeStatus) return false;
      if (hubVisitDateFilter?.trim()) {
        const key = item.followupDate
          ? new Date(String(item.followupDate)).toISOString().split("T")[0]
          : "";
        if (key !== hubVisitDateFilter) return false;
      }
      if (!needle) return true;
      const hay = [
        item.patientFullName,
        item.patientCode,
        item.followupName,
        item.notes,
        item.treatment,
        item.vaOD,
        item.vaOS,
        formatDate(item.followupDate),
        SHEET_TYPE_LABEL[item.sheetType] ?? item.sheetType,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [allItems, search, activeStatus, hubVisitDateFilter]);

  if (!isAuthenticated) return null;

  const statusBadgeVP = (st: FollowupStatus) => {
    if (st === "completed")
      return (
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[13px] font-bold">
          مكتملة
        </span>
      );
    if (st === "overdue")
      return (
        <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-[13px] font-bold">
          متأخرة
        </span>
      );
    if (st === "invalid-date")
      return (
        <span className="px-3 py-1 rounded-full bg-warning/20 text-warning-text text-[13px] font-bold">
          تاريخ غير صالح
        </span>
      );
    return (
      <span className="px-3 py-1 rounded-full bg-muted text-primary text-[13px] font-bold">
        قادمة
      </span>
    );
  };

  if (hidePageChrome) {
    return (
      <div
        className="w-full"
        dir="rtl"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {patientHubReadOnly && (
          <div className="mb-3 rounded-lg border border-border/60 bg-muted px-3 py-2 text-xs text-muted-foreground">
            {patientHubViewOnlyHint}
          </div>
        )}
        <div className="mb-3 flex gap-2 flex-wrap">
          {filterOptions.map((f) => (
            <Button variant="bare"
              key={f.value}
              type="button"
              aria-pressed={activeStatus === f.value}
              onClick={() => setActiveStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeStatus === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"}`}
            >
              {f.label}
            </Button>
          ))}
          <label htmlFor="followups-embedded-search" className="sr-only">
            البحث في المتابعات
          </label>
          <Input bare
            id="followups-embedded-search"
            className="ms-auto rounded-lg border border-border/60 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
            placeholder="بحث…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              جاري التحميل…
            </div>
          )}
          {!isLoading && followupsQuery.error && (
            <div
              className="flex flex-col items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/10 p-6 text-center text-sm text-destructive"
              role="alert"
            >
              <span>تعذر تحميل المتابعات: {followupsQuery.error.message}</span>
              <Button variant="bare"
                type="button"
                className="rounded-md border px-3 py-1.5"
                onClick={() => followupsQuery.refetch()}
              >
                إعادة المحاولة
              </Button>
            </div>
          )}
          {!isLoading &&
            !followupsQuery.error &&
            filteredItems.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg">
                {allItems.length === 0
                  ? "لا توجد متابعات مسجلة"
                  : "لا توجد متابعات مطابقة"}
              </div>
            )}
          {!isLoading &&
            filteredItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const st = deriveStatus(item);
              const pid = Number(item.patientId ?? 0);
              return (
                <div
                  key={item.id}
                  className="bg-card border border-border/60 rounded-lg overflow-hidden"
                >
                  <Button variant="bare"
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`followup-details-${item.id}`}
                    className="w-full flex items-center gap-3 p-3 hover:bg-background transition-colors text-start"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {patientId <= 0
                          ? item.patientFullName || `مريض #${pid}`
                          : item.followupName || "متابعة"}
                        {item.patientCode && patientId <= 0 ? (
                          <span className="ms-1 text-xs font-normal text-muted-foreground">
                            ({item.patientCode})
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {statusBadgeVP(st)}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.followupDate)}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </Button>
                  {isExpanded && (
                    <div
                      id={`followup-details-${item.id}`}
                      className="border-t border-border/60 p-3 space-y-3 bg-background"
                    >
                      {(item.vaOD || item.vaOS) && (
                        <div className="grid grid-cols-2 gap-2">
                          <div
                            className="bg-card border border-border/60 rounded p-2"
                            style={{ backgroundColor: "rgba(0,61,155,0.03)" }}
                          >
                            <p className="text-[13px] font-bold uppercase text-muted-foreground mb-1">
                              OD (اليمنى)
                            </p>
                            <p className="font-semibold text-sm text-foreground">
                              {item.vaOD || "-"}
                            </p>
                          </div>
                          <div className="bg-card border border-border/60 rounded p-2">
                            <p className="text-[13px] font-bold uppercase text-muted-foreground mb-1">
                              OS (اليسرى)
                            </p>
                            <p className="font-semibold text-sm text-foreground">
                              {item.vaOS || "-"}
                            </p>
                          </div>
                        </div>
                      )}
                      {item.treatment && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {item.treatment}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">
                          {item.notes}
                        </p>
                      )}
                      {pid > 0 && !patientHubReadOnly && (
                        <Button variant="bare"
                          type="button"
                          className="text-xs text-primary font-bold hover:underline"
                          onClick={() => setLocation(`/patient-file/${pid}`)}
                        >
                          ← ملف المريض
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      dir="rtl"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border/60 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
              إجمالي المتابعات
            </p>
            <h3 className="text-4xl font-bold text-foreground">
              {stats.total.toLocaleString("ar-EG")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> إجمالي السجلات
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-primary">
            <CalendarDays className="h-7 w-7" />
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
              متابعة هذا الأسبوع
            </p>
            <h3 className="text-4xl font-bold text-foreground">
              {stats.thisWeek.toLocaleString("ar-EG")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" /> مواعيد مؤكدة
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <CalendarCheck className="h-7 w-7" />
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5 flex items-center justify-between shadow-sm border-destructive/20">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
              متأخرة
            </p>
            <h3 className="text-4xl font-bold text-destructive">
              {stats.overdue.toLocaleString("ar-EG")}
            </h3>
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> تحتاج تواصل فوري
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Filter + search + patient picker */}
      <div className="bg-card border border-border/60 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Button variant="bare"
              type="button"
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
              onClick={() => setLocation("/followup/0")}
            >
              <Plus className="h-4 w-4" />
              متابعة جديدة
            </Button>
            <div className="mx-1 h-5 w-px bg-border" />
            {filterOptions.map((f) => (
              <Button variant="bare"
                key={f.value}
                type="button"
                aria-pressed={activeStatus === f.value}
                onClick={() => setActiveStatus(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeStatus === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <label htmlFor="followups-search" className="sr-only">
                البحث في المتابعات
              </label>
              <Input bare
                id="followups-search"
                className="w-full rounded-lg border border-border/60 py-2 pe-4 ps-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="بحث باسم المريض أو الكود أو الملاحظات…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-52">
              <PatientPicker
                initialPatientId={patientId > 0 ? patientId : undefined}
                onSelect={(selected) => {
                  setPatientId(selected.id);
                  setExpandedId(null);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards list */}
      <div className="space-y-4">
        {isLoading && (
          <div className="py-12 text-center text-muted-foreground">
            جاري التحميل…
          </div>
        )}
        {!isLoading && followupsQuery.error && (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/10 p-6 text-center text-sm text-destructive"
            role="alert"
          >
            <span>تعذر تحميل المتابعات: {followupsQuery.error.message}</span>
            <Button variant="bare"
              type="button"
              className="rounded-md border px-3 py-1.5"
              onClick={() => followupsQuery.refetch()}
            >
              إعادة المحاولة
            </Button>
          </div>
        )}
        {!isLoading && !followupsQuery.error && filteredItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-muted-foreground">
            {allItems.length === 0
              ? "لا توجد متابعات مسجلة"
              : "لا توجد متابعات مطابقة للبحث"}
          </div>
        )}
        {!isLoading &&
          filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const st = deriveStatus(item);
            const pid = Number(item.patientId ?? 0);
            const isOverdue = st === "overdue";

            return (
              <div
                key={item.id}
                className={`bg-card rounded-xl overflow-hidden shadow-sm border transition-all ${isOverdue ? "border-destructive/30" : "border-border/60"} ${isExpanded ? "ring-2 ring-primary/20 shadow-lg" : ""}`}
              >
                <Button variant="bare"
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`followup-details-${item.id}`}
                  className="w-full flex flex-col md:flex-row items-center gap-4 p-4 hover:bg-background transition-colors text-start cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted text-primary"}`}
                  >
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0 text-start">
                    <h4 className="font-semibold text-lg text-foreground truncate">
                      {patientId <= 0
                        ? item.patientFullName || `مريض #${pid}`
                        : item.followupName || "متابعة"}
                      {item.patientCode && patientId <= 0 ? (
                        <span className="ms-2 text-sm font-normal text-muted-foreground">
                          ({item.patientCode})
                        </span>
                      ) : null}
                    </h4>
                    <p
                      className={`text-sm mt-1 flex items-center gap-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      <CalendarCheck className="h-4 w-4" />
                      {patientId > 0
                        ? `${item.followupName || "متابعة"} — `
                        : ""}
                      {formatDate(item.followupDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {statusBadgeVP(st)}
                    {item.sheetType && (
                      <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-[13px] font-bold">
                        {SHEET_TYPE_LABEL[item.sheetType] ?? item.sheetType}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </Button>

                {isExpanded && (
                  <div
                    id={`followup-details-${item.id}`}
                    className="border-t border-border/60 bg-background p-5"
                  >
                    {isOverdue && (
                      <div className="mb-4 flex items-start gap-3 bg-destructive/10/30 border border-destructive/20 rounded-lg p-3">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-destructive text-sm">
                            تنبيه: تأخر الموعد
                          </p>
                          <p className="text-sm text-destructive">
                            يرجى الاتصال بالمريض لتأكيد موعد بديل
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(item.vaOD || item.vaOS || item.iopOD || item.iopOS) && (
                        <div className="space-y-4">
                          {(item.vaOD || item.vaOS) && (
                            <div>
                              <h5 className="font-bold text-primary mb-2 text-sm uppercase flex items-center gap-2">
                                <CalendarCheck className="h-4 w-4" /> حدة
                                الإبصار (Visual Acuity)
                              </h5>
                              <div className="flex gap-3">
                                <div
                                  className="flex-1 bg-card p-3 rounded-lg border border-border/60"
                                  style={{
                                    backgroundColor: "rgba(0,61,155,0.03)",
                                  }}
                                >
                                  <p className="text-[13px] text-muted-foreground uppercase font-bold mb-1">
                                    العين اليمنى (OD)
                                  </p>
                                  <p className="font-semibold text-base text-foreground">
                                    {item.vaOD || "-"}
                                  </p>
                                </div>
                                <div className="flex-1 bg-card p-3 rounded-lg border border-border/60">
                                  <p className="text-[13px] text-muted-foreground uppercase font-bold mb-1">
                                    العين اليسرى (OS)
                                  </p>
                                  <p className="font-semibold text-base text-foreground">
                                    {item.vaOS || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {(item.iopOD || item.iopOS) && (
                            <div>
                              <h5 className="font-bold text-primary mb-2 text-sm uppercase flex items-center gap-2">
                                ضغط العين (IOP)
                              </h5>
                              <div className="flex gap-3">
                                <div
                                  className="flex-1 bg-card p-3 rounded-lg border border-border/60"
                                  style={{
                                    backgroundColor: "rgba(0,61,155,0.03)",
                                  }}
                                >
                                  <p className="text-[13px] text-muted-foreground uppercase font-bold mb-1">
                                    OD
                                  </p>
                                  <p className="font-semibold text-base text-foreground">
                                    {item.iopOD ? `${item.iopOD} mmHg` : "-"}
                                  </p>
                                </div>
                                <div className="flex-1 bg-card p-3 rounded-lg border border-border/60">
                                  <p className="text-[13px] text-muted-foreground uppercase font-bold mb-1">
                                    OS
                                  </p>
                                  <p className="font-semibold text-base text-foreground">
                                    {item.iopOS ? `${item.iopOS} mmHg` : "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="space-y-4">
                        {item.treatment && (
                          <div>
                            <h5 className="font-bold text-primary mb-2 text-sm uppercase">
                              العلاج (Treatment)
                            </h5>
                            <div className="bg-card p-3 rounded-lg border border-border/60 min-h-[60px]">
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {item.treatment}
                              </p>
                            </div>
                          </div>
                        )}
                        {item.notes && (
                          <div>
                            <h5 className="font-bold text-primary mb-2 text-sm uppercase">
                              الملاحظات (Notes)
                            </h5>
                            <div className="bg-card p-3 rounded-lg border border-border/60 min-h-[60px]">
                              <p className="text-sm text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
                                {item.notes}
                              </p>
                            </div>
                          </div>
                        )}
                        {!item.vaOD &&
                          !item.vaOS &&
                          !item.iopOD &&
                          !item.treatment &&
                          !item.notes && (
                            <div className="py-6 text-center text-muted-foreground text-sm">
                              لا توجد بيانات مسجلة لهذه المتابعة
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border/60 mt-4">
                      {pid > 0 && (
                        <Button variant="bare"
                          type="button"
                          className="px-4 py-2 text-primary font-bold hover:bg-muted/20 rounded-lg transition-colors text-sm"
                          onClick={() =>
                            setLocation(
                              patientHubReadOnly
                                ? `/patient-hub/examination/${pid}${typeof window !== "undefined" ? window.location.search : ""}`
                                : `/patient-file/${pid}`,
                            )
                          }
                        >
                          ملف المريض
                        </Button>
                      )}
                      <Button variant="bare"
                        type="button"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
                        onClick={() => setExpandedId(null)}
                      >
                        إغلاق
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
