import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Pencil,
  Printer,
  RefreshCw,
  Share2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import {
  formatDateAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";
import reportStyles from "./AccountingOpReport.module.css";
import { openPrint, type PrintPayload } from "./printUtils";
import { getErrorContext } from "@/lib/errorMessages";

type ReceiptDetailQuery = {
  data?: ReceiptDetailOutput;
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type EditLineInput = {
  patientCode: string;
  sectionCode: number;
  trTy: number;
  trNo: number;
  lineNo: number;
  serviceCode: string;
  quantity: number;
  price: number;
  discount: number;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    receiptDetail: {
      useQuery: (
        input: ReceiptDetailInput,
        options?: { enabled?: boolean; refetchOnWindowFocus?: boolean },
      ) => ReceiptDetailQuery;
    };
    editReceiptServiceLine: {
      useMutation: (options?: {
        retry?: boolean;
        onSuccess?: (result: {
          updated: boolean;
          note?: string | null;
        }) => void;
      }) => {
        mutateAsync: (input: EditLineInput) => Promise<{
          updated: boolean;
          note?: string | null;
        }>;
        isPending: boolean;
      };
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
          {Array.from({ length: 9 }).map((__, cellIndex) => (
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

  const [editingLineNo, setEditingLineNo] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({
    serviceCode: "",
    quantity: "1",
    price: "0",
    discount: "0",
  });

  const editLineMut =
    accountingTrpc.accounting.editReceiptServiceLine.useMutation({
      retry: false,
      onSuccess: (result) => {
        if (!result.updated) {
          toast.error(result.note ?? "فشل تعديل السطر", { duration: 15000 });
          return;
        }
        toast.success("تم تعديل السطر");
        setEditingLineNo(null);
        void detailQuery.refetch();
      },
    });

  const startEdit = (line: ReceiptDetailOutput["lines"][number]) => {
    if (line.lineNo == null) {
      toast.error("لا يمكن تعديل هذا السطر (لا يوجد رقم سطر)");
      return;
    }
    setEditingLineNo(line.lineNo);
    setEditDraft({
      serviceCode: line.serviceCode,
      quantity: String(line.quantity),
      price: String((line.price / Math.max(1, line.quantity)).toFixed(2)),
      discount: String(line.discountValue),
    });
  };

  const saveEdit = async () => {
    if (editLineMut.isPending) return;
    if (!header || editingLineNo == null) return;
    const quantity = Math.max(1, Math.trunc(Number(editDraft.quantity) || 1));
    const price = Math.max(0, Number(editDraft.price) || 0);
    const discount = Math.max(0, Number(editDraft.discount) || 0);
    if (!editDraft.serviceCode.trim()) {
      toast.error("كود الخدمة مطلوب");
      return;
    }
    try {
      await editLineMut.mutateAsync({
        patientCode: header.patientCode,
        sectionCode: header.sectionCode,
        trTy: header.trTy,
        trNo: Number(header.trNo),
        lineNo: editingLineNo,
        serviceCode: editDraft.serviceCode.trim(),
        quantity,
        price,
        discount,
      });
    } catch {
      toast.error("تعذر حفظ تعديل الإيصال. راجع السطر قبل إعادة المحاولة.");
    }
  };

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
        { key: "quantity", label: "العدد", align: "right" },
        { key: "price", label: "السعر", align: "right" },
        { key: "discountValue", label: "الخصم", align: "right" },
        { key: "paidValue", label: "المدفوع", align: "right" },
      ],
      rows: lines.map((line) => ({
        serviceCode: line.serviceCode,
        serviceName: line.serviceName ?? "",
        doctorCode: line.doctorCode ?? line.serviceBy1 ?? "",
        doctorName: line.doctorName ?? "",
        quantity: line.quantity,
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

  const shareReceipt = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "تفاصيل الإيصال", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ رابط الإيصال");
      }
    } catch {
      toast.error("تعذر مشاركة رابط الإيصال");
    }
  };

  return (
    <>
      <div className="accounting-report space-y-3 sm:space-y-3.5" dir="rtl">
        <h1 className="text-2xl font-semibold">تفاصيل الإيصال</h1>
        <Card className="border-border/60 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 pb-0 sm:p-4 sm:pb-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation("/accounting/receipts")}
              aria-label="العودة إلى الإيصالات"
            >
              <ArrowLeft className="me-1.5 h-3.5 w-3.5" aria-hidden />
              الإيصالات
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void detailQuery.refetch()}
                disabled={!input || detailQuery.isFetching}
                aria-label="تحديث تفاصيل الإيصال"
              >
                <RefreshCw
                  className={
                    detailQuery.isFetching
                      ? "animate-spin me-1.5 h-3.5 w-3.5"
                      : "me-1.5 h-3.5 w-3.5"
                  }
                  aria-hidden
                />
                تحديث
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void shareReceipt()}
                disabled={
                  !header || detailQuery.isLoading || detailQuery.isError
                }
                aria-label="مشاركة رابط الإيصال"
              >
                <Share2 className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
                مشاركة
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={printReceipt}
                disabled={
                  detailQuery.isLoading ||
                  detailQuery.isError ||
                  !header ||
                  lines.length === 0
                }
                aria-label="طباعة الإيصال"
              >
                <Printer className="me-1.5 h-3.5 w-3.5" aria-hidden />
                طباعة
              </Button>
            </div>
          </div>
          <CardContent className="p-3 sm:p-4">
            {!input ? (
              <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
                بارامترات مسار الإيصال غير صالحة.
              </div>
            ) : null}

            {detailQuery.isError ? (
              <div
                role="alert"
                className="flex items-start gap-3 border border-border p-4"
              >
                <div className="rounded-lg bg-error/10 p-2 text-error">
                  <CircleAlert className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    تعذر تحميل تفاصيل الإيصال
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getErrorContext(detailQuery.error.message).hint}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-11"
                    onClick={() => void detailQuery.refetch()}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            ) : null}

            {detailQuery.isLoading ? (
              <div role="status" className="py-6">
                جارٍ تحميل تفاصيل الإيصال
              </div>
            ) : null}

            {input &&
            !detailQuery.isLoading &&
            !detailQuery.isError &&
            !header ? (
              <p className="py-4">لم يتم العثور على الإيصال.</p>
            ) : null}
            {!detailQuery.isLoading && !detailQuery.isError && header ? (
              <div className="accounting-receipt-context grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        {!detailQuery.isLoading && !detailQuery.isError && header ? (
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">بنود الإيصال</CardTitle>
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
                    لا توجد بنود لهذا الإيصال.
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
                              <div className="text-[13px] text-muted-foreground">
                                {formatDateAr(line.entryDate)}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-foreground">
                                {line.serviceName || "خدمة غير مسمى"}
                              </div>
                            </div>
                            <span className="rounded-full bg-primary text-primary-foreground">
                              {toArabicDigits(line.serviceCode)}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl bg-muted px-3 py-2">
                              <div className="text-[13px] text-muted-foreground">
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
                              <div className="text-[13px] text-muted-foreground">
                                العدد
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">
                                {toArabicDigits(String(line.quantity))}
                              </div>
                            </div>
                            <div className="rounded-xl bg-muted px-3 py-2">
                              <div className="text-[13px] text-muted-foreground">
                                السعر
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">
                                {formatMoney(line.price)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-destructive/10 px-3 py-2">
                              <div className="text-[13px] text-destructive">
                                الخصم
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-destructive">
                                {formatMoney(line.discountValue)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-success/10 px-3 py-2">
                              <div className="text-[13px] text-success">
                                المدفوع
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-success">
                                {formatMoney(line.paidValue)}
                              </div>
                            </div>
                          </div>
                          {editingLineNo === line.lineNo ? (
                            <div className="mt-3 grid gap-2 border-t border-border pt-3">
                              <label className="text-xs font-semibold">
                                كود الخدمة
                                <Input
                                  value={editDraft.serviceCode}
                                  onChange={(event) =>
                                    setEditDraft((draft) => ({
                                      ...draft,
                                      serviceCode: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-semibold">
                                العدد
                                <Input
                                  inputMode="numeric"
                                  value={editDraft.quantity}
                                  onChange={(event) =>
                                    setEditDraft((draft) => ({
                                      ...draft,
                                      quantity: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-semibold">
                                السعر
                                <Input
                                  inputMode="decimal"
                                  value={editDraft.price}
                                  onChange={(event) =>
                                    setEditDraft((draft) => ({
                                      ...draft,
                                      price: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-semibold">
                                الخصم
                                <Input
                                  inputMode="decimal"
                                  value={editDraft.discount}
                                  onChange={(event) =>
                                    setEditDraft((draft) => ({
                                      ...draft,
                                      discount: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  className="min-h-11"
                                  onClick={() => void saveEdit()}
                                  disabled={editLineMut.isPending}
                                >
                                  {editLineMut.isPending
                                    ? "جارٍ الحفظ"
                                    : "حفظ التعديل"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="min-h-11"
                                  onClick={() => setEditingLineNo(null)}
                                >
                                  إلغاء
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-3 min-h-11"
                              onClick={() => startEdit(line)}
                              disabled={line.lineNo == null}
                            >
                              <Pencil
                                className="me-1.5 h-4 w-4"
                                aria-hidden="true"
                              />
                              تعديل البند
                            </Button>
                          )}
                        </div>
                      ))
                    : null}
                </div>

                {header && (lines.length > 0 || detailQuery.isLoading) ? (
                  <div className="hidden sm:block">
                    <div
                      className={reportStyles.reportBlock}
                      role="region"
                      aria-label="بنود الإيصال"
                      tabIndex={0}
                    >
                      <table className={reportStyles.gridTable}>
                        <colgroup>
                          <col className={reportStyles.colCompact} />
                          <col className={reportStyles.colStretch} />
                          <col className={reportStyles.colStretch} />
                          <col className={reportStyles.colCompact} />
                          <col className={reportStyles.colCompact} />
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
                              العدد
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
                            <th scope="col" className={reportStyles.numeric}>
                              إجراءات
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailQuery.isLoading ? <LoadingRows /> : null}
                          {!detailQuery.isLoading
                            ? lines.map((line, index) => {
                                const isEditing =
                                  line.lineNo != null &&
                                  editingLineNo === line.lineNo;
                                return (
                                  <tr
                                    key={`${line.serviceCode}-${line.entryDate}-${index}`}
                                  >
                                    <td
                                      data-label="كود الخدمة"
                                      className={reportStyles.numeric}
                                    >
                                      {isEditing ? (
                                        <Input
                                          dir="ltr"
                                          aria-label="كود الخدمة"
                                          value={editDraft.serviceCode}
                                          onChange={(e) =>
                                            setEditDraft((d) => ({
                                              ...d,
                                              serviceCode: e.target.value,
                                            }))
                                          }
                                          className="h-8 w-24 text-xs"
                                        />
                                      ) : (
                                        toArabicDigits(line.serviceCode)
                                      )}
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
                                      data-label="العدد"
                                      className={reportStyles.numeric}
                                    >
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          min={1}
                                          dir="ltr"
                                          aria-label="العدد"
                                          value={editDraft.quantity}
                                          onChange={(e) =>
                                            setEditDraft((d) => ({
                                              ...d,
                                              quantity: e.target.value,
                                            }))
                                          }
                                          className="h-8 w-16 text-xs"
                                        />
                                      ) : (
                                        toArabicDigits(String(line.quantity))
                                      )}
                                    </td>
                                    <td
                                      data-label="السعر"
                                      className={reportStyles.numeric}
                                    >
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          dir="ltr"
                                          aria-label="السعر"
                                          value={editDraft.price}
                                          onChange={(e) =>
                                            setEditDraft((d) => ({
                                              ...d,
                                              price: e.target.value,
                                            }))
                                          }
                                          className="h-8 w-20 text-xs"
                                        />
                                      ) : (
                                        formatMoney(line.price)
                                      )}
                                    </td>
                                    <td
                                      data-label="الخصم"
                                      className={reportStyles.numeric}
                                    >
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          dir="ltr"
                                          aria-label="الخصم"
                                          value={editDraft.discount}
                                          onChange={(e) =>
                                            setEditDraft((d) => ({
                                              ...d,
                                              discount: e.target.value,
                                            }))
                                          }
                                          className="h-8 w-20 text-xs"
                                        />
                                      ) : (
                                        formatMoney(line.discountValue)
                                      )}
                                    </td>
                                    <td
                                      data-label="المدفوع"
                                      className={reportStyles.numeric}
                                    >
                                      {isEditing
                                        ? formatMoney(
                                            Math.max(
                                              0,
                                              (Number(editDraft.price) || 0) *
                                                Math.max(
                                                  1,
                                                  Math.trunc(
                                                    Number(
                                                      editDraft.quantity,
                                                    ) || 1,
                                                  ),
                                                ) -
                                                (Number(editDraft.discount) ||
                                                  0),
                                            ),
                                          )
                                        : formatMoney(line.paidValue)}
                                    </td>
                                    <td
                                      data-label="إجراءات"
                                      className={reportStyles.numeric}
                                    >
                                      {isEditing ? (
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            disabled={editLineMut.isPending}
                                            onClick={() => void saveEdit()}
                                            aria-label="حفظ"
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            disabled={editLineMut.isPending}
                                            onClick={() =>
                                              setEditingLineNo(null)
                                            }
                                            aria-label="إلغاء"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => startEdit(line)}
                                          aria-label="تعديل السطر"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            : null}
                        </tbody>
                        <tfoot>
                          <tr className={reportStyles.detailFooterRow}>
                            <td colSpan={5}>إجمالي الإيصال</td>
                            <td className={reportStyles.numeric}>
                              {formatMoney(totals.totalGross)}
                            </td>
                            <td className={reportStyles.numeric}>
                              {formatMoney(totals.totalDiscount)}
                            </td>
                            <td className={reportStyles.numeric}>
                              {formatMoney(totals.totalPaid)}
                            </td>
                            <td className={reportStyles.numeric} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
