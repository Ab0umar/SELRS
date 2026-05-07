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
import { formatDateAr, formatMoneyAr, toArabicDigits } from "./accountingFormat";
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
      <div className="space-y-4" dir="rtl">
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
                >
                  <ArrowLeft className="ml-2 h-4 w-4" />
                  الإيصالات
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void detailQuery.refetch()}
                  disabled={!input || detailQuery.isFetching}
                >
                  <RefreshCw className={detailQuery.isFetching ? "animate-spin ml-2" : "ml-2"} />
                  تحديث
                </Button>
                <Button
                  type="button"
                  onClick={printReceipt}
                  disabled={detailQuery.isLoading || !header || lines.length === 0}
                >
                  <Printer className="ml-2 h-4 w-4" />
                  طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!input ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                بارامترات مسار الإيصال غير صالحة.
              </div>
            ) : null}

            {detailQuery.isError ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                  <CircleAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    تعذر تحميل تفاصيل الإيصال
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detailQuery.error.message || "تأكد من الاتصال بقاعدة بيانات الحسابات."}
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
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border/80 p-3">
                  <p className="text-xs text-muted-foreground">رقم الإيصال</p>
                  <p className="mt-1 font-semibold tabular-nums">{toArabicDigits(header.trNo)}</p>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="mt-1 font-semibold">{formatDateAr(header.transactionDate)}</p>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <p className="text-xs text-muted-foreground">النوع</p>
                  <p className="mt-1 font-semibold">{trTyLabel(header.trTy)}</p>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <p className="text-xs text-muted-foreground">القسم</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {toArabicDigits(String(header.sectionCode))}
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 p-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground">المريض</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {header.patientName || "مريض غير مسمى"} ({toArabicDigits(header.patientCode)})
                    </p>
                    {showMedicalLinkHint ? (
                      <Badge variant="outline">لا يوجد ملف طبي مرتبط</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <p className="text-xs text-muted-foreground">مدخل البيانات</p>
                  <p className="mt-1 font-semibold">{toArabicDigits(header.enteredBy || "-")}</p>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
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
              {!detailQuery.isLoading && !detailQuery.isError && lines.length === 0 && header ? (
                <div className={`${reportStyles.emptyState} text-muted-foreground`}>
                  لم يتم العثور على بنود PAPAT_SRV لهذا الإيصال.
                </div>
              ) : null}
              {header && (lines.length > 0 || detailQuery.isLoading) ? (
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
                        <th scope="col" className={reportStyles.numeric}>كود الخدمة</th>
                        <th scope="col">الخدمة</th>
                        <th scope="col">الطبيب</th>
                        <th scope="col" className={reportStyles.numeric}>التاريخ</th>
                        <th scope="col" className={reportStyles.numeric}>السعر</th>
                        <th scope="col" className={reportStyles.numeric}>الخصم</th>
                        <th scope="col" className={reportStyles.numeric}>المدفوع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailQuery.isLoading ? <LoadingRows /> : null}
                      {!detailQuery.isLoading
                        ? lines.map((line, index) => (
                            <tr key={`${line.serviceCode}-${line.entryDate}-${index}`}>
                              <td className={reportStyles.numeric}>{toArabicDigits(line.serviceCode)}</td>
                              <td>{line.serviceName || "خدمة غير مسمى"}</td>
                              <td>
                                {line.doctorName || line.doctorCode || line.serviceBy1 || "غير معين"}
                              </td>
                              <td className={reportStyles.numeric}>{formatDateAr(line.entryDate)}</td>
                              <td className={reportStyles.numeric}>{formatMoney(line.price)}</td>
                              <td className={reportStyles.numeric}>{formatMoney(line.discountValue)}</td>
                              <td className={reportStyles.numeric}>{formatMoney(line.paidValue)}</td>
                            </tr>
                          ))
                        : null}
                    </tbody>
                    <tfoot>
                      <tr className={reportStyles.detailFooterRow}>
                        <td colSpan={4}>إجمالي الإيصال</td>
                        <td className={reportStyles.numeric}>{formatMoney(totals.totalGross)}</td>
                        <td className={reportStyles.numeric}>{formatMoney(totals.totalDiscount)}</td>
                        <td className={reportStyles.numeric}>{formatMoney(totals.totalPaid)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountingShell>
  );
}
