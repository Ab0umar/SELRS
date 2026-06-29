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

type FollowupStatus = "upcoming" | "completed" | "overdue";

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
  if (!d || Number.isNaN(d.getTime())) return "upcoming";
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

export default function Followups(props: Partial<FollowupsProps> & object = {}) {
  const embeddedPatientId = props?.embeddedPatientId;
  const hidePageChrome = props?.hidePageChrome;
  const hubVisitDateFilter = props?.hubVisitDateFilter;
  const patientHubReadOnly = Boolean(props?.patientHubReadOnly);
  const patientHubViewOnlyHint = props?.patientHubViewOnlyHint ?? "العرض فقط داخل المركز";

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

  const allItems = patientId > 0 ? patientItems : ((allItemsQuery.data ?? []) as any[]);
  const isLoading = patientId > 0 ? patientSheetsQuery.isLoading : allItemsQuery.isLoading;

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (embeddedPatientId && embeddedPatientId > 0) setPatientId(embeddedPatientId);
  }, [embeddedPatientId]);

  const stats = useMemo(() => {
    const thisWeek = allItems.filter((item) => {
      const d = item.followupDate ? new Date(String(item.followupDate)) : null;
      return d && !Number.isNaN(d.getTime()) && isInCurrentCalendarWeek(d);
    }).length;
    const overdue = allItems.filter((item) => deriveStatus(item) === "overdue").length;
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
      return <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">مكتملة</span>;
    if (st === "overdue")
      return <span className="px-3 py-1 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[11px] font-bold">متأخرة</span>;
    return <span className="px-3 py-1 rounded-full bg-[#dae2ff] text-[#003d9b] text-[11px] font-bold">قادمة</span>;
  };

  if (hidePageChrome) {
    return (
      <div className="w-full" dir="rtl" style={{ fontFamily: 'Inter, sans-serif' }}>
        {patientHubReadOnly && (
          <div className="mb-3 rounded-lg border border-[#c3c6d6] bg-[#f3f4f6] px-3 py-2 text-xs text-[#434654]">
            {patientHubViewOnlyHint}
          </div>
        )}
        <div className="mb-3 flex gap-2 flex-wrap">
          {filterOptions.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setActiveStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeStatus === f.value ? 'bg-[#003d9b] text-white' : 'bg-[#edeef0] text-[#434654] hover:bg-[#e1e2e4]'}`}
            >{f.label}</button>
          ))}
          <input
            className="mr-auto border border-[#c3c6d6] rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#003d9b] focus:outline-none"
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          {isLoading && <div className="py-6 text-center text-sm text-[#737685]">جاري التحميل...</div>}
          {!isLoading && filteredItems.length === 0 && (
            <div className="py-8 text-center text-sm text-[#737685] border border-dashed border-[#c3c6d6] rounded-lg">
              {allItems.length === 0 ? "لا توجد متابعات مسجلة" : "لا توجد متابعات مطابقة"}
            </div>
          )}
          {!isLoading && filteredItems.map(item => {
            const isExpanded = expandedId === item.id;
            const st = deriveStatus(item);
            const pid = Number(item.patientId ?? 0);
            return (
              <div key={item.id} className="bg-white border border-[#c3c6d6] rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-3 hover:bg-[#f8f9fb] transition-colors text-right"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#191c1e] truncate">
                      {patientId <= 0 ? (item.patientFullName || `مريض #${pid}`) : (item.followupName || "متابعة")}
                      {item.patientCode && patientId <= 0 ? <span className="mr-1 text-xs font-normal text-[#737685]">({item.patientCode})</span> : null}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {statusBadgeVP(st)}
                      <span className="text-xs text-[#737685]">{formatDate(item.followupDate)}</span>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-[#737685] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="border-t border-[#c3c6d6] p-3 space-y-3 bg-[#f8f9fb]">
                    {(item.vaOD || item.vaOS) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white border border-[#c3c6d6] rounded p-2" style={{ backgroundColor: 'rgba(0,61,155,0.03)' }}>
                          <p className="text-[10px] font-bold uppercase text-[#526069] mb-1">OD (اليمنى)</p>
                          <p className="font-semibold text-sm text-[#191c1e]">{item.vaOD || "-"}</p>
                        </div>
                        <div className="bg-white border border-[#c3c6d6] rounded p-2">
                          <p className="text-[10px] font-bold uppercase text-[#526069] mb-1">OS (اليسرى)</p>
                          <p className="font-semibold text-sm text-[#191c1e]">{item.vaOS || "-"}</p>
                        </div>
                      </div>
                    )}
                    {item.treatment && <p className="text-xs text-[#434654] whitespace-pre-wrap">{item.treatment}</p>}
                    {item.notes && <p className="text-xs text-[#737685] italic whitespace-pre-wrap">{item.notes}</p>}
                    {pid > 0 && !patientHubReadOnly && (
                      <button type="button" className="text-xs text-[#003d9b] font-bold hover:underline"
                        onClick={() => setLocation(`/patient-file/${pid}`)}>← ملف المريض</button>
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
    <div className="min-h-screen bg-[#f8f9fb] text-[#191c1e]" dir="rtl" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#c3c6d6] rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#526069] mb-1">إجمالي المتابعات</p>
            <h3 className="text-4xl font-bold text-[#191c1e]">{stats.total.toLocaleString("ar-EG")}</h3>
            <p className="text-xs text-[#737685] mt-1 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> إجمالي السجلات
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-[#dae2ff] flex items-center justify-center text-[#003d9b]">
            <CalendarDays className="h-7 w-7" />
          </div>
        </div>
        <div className="bg-white border border-[#c3c6d6] rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#526069] mb-1">متابعة هذا الأسبوع</p>
            <h3 className="text-4xl font-bold text-[#191c1e]">{stats.thisWeek.toLocaleString("ar-EG")}</h3>
            <p className="text-xs text-[#526069] mt-1 flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" /> مواعيد مؤكدة
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-[#d3e2ed] flex items-center justify-center text-[#56656e]">
            <CalendarCheck className="h-7 w-7" />
          </div>
        </div>
        <div className="bg-white border border-[#c3c6d6] rounded-xl p-5 flex items-center justify-between shadow-sm border-[#ba1a1a]/20">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#526069] mb-1">متأخرة</p>
            <h3 className="text-4xl font-bold text-[#ba1a1a]">{stats.overdue.toLocaleString("ar-EG")}</h3>
            <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> تحتاج تواصل فوري
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-[#ffdad6] flex items-center justify-center text-[#93000a]">
            <AlertTriangle className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Filter + search + patient picker */}
      <div className="bg-white border border-[#c3c6d6] rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <button
              type="button"
              className="bg-[#003d9b] text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
              onClick={() => setLocation("/followup/0")}
            >
              <Plus className="h-4 w-4" />
              متابعة جديدة
            </button>
            <div className="h-5 w-px bg-[#c3c6d6] mx-1" />
            {filterOptions.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveStatus(f.value)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeStatus === f.value ? 'bg-[#003d9b] text-white' : 'bg-[#edeef0] text-[#434654] hover:bg-[#e7e8ea]'}`}
              >{f.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <input
                className="w-full pr-4 pl-4 py-2 border border-[#c3c6d6] rounded-lg focus:ring-2 focus:ring-[#003d9b] focus:outline-none text-sm"
                placeholder="بحث باسم المريض أو الكود أو الملاحظات..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="w-52">
              <PatientPicker
                initialPatientId={patientId > 0 ? patientId : undefined}
                onSelect={selected => { setPatientId(selected.id); setExpandedId(null); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards list */}
      <div className="space-y-4">
        {isLoading && (
          <div className="py-12 text-center text-[#737685]">جاري التحميل...</div>
        )}
        {!isLoading && filteredItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#c3c6d6] py-16 text-center text-[#737685]">
            {allItems.length === 0 ? "لا توجد متابعات مسجلة" : "لا توجد متابعات مطابقة للبحث"}
          </div>
        )}
        {!isLoading && filteredItems.map(item => {
          const isExpanded = expandedId === item.id;
          const st = deriveStatus(item);
          const pid = Number(item.patientId ?? 0);
          const isOverdue = st === "overdue";

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl overflow-hidden shadow-sm border transition-all ${isOverdue ? 'border-[#ba1a1a]/30' : 'border-[#c3c6d6]'} ${isExpanded ? 'ring-2 ring-[#003d9b]/20 shadow-lg' : ''}`}
            >
              <button
                type="button"
                className="w-full flex flex-col md:flex-row items-center gap-4 p-4 hover:bg-[#f8f9fb] transition-colors text-right cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#edeef0] text-[#003d9b]'}`}>
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <h4 className="font-semibold text-lg text-[#191c1e] truncate">
                    {patientId <= 0 ? (item.patientFullName || `مريض #${pid}`) : (item.followupName || "متابعة")}
                    {item.patientCode && patientId <= 0
                      ? <span className="mr-2 text-sm font-normal text-[#737685]">({item.patientCode})</span>
                      : null}
                  </h4>
                  <p className={`text-sm mt-1 flex items-center gap-1 ${isOverdue ? 'text-[#ba1a1a]' : 'text-[#526069]'}`}>
                    <CalendarCheck className="h-4 w-4" />
                    {patientId > 0 ? `${item.followupName || "متابعة"} — ` : ""}{formatDate(item.followupDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {statusBadgeVP(st)}
                  {item.sheetType && (
                    <span className="px-3 py-1 rounded-full bg-[#e1e2e4] text-[#434654] text-[11px] font-bold">
                      {SHEET_TYPE_LABEL[item.sheetType] ?? item.sheetType}
                    </span>
                  )}
                  <ChevronDown className={`h-5 w-5 text-[#737685] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#c3c6d6] bg-[#f8f9fb] p-5">
                  {isOverdue && (
                    <div className="mb-4 flex items-start gap-3 bg-[#ffdad6]/30 border border-[#ba1a1a]/20 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 text-[#ba1a1a] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-[#ba1a1a] text-sm">تنبيه: تأخر الموعد</p>
                        <p className="text-sm text-[#93000a]">يرجى الاتصال بالمريض لتأكيد موعد بديل</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(item.vaOD || item.vaOS || item.iopOD || item.iopOS) && (
                      <div className="space-y-4">
                        {(item.vaOD || item.vaOS) && (
                          <div>
                            <h5 className="font-bold text-[#003d9b] mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                              <CalendarCheck className="h-4 w-4" /> حدة الإبصار (Visual Acuity)
                            </h5>
                            <div className="flex gap-3">
                              <div className="flex-1 bg-white p-3 rounded-lg border border-[#c3c6d6]" style={{ backgroundColor: 'rgba(0,61,155,0.03)' }}>
                                <p className="text-[10px] text-[#526069] uppercase font-bold mb-1">العين اليمنى (OD)</p>
                                <p className="font-semibold text-base text-[#191c1e]">{item.vaOD || "-"}</p>
                              </div>
                              <div className="flex-1 bg-white p-3 rounded-lg border border-[#c3c6d6]">
                                <p className="text-[10px] text-[#526069] uppercase font-bold mb-1">العين اليسرى (OS)</p>
                                <p className="font-semibold text-base text-[#191c1e]">{item.vaOS || "-"}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {(item.iopOD || item.iopOS) && (
                          <div>
                            <h5 className="font-bold text-[#003d9b] mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                              ضغط العين (IOP)
                            </h5>
                            <div className="flex gap-3">
                              <div className="flex-1 bg-white p-3 rounded-lg border border-[#c3c6d6]" style={{ backgroundColor: 'rgba(0,61,155,0.03)' }}>
                                <p className="text-[10px] text-[#526069] uppercase font-bold mb-1">OD</p>
                                <p className="font-semibold text-base text-[#191c1e]">{item.iopOD ? `${item.iopOD} mmHg` : "-"}</p>
                              </div>
                              <div className="flex-1 bg-white p-3 rounded-lg border border-[#c3c6d6]">
                                <p className="text-[10px] text-[#526069] uppercase font-bold mb-1">OS</p>
                                <p className="font-semibold text-base text-[#191c1e]">{item.iopOS ? `${item.iopOS} mmHg` : "-"}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="space-y-4">
                      {item.treatment && (
                        <div>
                          <h5 className="font-bold text-[#003d9b] mb-2 text-sm uppercase tracking-wider">العلاج (Treatment)</h5>
                          <div className="bg-white p-3 rounded-lg border border-[#c3c6d6] min-h-[60px]">
                            <p className="text-sm text-[#191c1e] leading-relaxed whitespace-pre-wrap">{item.treatment}</p>
                          </div>
                        </div>
                      )}
                      {item.notes && (
                        <div>
                          <h5 className="font-bold text-[#003d9b] mb-2 text-sm uppercase tracking-wider">الملاحظات (Notes)</h5>
                          <div className="bg-white p-3 rounded-lg border border-[#c3c6d6] min-h-[60px]">
                            <p className="text-sm text-[#434654] italic leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                          </div>
                        </div>
                      )}
                      {!item.vaOD && !item.vaOS && !item.iopOD && !item.treatment && !item.notes && (
                        <div className="py-6 text-center text-[#737685] text-sm">لا توجد بيانات مسجلة لهذه المتابعة</div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-[#c3c6d6] mt-4">
                    {pid > 0 && (
                      <button
                        type="button"
                        className="px-4 py-2 text-[#003d9b] font-bold hover:bg-[#dae2ff]/20 rounded-lg transition-colors text-sm"
                        onClick={() => setLocation(patientHubReadOnly
                          ? `/patient-hub/examination/${pid}${typeof window !== "undefined" ? window.location.search : ""}`
                          : `/patient-file/${pid}`)}
                      >
                        ملف المريض
                      </button>
                    )}
                    <button
                      type="button"
                      className="px-4 py-2 bg-[#003d9b] text-white font-bold rounded-lg hover:opacity-90 shadow-sm transition-all text-sm active:scale-95"
                      onClick={() => setExpandedId(null)}
                    >إغلاق</button>
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
