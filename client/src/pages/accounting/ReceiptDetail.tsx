import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import type {
  ReceiptDetailInput,
  ReceiptDetailOutput,
} from "@shared/accounting/contracts";
import { ArrowLeft, CircleAlert, Printer, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import AccountingShell from "./AccountingShell";
import {
  formatDateAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";
import reportStyles from "./AccountingOpReport.module.css";
import { openPrint, type PrintPayload } from "./printUtils";
import { LidWipeLoader } from "@/components/loaders/OrganicLoaders";

type ReceiptDetailQuery = {
  data?: ReceiptDetailOutput;
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    receiptDetail: {
      useQuery: (
        input: ReceiptDetailInput,
        options?: { enabled?: boolean; refetchOnWindowFocus?: boolean },
      ) => ReceiptDetailQuery;
    };
  };
};

const accountingTrpc = trpc as unknown as AccountingTrpc;

function formatMoney(value: number) {
  return formatMoneyAr(value);
}

function trTyLabel(value: number) {
  switch (value) {
    case 1:
      return "نقدي";
    case 5:
      return "آجل";
    case 6:
      return "نزلاء";
    case 8:
      return "مسترد";
    default:
      return toArabicDigits(String(value));
  }
}

function parseRouteNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseReceiptInput(
  params: { secCd?: string; trTy?: string; trNo?: string } | null,
): ReceiptDetailInput | null {
  const sectionCode = parseRouteNumber(params?.secCd);
  const trTy = parseRouteNumber(params?.trTy);
  const trNo = params?.trNo ? decodeURIComponent(params.trNo).trim() : "";

  if (!sectionCode || trTy === undefined || !trNo) {
    return null;
  }

  return { sectionCode, trTy, trNo };
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: 7 }).map((__, cellIndex) => (
            <td key={cellIndex}>
              <Skeleton className="h-5 w-full min-w-16" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function ReceiptDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/accounting/receipts/:secCd/:trTy/:trNo");
  const input = useMemo(() => parseReceiptInput(params ?? null), [params]);

  const detailQuery = accountingTrpc.accounting.receiptDetail.useQuery(
    input ?? { sectionCode: 0, trTy: 0, trNo: "missing" },
    {
      enabled: Boolean(input),
      refetchOnWindowFocus: false,
    },
  );

  const header = detailQuery.data?.header;
  const lines = detailQuery.data?.lines ?? [];
  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, line) => {
          acc.totalGross += line.price;
          acc.totalDiscount += line.discountValue;
          acc.totalPaid += line.paidValue;
          return acc;
        },
        { totalGross: 0, totalDiscount: 0, totalPaid: 0 },
      ),
    [lines],
  );

  const showMedicalLinkHint = Boolean(
    header && !String(header.patientName ?? "").trim(),
  );

  const printReceipt = () => {
    if (!header || lines.length === 0) return;

    const payload: PrintPayload = {
      printLayout: "receipt",
      title: `إيصال ${toArabicDigits(header.trNo)}`,
      meta: {
        clinicName: "SRV100",
        filters: {
          "تاريخ الإيصال": formatDateAr(header.transactionDate),
          "كود القسم": toArabicDigits(String(header.sectionCode)),
          "نوع الإيصال": toArabicDigits(String(header.trTy)),
          "رقم الإيصال": toArabicDigits(header.trNo),
          "كود المريض": toArabicDigits(header.patientCode),
          "اسم المريض": header.patientName ?? "",
        },
      },
      columns: [
        { key: "serviceCode", label: "كود الخدمة" },
        { key: "serviceName", label: "الخدمة" },
        { key: "doctorCode", label: "كود الطبيب" },
        { key: "doctorName", label: "الطبيب" },
        { key: "price", label: "السعر", align: "right" },
        { key: "discountValue", label: "الخصم", align: "right" },
        { key: "paidValue", label: "المدفوع", align: "right" },
      ],
      rows: lines.map((line) => ({
        serviceCode: line.serviceCode,
        serviceName: line.serviceName ?? "",
        doctorCode: line.doctorCode ?? line.serviceBy1 ?? "",
        doctorName: line.doctorName ?? "",
        price: line.price,
        discountValue: line.discountValue,
        paidValue: line.paidValue,
      })),
      totals: [
        {
          label: "إجمالي الإيصال",
          values: {
            price: totals.totalGross,
            discountValue: totals.totalDiscount,
            paidValue: totals.totalPaid,
          },
        },
      ],
      footer: `نوع الإيصال: ${trTyLabel(header.trTy)} | مدخل البيانات: ${toArabicDigits(header.enteredBy ?? "")}`,
    };
    openPrint(payload);
  };

  return (
    <AccountingShell>
      <div className="space-y-4 sm:space-y-5 md:space-y-6" dir="rtl">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl tracking-tight">
                  تفاصيل الإيصال
                </CardTitle>
                <CardDescription className="mt-1 text-sm">
                  الرأس وبنود الخدمة (PAPAT_SRV) للإيصال المختار.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/accounting/receipts")}
                  aria-label="العودة إلى الإيصالات"
                >
                  <ArrowLeft className="ml-2 h-4 w-4" aria-hidden />
                  الإيصالات
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void detailQuery.refetch()}
                  disabled={!input || detailQuery.isFetching}
                  aria-label="تحديث تفاصيل الإيصال"
                >
                  <RefreshCw
                    className={
                      detailQuery.isFetching ? "animate-spin ml-2" : "ml-2"
                    }
                    aria-hidden
                  />
                  تحديث
                </Button>
                <Button
                  type="button"
                  onClick={printReceipt}
                  disabled={
                    detailQuery.isLoading || !header || lines.length === 0
                  }
                  aria-label="طباعة الإيصال"
                >
                  <Printer className="ml-2 h-4 w-4" aria-hidden />
                  طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!input ? (
              <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
                بارامترات مسار الإيصال غير صالحة.
              </div>
            ) : null}

            {detailQuery.isError ? (
              <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error/5 p-4">
                <div className="rounded-lg bg-error/10 p-2 text-error">
                  <CircleAlert className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    تعذر تحميل تفاصيل الإيصال
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detailQuery.error.message ||
                      "تأكد من الاتصال بقاعدة بيانات الحسابات."}
                  </p>
                </div>
              </div>
            ) : null}

            {detailQuery.isLoading ? (
              <div className="py-6">
                <LidWipeLoader label="جاري التحميل..." logo="eye" size={120} />
              </div>
            ) : null}

            {!detailQuery.isLoading && header ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">رقم الإيصال</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {toArabicDigits(header.trNo)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="mt-1 font-semibold">
                    {formatDateAr(header.transactionDate)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">النوع</p>
                  <p className="mt-1 font-semibold">{trTyLabel(header.trTy)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">القسم</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {toArabicDigits(String(header.sectionCode))}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm sm:col-span-2 lg:col-span-2">
                  <p className="text-xs text-muted-foreground">المريض</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {header.patientName || "مريض غير مسمى"} (
                      {toArabicDigits(header.patientCode)})
                    </p>
                    {showMedicalLinkHint ? (
                      <Badge variant="outline">لا يوجد ملف طبي مرتبط</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">مدخل البيانات</p>
                  <p className="mt-1 font-semibold">
                    {toArabicDigits(header.enteredBy || "-")}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">المدفوع</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {formatMoney(header.paidValue)}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">بنود PAPAT_SRV</CardTitle>
            <CardDescription>
              {header
                ? `${toArabicDigits(header.patientCode)} · ${toArabicDigits(header.trNo)}`
                : "بنود الإيصال"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={reportStyles.reportShell}>
              {!detailQuery.isLoading &&
              !detailQuery.isError &&
              lines.length === 0 &&
              header ? (
                <div
                  className={`${reportStyles.emptyState} text-muted-foreground`}
                >
                  لم يتم العثور على بنود PAPAT_SRV لهذا الإيصال.
                </div>
              ) : null}
              <div className="grid gap-3 sm:hidden">
                {detailQuery.isLoading ? (
                  <div className="grid gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                      >
                        <Skeleton className="h-4 w-28" />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {Array.from({ length: 5 }).map((__, j) => (
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

                {header && !detailQuery.isLoading
                  ? lines.map((line, index) => (
                      <div
                        key={`${line.serviceCode}-${line.entryDate}-${index}`}
                        className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500">
                              {formatDateAr(line.entryDate)}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              {line.serviceName || "خدمة غير مسمى"}
                            </div>
                          </div>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {toArabicDigits(line.serviceCode)}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-muted px-3 py-2">
                            <div className="text-[10px] text-slate-500">
                              الطبيب
                            </div>
                            <div className="mt-1 font-semibold text-foreground">
                              {line.doctorName ||
                                line.doctorCode ||
                                line.serviceBy1 ||
                                "غير معين"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-muted px-3 py-2">
                            <div className="text-[10px] text-slate-500">
                              السعر
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                              {formatMoney(line.price)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-rose-50 px-3 py-2">
                            <div className="text-[10px] text-rose-700">
                              الخصم
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-rose-700">
                              {formatMoney(line.discountValue)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-emerald-50 px-3 py-2">
                            <div className="text-[10px] text-emerald-700">
                              المدفوع
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-emerald-700">
                              {formatMoney(line.paidValue)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  : null}
              </div>

              {header && (lines.length > 0 || detailQuery.isLoading) ? (
                <div className="hidden sm:block">
                  <div className={reportStyles.reportBlock}>
                    <table className={reportStyles.gridTable}>
                      <colgroup>
                        <col className={reportStyles.colCompact} />
                        <col className={reportStyles.colStretch} />
                        <col className={reportStyles.colStretch} />
                        <col className={reportStyles.colCompact} />
                        <col className={reportStyles.colCompact} />
                        <col className={reportStyles.colCompact} />
                        <col className={reportStyles.colCompact} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th scope="col" className={reportStyles.numeric}>
                            كود الخدمة
                          </th>
                          <th scope="col">الخدمة</th>
                          <th scope="col">الطبيب</th>
                          <th scope="col" className={reportStyles.numeric}>
                            التاريخ
                          </th>
                          <th scope="col" className={reportStyles.numeric}>
                            السعر
                          </th>
                          <th scope="col" className={reportStyles.numeric}>
                            الخصم
                          </th>
                          <th scope="col" className={reportStyles.numeric}>
                            المدفوع
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailQuery.isLoading ? <LoadingRows /> : null}
                        {!detailQuery.isLoading
                          ? lines.map((line, index) => (
                              <tr
                                key={`${line.serviceCode}-${line.entryDate}-${index}`}
                              >
                                <td
                                  data-label="كود الخدمة"
                                  className={reportStyles.numeric}
                                >
                                  {toArabicDigits(line.serviceCode)}
                                </td>
                                <td data-label="الخدمة">
                                  {line.serviceName || "خدمة غير مسمى"}
                                </td>
                                <td data-label="الطبيب">
                                  {line.doctorName ||
                                    line.doctorCode ||
                                    line.serviceBy1 ||
                                    "غير معين"}
                                </td>
                                <td
                                  data-label="التاريخ"
                                  className={reportStyles.numeric}
                                >
                                  {formatDateAr(line.entryDate)}
                                </td>
                                <td
                                  data-label="السعر"
                                  className={reportStyles.numeric}
                                >
                                  {formatMoney(line.price)}
                                </td>
                                <td
                                  data-label="الخصم"
                                  className={reportStyles.numeric}
                                >
                                  {formatMoney(line.discountValue)}
                                </td>
                                <td
                                  data-label="المدفوع"
                                  className={reportStyles.numeric}
                                >
                                  {formatMoney(line.paidValue)}
                                </td>
                              </tr>
                            ))
                          : null}
                      </tbody>
                      <tfoot>
                        <tr className={reportStyles.detailFooterRow}>
                          <td colSpan={4}>إجمالي الإيصال</td>
                          <td className={reportStyles.numeric}>
                            {formatMoney(totals.totalGross)}
                          </td>
                          <td className={reportStyles.numeric}>
                            {formatMoney(totals.totalDiscount)}
                          </td>
                          <td className={reportStyles.numeric}>
                            {formatMoney(totals.totalPaid)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountingShell>
  );
}
