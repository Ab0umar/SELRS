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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import AccountingShell from "./AccountingShell";
import styles from "./LasikRevenue.module.css";
import { formatCountAr, formatDateAr, formatMoneyAr, toArabicDigits } from "./accountingFormat";

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
  const sectionParsed = sectionRaw != null && sectionRaw !== "" ? Number(sectionRaw) : NaN;
  const sectionCode = Number.isFinite(sectionParsed) ? sectionParsed : DEFAULT_SECTION_CODE;
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

  if (
    input.sectionCode != null &&
    input.sectionCode !== DEFAULT_SECTION_CODE
  ) {
    params.set("sectionCode", String(input.sectionCode));
  }

  if (input.doctorCode?.trim()) {
    params.set("doctorCode", input.doctorCode.trim());
  }

  if (input.serviceCode?.trim()) {
    params.set("serviceCode", input.serviceCode.trim());
  }

  const qs = params.toString();
  return qs ? `/accounting/service-revenue?${qs}` : "/accounting/service-revenue";
}

function serviceGroupLabel(serviceCode: string, serviceName?: string | null) {
  return serviceName ? `${toArabicDigits(serviceCode)} — ${serviceName}` : toArabicDigits(serviceCode);
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
    { quantity: 0, price: 0, patientShare: 0, discount: 0, patientTotal: 0, companyTotal: 0 }
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
    { quantity: 0, price: 0, patientShare: 0, discount: 0, patientTotal: 0, companyTotal: 0 }
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
  const [debouncedDoctor, setDebouncedDoctor] = useState(filters.doctorCode ?? "");
  const [debouncedService, setDebouncedService] = useState(filters.serviceCode ?? "");

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
    { enabled: debouncedDoctor.length > 0 }
  );
  
  const serviceLookup = accountingTrpc.accounting.serviceLookup.useQuery(
    { serviceCode: debouncedService, sectionCode: draft.sectionCode },
    { enabled: debouncedService.length > 0 }
  );

  useEffect(() => {
    setDraft(filters);
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
      { quantity: 0, price: 0, patientShare: 0, discount: 0, patientTotal: 0, companyTotal: 0 }
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
      <div className="space-y-4" dir="rtl">
        <Card className={`${styles.noPrint} border-border/80 shadow-sm`}>
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
                >
                  <RefreshCw
                    className={
                      serviceRevenueQuery.isFetching ? "animate-spin" : ""
                    }
                  />
                  تحديث
                </Button>
                <Button
                  type="button"
                  onClick={printReport}
                  disabled={serviceRevenueQuery.isLoading || sections.length === 0}
                >
                  <Printer className="ml-2 h-4 w-4" />
                  طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-6">
            <label className="space-y-1.5 text-sm font-medium">
              <span>من تاريخ</span>
              <Input
                type="date"
                value={draft.fromDate}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({ ...prev, fromDate: event.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>إلى تاريخ</span>
              <Input
                type="date"
                value={draft.toDate}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({ ...prev, toDate: event.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود القسم</span>
              <Input
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
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود الطبيب</span>
              <Input
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
                  {doctorLookup.isLoading ? "جاري البحث..." : doctorLookup.data ? `الاسم: ${doctorLookup.data.doctorName}` : "غير موجود"}
                </span>
              )}
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود الخدمة</span>
              <Input
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
                  {serviceLookup.isLoading ? "جاري البحث..." : serviceLookup.data ? `الاسم: ${serviceLookup.data.serviceName}` : "غير موجود"}
                </span>
              )}
            </label>
            <div className="flex items-end gap-2">
              <Button type="button" className="flex-1" onClick={applyFilters}>
                <Search className="ml-2 h-4 w-4" />
                تطبيق
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                إعادة ضبط
              </Button>
            </div>
          </CardContent>
        </Card>

        {serviceRevenueQuery.isError ? (
          <Card className={`${styles.noPrint} border-destructive/30 bg-destructive/5`}>
            <CardContent className="flex items-start gap-3 py-5">
              <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                <CircleAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  تعذر تحميل بيانات إيراد الخدمات
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {serviceRevenueQuery.error.message ||
                    "تأكد من الاتصال بقاعدة بيانات الحسابات."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className={`${styles.printScope} border-border/80 shadow-sm`}>
          <CardHeader>
            <CardTitle className="text-base">تفاصيل إيرادات الأقسام والخدمات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.printMeta}>
              <p className={styles.printMetaTitle}>إيراد الخدمات</p>
              <p>الفترة: من {formatDateAr(filters.fromDate)} إلى {formatDateAr(filters.toDate)}</p>
              <p>
                كود القسم: {toArabicDigits(String(filters.sectionCode ?? DEFAULT_SECTION_CODE))}
                {filters.doctorCode ? ` | كود الطبيب: ${toArabicDigits(filters.doctorCode)}` : ""}
                {filters.serviceCode ? ` | كود الخدمة: ${toArabicDigits(filters.serviceCode)}` : ""}
              </p>
            </div>
            <div className={styles.reportWrap}>
              {serviceRevenueQuery.isLoading ? <LoadingRows /> : null}

              {!serviceRevenueQuery.isLoading && sections.length === 0 ? (
                <div className={`${styles.emptyState} text-muted-foreground`}>
                  لا توجد بيانات لإيراد الخدمات للفلاتر المختارة.
                </div>
              ) : null}

              {!serviceRevenueQuery.isLoading && sections.length > 0 ? (
                <table className={`${styles.gridTable} ${styles.revenueMasterTable}`}>
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
                      <th scope="col" style={{ whiteSpace: "nowrap" }}>رقم الإيصال</th>
                      <th scope="col" style={{ whiteSpace: "nowrap" }}>تاريخ الإيصال</th>
                      <th scope="col">المريض</th>
                      <th scope="col" className={styles.numeric}>العدد</th>
                      <th scope="col" className={styles.numeric}>السعر</th>
                      <th scope="col" className={styles.numeric}>ما يخص المريض</th>
                      <th scope="col" className={styles.numeric}>الخصم</th>
                      <th scope="col" className={styles.numeric}>إجمالي المريض</th>
                      <th scope="col" className={styles.numeric}>إجمالي الجهة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.flatMap((section) => {
                      const sectionTotals = getSectionTotals(section);
                      const sectionRows = [
                        <tr key={`section-${section.sectionCode}`} className={styles.groupBannerRow}>
                          <td colSpan={9}>
                            القسم: {toArabicDigits(section.sectionName || section.sectionCode)}
                          </td>
                        </tr>,
                      ];

                      for (const service of section.services) {
                        const key = `${section.sectionCode}:${service.serviceCode}`;
                        const collapsed = Boolean(collapsedServices[key]);
                        const details = service.details ?? [];
                        const serviceTotals = getServiceTotals(details);

                        sectionRows.push(
                          <tr key={`service-${key}`} className={styles.groupBannerRow}>
                            <td colSpan={9}>
                              <div className={styles.groupBannerInner} dir="rtl">
                                <span className="min-w-0 text-right">
                                  الخدمة: {serviceGroupLabel(service.serviceCode, service.serviceName)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`${styles.noPrint} h-8 shrink-0 px-2`}
                                  onClick={() => toggleService(section.sectionCode, service.serviceCode)}
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
                                <td className={styles.numeric}>{toArabicDigits(detail.trNo)}</td>
                                <td className={styles.numeric}>{formatDateAr(detail.trDate)}</td>
                                <td>{detail.patientName || "-"}</td>
                                <td className={styles.numeric}>{formatCountAr(detail.quantity)}</td>
                                <td className={styles.numeric}>{formatMoneyAr(detail.price)}</td>
                                <td className={styles.numeric}>{formatMoneyAr(detail.patientShare)}</td>
                                <td className={styles.numeric}>{formatMoneyAr(detail.discount)}</td>
                                <td className={styles.numeric}>{formatMoneyAr(detail.patientTotal)}</td>
                                <td className={styles.numeric}>{formatMoneyAr(detail.companyTotal)}</td>
                              </tr>,
                            );
                          }

                          sectionRows.push(
                            <tr key={`subtotal-${key}`} className={styles.serviceSubtotalRow}>
                              <td colSpan={3}>إجمالي الخدمة</td>
                              <td className={styles.numeric}>{formatCountAr(serviceTotals.quantity)}</td>
                              <td className={styles.numeric}>{formatMoneyAr(serviceTotals.price)}</td>
                              <td className={styles.numeric}>{formatMoneyAr(serviceTotals.patientShare)}</td>
                              <td className={styles.numeric}>{formatMoneyAr(serviceTotals.discount)}</td>
                              <td className={styles.numeric}>{formatMoneyAr(serviceTotals.patientTotal)}</td>
                              <td className={styles.numeric}>{formatMoneyAr(serviceTotals.companyTotal)}</td>
                            </tr>,
                          );
                        }
                      }

                      sectionRows.push(
                        <tr key={`section-total-${section.sectionCode}`} className={styles.sectionTotalRow}>
                          <td colSpan={3}>إجمالي القسم</td>
                          <td className={styles.numeric}>{formatCountAr(sectionTotals.quantity)}</td>
                          <td className={styles.numeric}>{formatMoneyAr(sectionTotals.price)}</td>
                          <td className={styles.numeric}>{formatMoneyAr(sectionTotals.patientShare)}</td>
                          <td className={styles.numeric}>{formatMoneyAr(sectionTotals.discount)}</td>
                          <td className={styles.numeric}>{formatMoneyAr(sectionTotals.patientTotal)}</td>
                          <td className={styles.numeric}>{formatMoneyAr(sectionTotals.companyTotal)}</td>
                        </tr>,
                      );

                      return sectionRows;
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={styles.periodTotalRow}>
                      <td colSpan={3}>الإجمالي العام</td>
                      <td className={styles.numeric}>{formatCountAr(frontendGrandTotal.quantity)}</td>
                      <td className={styles.numeric}>{formatMoneyAr(frontendGrandTotal.price)}</td>
                      <td className={styles.numeric}>{formatMoneyAr(frontendGrandTotal.patientShare)}</td>
                      <td className={styles.numeric}>{formatMoneyAr(frontendGrandTotal.discount)}</td>
                      <td className={styles.numeric}>{formatMoneyAr(frontendGrandTotal.patientTotal)}</td>
                      <td className={styles.numeric}>{formatMoneyAr(frontendGrandTotal.companyTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountingShell>
  );
}
