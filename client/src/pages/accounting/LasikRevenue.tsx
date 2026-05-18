import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { getErrorContext } from "@/lib/errorMessages";
import type {
  ServiceRevenueDetail,
  ServiceRevenueInput,
  ServiceRevenueOutput,
  ServiceRevenueSection,
} from "@shared/accounting/contracts";
import {
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  Printer,
  RefreshCw,
  Search,
  ClipboardList,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import AccountingShell from "./AccountingShell";
import styles from "./LasikRevenue.module.css";
import {
  formatCountAr,
  formatDateAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";

type ServiceRevenueQuery = {
  data?: ServiceRevenueOutput;
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    serviceRevenue: {
      useQuery: (
        input: ServiceRevenueInput,
        options?: { refetchOnWindowFocus?: boolean },
      ) => ServiceRevenueQuery;
    };
  };
};

const accountingTrpc = trpc as unknown as AccountingTrpc;
const DEFAULT_SECTION_CODE = 15;

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDateRange() {
  const today = new Date();
  return {
    fromDate: toDateInputValue(today),
    toDate: toDateInputValue(today),
  };
}

function parseQueryString(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

function readFilters(search: string): ServiceRevenueInput {
  const defaults = defaultDateRange();
  const params = parseQueryString(search);
  const sectionRaw = params.get("sectionCode");
  const sectionParsed =
    sectionRaw != null && sectionRaw !== "" ? Number(sectionRaw) : NaN;
  const sectionCode = Number.isFinite(sectionParsed)
    ? sectionParsed
    : DEFAULT_SECTION_CODE;
  const doctorCode = params.get("doctorCode")?.trim() || undefined;
  const serviceCode = params.get("serviceCode")?.trim() || undefined;

  return {
    fromDate: params.get("fromDate") || defaults.fromDate,
    toDate: params.get("toDate") || defaults.toDate,
    sectionCode,
    doctorCode,
    serviceCode,
  };
}

function buildServiceRevenueUrl(input: ServiceRevenueInput) {
  const params = new URLSearchParams();
  params.set("fromDate", input.fromDate);
  params.set("toDate", input.toDate);

  if (input.sectionCode != null && input.sectionCode !== DEFAULT_SECTION_CODE) {
    params.set("sectionCode", String(input.sectionCode));
  }

  if (input.doctorCode?.trim()) {
    params.set("doctorCode", input.doctorCode.trim());
  }

  if (input.serviceCode?.trim()) {
    params.set("serviceCode", input.serviceCode.trim());
  }

  const qs = params.toString();
  return qs
    ? `/accounting/service-revenue?${qs}`
    : "/accounting/service-revenue";
}

function serviceGroupLabel(serviceCode: string, serviceName?: string | null) {
  return serviceName
    ? `${toArabicDigits(serviceCode)} — ${serviceName}`
    : toArabicDigits(serviceCode);
}

function getServiceTotals(details: ServiceRevenueDetail[]) {
  return details.reduce(
    (acc, d) => ({
      quantity: acc.quantity + d.quantity,
      price: acc.price + d.price,
      patientShare: acc.patientShare + d.patientShare,
      discount: acc.discount + d.discount,
      patientTotal: acc.patientTotal + d.patientTotal,
      companyTotal: acc.companyTotal + d.companyTotal,
    }),
    {
      quantity: 0,
      price: 0,
      patientShare: 0,
      discount: 0,
      patientTotal: 0,
      companyTotal: 0,
    },
  );
}

function getSectionTotals(section: ServiceRevenueSection) {
  return section.services.reduce(
    (acc, svc) => {
      const t = getServiceTotals(svc.details ?? []);
      return {
        quantity: acc.quantity + t.quantity,
        price: acc.price + t.price,
        patientShare: acc.patientShare + t.patientShare,
        discount: acc.discount + t.discount,
        patientTotal: acc.patientTotal + t.patientTotal,
        companyTotal: acc.companyTotal + t.companyTotal,
      };
    },
    {
      quantity: 0,
      price: 0,
      patientShare: 0,
      discount: 0,
      patientTotal: 0,
      companyTotal: 0,
    },
  );
}

function LoadingRows() {
  return (
    <table className={styles.loadingTable} aria-hidden>
      <tbody>
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: 9 }).map((__, cellIndex) => (
              <td key={cellIndex}>
                <Skeleton className="h-5 w-full min-w-16" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LasikRevenue() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const filters = useMemo(() => readFilters(search), [search]);
  const [draft, setDraft] = useState(filters);
  const [dateError, setDateError] = useState("");
  const [debouncedDoctor, setDebouncedDoctor] = useState(
    filters.doctorCode ?? "",
  );
  const [debouncedService, setDebouncedService] = useState(
    filters.serviceCode ?? "",
  );

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDoctor(draft.doctorCode ?? "");
      setDebouncedService(draft.serviceCode ?? "");
    }, 300);
    return () => clearTimeout(handler);
  }, [draft.doctorCode, draft.serviceCode]);

  const doctorLookup = accountingTrpc.accounting.doctorLookup.useQuery(
    { doctorCode: debouncedDoctor },
    { enabled: debouncedDoctor.length > 0 },
  );

  const serviceLookup = accountingTrpc.accounting.serviceLookup.useQuery(
    { serviceCode: debouncedService, sectionCode: draft.sectionCode },
    { enabled: debouncedService.length > 0 },
  );

  useEffect(() => {
    setDraft(filters);
    setDateError("");
  }, [filters]);

  const serviceRevenueQuery = accountingTrpc.accounting.serviceRevenue.useQuery(
    filters,
    {
      refetchOnWindowFocus: false,
    },
  );

  const sections = serviceRevenueQuery.data?.sections ?? [];
  const frontendGrandTotal = useMemo(() => {
    return sections.reduce(
      (acc, section) => {
        const t = getSectionTotals(section);
        return {
          quantity: acc.quantity + t.quantity,
          price: acc.price + t.price,
          patientShare: acc.patientShare + t.patientShare,
          discount: acc.discount + t.discount,
          patientTotal: acc.patientTotal + t.patientTotal,
          companyTotal: acc.companyTotal + t.companyTotal,
        };
      },
      {
        quantity: 0,
        price: 0,
        patientShare: 0,
        discount: 0,
        patientTotal: 0,
        companyTotal: 0,
      },
    );
  }, [sections]);

  const [collapsedServices, setCollapsedServices] = useState<
    Record<string, boolean>
  >({});

  const toggleService = (sectionCode: number, serviceCode: string) => {
    const key = `${sectionCode}:${serviceCode}`;
    setCollapsedServices((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyFilters = () => {
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setDateError("تاريخ البداية بعد تاريخ النهاية");
      return;
    }
    setDateError("");
    setLocation(buildServiceRevenueUrl(draft));
  };

  const resetFilters = () => {
    const defaults = defaultDateRange();
    const next: ServiceRevenueInput = {
      ...defaults,
      sectionCode: DEFAULT_SECTION_CODE,
      doctorCode: undefined,
      serviceCode: undefined,
    };
    setDraft(next);
    setLocation(buildServiceRevenueUrl(next));
  };

  const printReport = () => {
    const printClass = "print-service-revenue";
    const cleanup = () => {
      document.body.classList.remove(printClass);
      window.removeEventListener("afterprint", cleanup);
    };
    document.body.classList.add(printClass);
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1000);
  };

  return (
    <AccountingShell>
      <div className="space-y-4 sm:space-y-5 md:space-y-6" dir="rtl">
        <Card className={`${styles.noPrint} border-border shadow-sm`}>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl tracking-tight">
                  إيراد الخدمات
                </CardTitle>
                <CardDescription className="mt-1 text-sm">
                  مراجعة إيرادات خدمات الليزك مجمعة حسب القسم والخدمة.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void serviceRevenueQuery.refetch()}
                  disabled={serviceRevenueQuery.isFetching}
                  aria-label="تحديث بيانات إيراد الخدمات"
                >
                  <RefreshCw
                    className={
                      serviceRevenueQuery.isFetching ? "animate-spin" : ""
                    }
                    aria-hidden
                  />
                  تحديث
                </Button>
                <Button
                  type="button"
                  onClick={printReport}
                  disabled={
                    serviceRevenueQuery.isLoading || sections.length === 0
                  }
                  aria-label="طباعة تقرير إيراد الخدمات"
                >
                  <Printer className="ml-2 h-4 w-4" aria-hidden />
                  طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 md:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <label
              htmlFor="lasik-from-date"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>من تاريخ</span>
              <Input
                id="lasik-from-date"
                type="date"
                value={draft.fromDate}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({
                    ...prev,
                    fromDate: event.target.value,
                  }))
                }
              />
            </label>
            <label
              htmlFor="lasik-to-date"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>إلى تاريخ</span>
              <Input
                id="lasik-to-date"
                type="date"
                value={draft.toDate}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({ ...prev, toDate: event.target.value }))
                }
              />
            </label>
            <label
              htmlFor="lasik-section-code"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>كود القسم</span>
              <Input
                id="lasik-section-code"
                type="number"
                min={1}
                value={draft.sectionCode ?? DEFAULT_SECTION_CODE}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({
                    ...prev,
                    sectionCode: Number(
                      event.target.value || DEFAULT_SECTION_CODE,
                    ),
                  }))
                }
              />
            </label>
            <label
              htmlFor="lasik-doctor-code"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>كود الطبيب</span>
              <Input
                id="lasik-doctor-code"
                value={draft.doctorCode ?? ""}
                placeholder="اختياري"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({
                    ...prev,
                    doctorCode: event.target.value.trim() || undefined,
                  }))
                }
              />
              {draft.doctorCode && (
                <span className="text-xs text-muted-foreground block mt-1">
                  {doctorLookup.isLoading
                    ? "جاري البحث..."
                    : doctorLookup.data
                      ? `الاسم: ${doctorLookup.data.doctorName}`
                      : "غير موجود"}
                </span>
              )}
            </label>
            <label
              htmlFor="lasik-service-code"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>كود الخدمة</span>
              <Input
                id="lasik-service-code"
                value={draft.serviceCode ?? ""}
                placeholder="اختياري"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({
                    ...prev,
                    serviceCode: event.target.value.trim() || undefined,
                  }))
                }
              />
              {draft.serviceCode && (
                <span className="text-xs text-muted-foreground block mt-1">
                  {serviceLookup.isLoading
                    ? "جاري البحث..."
                    : serviceLookup.data
                      ? `الاسم: ${serviceLookup.data.serviceName}`
                      : "غير موجود"}
                </span>
              )}
            </label>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={applyFilters}
                aria-label="تطبيق الفلاتر"
              >
                <Search className="ml-2 h-4 w-4" aria-hidden />
                تطبيق
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                aria-label="إعادة ضبط الفلاتر"
              >
                إعادة ضبط
              </Button>
            </div>
          </CardContent>
        </Card>

        {serviceRevenueQuery.isError ? (
          <Card className={`${styles.noPrint} border-error/30 bg-error/5`}>
            <CardContent className="flex items-start gap-3 py-5">
              <div className="rounded-lg bg-error/10 p-2 text-error">
                <CircleAlert className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {getErrorContext(serviceRevenueQuery.error.message).title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getErrorContext(serviceRevenueQuery.error.message).hint}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card
          data-print-service-revenue-table
          className={`${styles.printScope} border-border shadow-sm`}
        >
          <CardHeader>
            <CardTitle className="text-base">
              تفاصيل إيرادات الأقسام والخدمات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.printMeta}>
              <p className={styles.printMetaTitle}>إيراد الخدمات</p>
              <p>
                الفترة: من {formatDateAr(filters.fromDate)} إلى{" "}
                {formatDateAr(filters.toDate)}
              </p>
              <p>
                كود القسم:{" "}
                {toArabicDigits(
                  String(filters.sectionCode ?? DEFAULT_SECTION_CODE),
                )}
                {filters.doctorCode
                  ? ` | كود الطبيب: ${toArabicDigits(filters.doctorCode)}`
                  : ""}
                {filters.serviceCode
                  ? ` | كود الخدمة: ${toArabicDigits(filters.serviceCode)}`
                  : ""}
              </p>
            </div>
            <div className="sm:hidden">
              {serviceRevenueQuery.isLoading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                    >
                      <Skeleton className="h-4 w-32" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((__, j) => (
                          <div
                            key={j}
                            className="rounded-xl border border-border bg-muted p-3"
                          >
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="mt-2 h-4 w-16" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {!serviceRevenueQuery.isLoading && sections.length === 0 ? (
                <div
                  className={`${styles.emptyState} text-muted-foreground flex flex-col items-center justify-center gap-2`}
                >
                  <ClipboardList
                    className="h-8 w-8 text-muted-foreground/60"
                    aria-hidden
                  />
                  <span>لا توجد بيانات لإيراد الخدمات للفلاتر المختارة.</span>
                </div>
              ) : null}

              {!serviceRevenueQuery.isLoading && sections.length > 0 ? (
                <div className="grid gap-3">
                  {sections.map((section) => {
                    const sectionTotals = getSectionTotals(section);
                    return (
                      <div
                        key={section.sectionCode}
                        className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500">
                              القسم:{" "}
                              {toArabicDigits(
                                section.sectionName || section.sectionCode,
                              )}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              إيراد الخدمات
                            </div>
                          </div>
                          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {formatCountAr(sectionTotals.quantity)} خدمة
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-muted px-3 py-2">
                            <div className="text-[10px] text-slate-500">
                              إجمالي المريض
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                              {formatMoneyAr(sectionTotals.patientTotal)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-muted px-3 py-2">
                            <div className="text-[10px] text-slate-500">
                              إجمالي الجهة
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                              {formatMoneyAr(sectionTotals.companyTotal)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {section.services.map((service) => {
                            const key = `${section.sectionCode}:${service.serviceCode}`;
                            const collapsed = Boolean(collapsedServices[key]);
                            const details = service.details ?? [];
                            const serviceTotals = getServiceTotals(details);

                            return (
                              <div
                                key={key}
                                className="rounded-2xl border border-border bg-muted p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[11px] text-slate-500">
                                      الخدمة:{" "}
                                      {serviceGroupLabel(
                                        service.serviceCode,
                                        service.serviceName,
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs font-medium text-foreground">
                                      {formatCountAr(serviceTotals.quantity)}{" "}
                                      بند
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-9 w-9 shrink-0 px-2"
                                    onClick={() =>
                                      toggleService(
                                        section.sectionCode,
                                        service.serviceCode,
                                      )
                                    }
                                  >
                                    {collapsed ? (
                                      <ChevronLeft className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                  <div className="rounded-xl bg-background px-3 py-2">
                                    <div className="text-[10px] text-slate-500">
                                      إجمالي المريض
                                    </div>
                                    <div className="mt-1 font-semibold tabular-nums text-foreground">
                                      {formatMoneyAr(
                                        serviceTotals.patientTotal,
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-xl bg-background px-3 py-2">
                                    <div className="text-[10px] text-slate-500">
                                      إجمالي الجهة
                                    </div>
                                    <div className="mt-1 font-semibold tabular-nums text-foreground">
                                      {formatMoneyAr(
                                        serviceTotals.companyTotal,
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {!collapsed ? (
                                  <div className="mt-3 space-y-2">
                                    {details.map((detail, dIdx) => (
                                      <div
                                        key={`${key}-${detail.trNo}-${dIdx}`}
                                        className="rounded-xl border border-border bg-background p-3"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="text-[11px] text-slate-500">
                                              {toArabicDigits(detail.trNo)}
                                            </div>
                                            <div className="mt-1 text-sm font-medium text-foreground">
                                              {detail.patientName || "-"}
                                            </div>
                                          </div>
                                          <div className="text-[11px] text-slate-500">
                                            {formatDateAr(detail.trDate)}
                                          </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                          <div className="rounded-lg bg-muted px-2.5 py-2">
                                            <div className="text-[10px] text-slate-500">
                                              العدد
                                            </div>
                                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                                              {formatCountAr(detail.quantity)}
                                            </div>
                                          </div>
                                          <div className="rounded-lg bg-muted px-2.5 py-2">
                                            <div className="text-[10px] text-slate-500">
                                              السعر
                                            </div>
                                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                                              {formatMoneyAr(detail.price)}
                                            </div>
                                          </div>
                                          <div className="rounded-lg bg-muted px-2.5 py-2">
                                            <div className="text-[10px] text-slate-500">
                                              ما يخص المريض
                                            </div>
                                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                                              {formatMoneyAr(
                                                detail.patientShare,
                                              )}
                                            </div>
                                          </div>
                                          <div className="rounded-lg bg-muted px-2.5 py-2">
                                            <div className="text-[10px] text-slate-500">
                                              الخصم
                                            </div>
                                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                                              {formatMoneyAr(detail.discount)}
                                            </div>
                                          </div>
                                          <div className="rounded-lg bg-emerald-50 px-2.5 py-2">
                                            <div className="text-[10px] text-emerald-700">
                                              إجمالي المريض
                                            </div>
                                            <div className="mt-1 font-semibold tabular-nums text-emerald-700">
                                              {formatMoneyAr(
                                                detail.patientTotal,
                                              )}
                                            </div>
                                          </div>
                                          <div className="rounded-lg bg-blue-50 px-2.5 py-2">
                                            <div className="text-[10px] text-blue-700">
                                              إجمالي الجهة
                                            </div>
                                            <div className="mt-1 font-semibold tabular-nums text-blue-700">
                                              {formatMoneyAr(
                                                detail.companyTotal,
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-3 rounded-xl bg-background px-3 py-2 text-xs text-slate-500">
                                    التفاصيل مطوية
                                  </div>
                                )}

                                <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2">
                                  <div className="text-[10px] text-blue-700">
                                    إجمالي الخدمة
                                  </div>
                                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                                    <div className="font-semibold tabular-nums text-blue-700">
                                      {formatMoneyAr(
                                        serviceTotals.patientTotal,
                                      )}
                                    </div>
                                    <div className="font-semibold tabular-nums text-blue-700 text-left">
                                      {formatMoneyAr(
                                        serviceTotals.companyTotal,
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 rounded-2xl bg-blue-50 px-3 py-2">
                          <div className="text-[10px] text-blue-700">
                            إجمالي القسم
                          </div>
                          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                            <div className="font-semibold tabular-nums text-blue-700">
                              {formatMoneyAr(sectionTotals.patientTotal)}
                            </div>
                            <div className="font-semibold tabular-nums text-blue-700 text-left">
                              {formatMoneyAr(sectionTotals.companyTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <div className="text-xs font-semibold text-foreground">
                      الإجمالي العام
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-background px-3 py-2">
                        <div className="text-[10px] text-slate-500">
                          إجمالي المريض
                        </div>
                        <div className="mt-1 font-semibold tabular-nums text-foreground">
                          {formatMoneyAr(frontendGrandTotal.patientTotal)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-background px-3 py-2">
                        <div className="text-[10px] text-slate-500">
                          إجمالي الجهة
                        </div>
                        <div className="mt-1 font-semibold tabular-nums text-foreground">
                          {formatMoneyAr(frontendGrandTotal.companyTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden sm:block">
              <div className={styles.reportWrap}>
                {serviceRevenueQuery.isLoading ? <LoadingRows /> : null}

                {!serviceRevenueQuery.isLoading && sections.length === 0 ? (
                  <div
                    className={`${styles.emptyState} text-muted-foreground flex flex-col items-center justify-center gap-2`}
                  >
                    <ClipboardList
                      className="h-8 w-8 text-muted-foreground/60"
                      aria-hidden
                    />
                    <span>لا توجد بيانات لإيراد الخدمات للفلاتر المختارة.</span>
                  </div>
                ) : null}

                {!serviceRevenueQuery.isLoading && sections.length > 0 ? (
                  <table
                    className={`${styles.gridTable} ${styles.revenueMasterTable}`}
                  >
                    <colgroup>
                      <col style={{ width: "7%", minWidth: "70px" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "28%" }} />
                      <col style={{ width: "6%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col" style={{ whiteSpace: "nowrap" }}>
                          رقم الإيصال
                        </th>
                        <th scope="col" style={{ whiteSpace: "nowrap" }}>
                          تاريخ الإيصال
                        </th>
                        <th scope="col">المريض</th>
                        <th scope="col" className={styles.numeric}>
                          العدد
                        </th>
                        <th scope="col" className={styles.numeric}>
                          السعر
                        </th>
                        <th scope="col" className={styles.numeric}>
                          ما يخص المريض
                        </th>
                        <th scope="col" className={styles.numeric}>
                          الخصم
                        </th>
                        <th scope="col" className={styles.numeric}>
                          إجمالي المريض
                        </th>
                        <th scope="col" className={styles.numeric}>
                          إجمالي الجهة
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.flatMap((section) => {
                        const sectionTotals = getSectionTotals(section);
                        const sectionRows = [
                          <tr
                            key={`section-${section.sectionCode}`}
                            className={styles.groupBannerRow}
                          >
                            <td colSpan={9}>
                              القسم:{" "}
                              {toArabicDigits(
                                section.sectionName || section.sectionCode,
                              )}
                            </td>
                          </tr>,
                        ];

                        for (const service of section.services) {
                          const key = `${section.sectionCode}:${service.serviceCode}`;
                          const collapsed = Boolean(collapsedServices[key]);
                          const details = service.details ?? [];
                          const serviceTotals = getServiceTotals(details);

                          sectionRows.push(
                            <tr
                              key={`service-${key}`}
                              className={styles.groupBannerRow}
                            >
                              <td colSpan={9}>
                                <div
                                  className={styles.groupBannerInner}
                                  dir="rtl"
                                >
                                  <span className="min-w-0 text-right">
                                    الخدمة:{" "}
                                    {serviceGroupLabel(
                                      service.serviceCode,
                                      service.serviceName,
                                    )}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className={`${styles.noPrint} h-10 w-10 shrink-0 px-2`}
                                    onClick={() =>
                                      toggleService(
                                        section.sectionCode,
                                        service.serviceCode,
                                      )
                                    }
                                  >
                                    {collapsed ? (
                                      <ChevronLeft className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>,
                          );

                          if (!collapsed) {
                            for (const [dIdx, detail] of details.entries()) {
                              sectionRows.push(
                                <tr key={`${key}-${detail.trNo}-${dIdx}`}>
                                  <td
                                    data-label="رقم الإيصال"
                                    className={styles.numeric}
                                  >
                                    {toArabicDigits(detail.trNo)}
                                  </td>
                                  <td
                                    data-label="تاريخ الإيصال"
                                    className={styles.numeric}
                                  >
                                    {formatDateAr(detail.trDate)}
                                  </td>
                                  <td data-label="المريض">
                                    {detail.patientName || "-"}
                                  </td>
                                  <td
                                    data-label="العدد"
                                    className={styles.numeric}
                                  >
                                    {formatCountAr(detail.quantity)}
                                  </td>
                                  <td
                                    data-label="السعر"
                                    className={styles.numeric}
                                  >
                                    {formatMoneyAr(detail.price)}
                                  </td>
                                  <td
                                    data-label="ما يخص المريض"
                                    className={styles.numeric}
                                  >
                                    {formatMoneyAr(detail.patientShare)}
                                  </td>
                                  <td
                                    data-label="الخصم"
                                    className={styles.numeric}
                                  >
                                    {formatMoneyAr(detail.discount)}
                                  </td>
                                  <td
                                    data-label="إجمالي المريض"
                                    className={styles.numeric}
                                  >
                                    {formatMoneyAr(detail.patientTotal)}
                                  </td>
                                  <td
                                    data-label="إجمالي الجهة"
                                    className={styles.numeric}
                                  >
                                    {formatMoneyAr(detail.companyTotal)}
                                  </td>
                                </tr>,
                              );
                            }

                            sectionRows.push(
                              <tr
                                key={`subtotal-${key}`}
                                className={styles.serviceSubtotalRow}
                              >
                                <td colSpan={3}>إجمالي الخدمة</td>
                                <td className={styles.numeric}>
                                  {formatCountAr(serviceTotals.quantity)}
                                </td>
                                <td className={styles.numeric}>
                                  {formatMoneyAr(serviceTotals.price)}
                                </td>
                                <td className={styles.numeric}>
                                  {formatMoneyAr(serviceTotals.patientShare)}
                                </td>
                                <td className={styles.numeric}>
                                  {formatMoneyAr(serviceTotals.discount)}
                                </td>
                                <td className={styles.numeric}>
                                  {formatMoneyAr(serviceTotals.patientTotal)}
                                </td>
                                <td className={styles.numeric}>
                                  {formatMoneyAr(serviceTotals.companyTotal)}
                                </td>
                              </tr>,
                            );
                          }
                        }

                        sectionRows.push(
                          <tr
                            key={`section-total-${section.sectionCode}`}
                            className={styles.sectionTotalRow}
                          >
                            <td colSpan={3}>إجمالي القسم</td>
                            <td className={styles.numeric}>
                              {formatCountAr(sectionTotals.quantity)}
                            </td>
                            <td className={styles.numeric}>
                              {formatMoneyAr(sectionTotals.price)}
                            </td>
                            <td className={styles.numeric}>
                              {formatMoneyAr(sectionTotals.patientShare)}
                            </td>
                            <td className={styles.numeric}>
                              {formatMoneyAr(sectionTotals.discount)}
                            </td>
                            <td className={styles.numeric}>
                              {formatMoneyAr(sectionTotals.patientTotal)}
                            </td>
                            <td className={styles.numeric}>
                              {formatMoneyAr(sectionTotals.companyTotal)}
                            </td>
                          </tr>,
                        );

                        return sectionRows;
                      })}
                    </tbody>
                    <tfoot>
                      <tr className={styles.periodTotalRow}>
                        <td colSpan={3}>الإجمالي العام</td>
                        <td data-label="العدد" className={styles.numeric}>
                          {formatCountAr(frontendGrandTotal.quantity)}
                        </td>
                        <td data-label="السعر" className={styles.numeric}>
                          {formatMoneyAr(frontendGrandTotal.price)}
                        </td>
                        <td
                          data-label="ما يخص المريض"
                          className={styles.numeric}
                        >
                          {formatMoneyAr(frontendGrandTotal.patientShare)}
                        </td>
                        <td data-label="الخصم" className={styles.numeric}>
                          {formatMoneyAr(frontendGrandTotal.discount)}
                        </td>
                        <td
                          data-label="إجمالي المريض"
                          className={styles.numeric}
                        >
                          {formatMoneyAr(frontendGrandTotal.patientTotal)}
                        </td>
                        <td
                          data-label="إجمالي الجهة"
                          className={styles.numeric}
                        >
                          {formatMoneyAr(frontendGrandTotal.companyTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountingShell>
  );
}
