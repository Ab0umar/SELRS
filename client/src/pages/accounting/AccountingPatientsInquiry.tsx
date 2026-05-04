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
import type { ReceiptHeader, ReceiptsInquiryInput } from "@shared/accounting/contracts";
import { CircleAlert, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import AccountingShell from "./AccountingShell";
import { formatDateAr, formatMoneyAr, toArabicDigits } from "./accountingFormat";
import reportStyles from "./AccountingOpReport.module.css";

type ReceiptsInquiryQuery = {
  data?: ReceiptHeader[];
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    receiptsInquiry: {
      useQuery: (
        input: ReceiptsInquiryInput,
        options?: { refetchOnWindowFocus?: boolean },
      ) => ReceiptsInquiryQuery;
    };
  };
};

const accountingTrpc = trpc as unknown as AccountingTrpc;
const DEFAULT_SECTION_CODE = 15;

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultDateRange() {
  const today = new Date();
  return { fromDate: toDateInputValue(today), toDate: toDateInputValue(today) };
}

function parseQueryString(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

function optionalText(value: string | null) {
  const t = value?.trim();
  return t ? t : undefined;
}

function optionalNumber(value: string | null) {
  const t = value?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function readFilters(search: string): ReceiptsInquiryInput {
  const defaults = defaultDateRange();
  const p = parseQueryString(search);
  const sectionRaw = p.get("sectionCode");
  const sectionParsed = sectionRaw != null && sectionRaw !== "" ? Number(sectionRaw) : NaN;
  const sectionCode = Number.isFinite(sectionParsed) ? sectionParsed : DEFAULT_SECTION_CODE;

  return {
    fromDate: p.get("fromDate") || defaults.fromDate,
    toDate: p.get("toDate") || defaults.toDate,
    patientCode: optionalText(p.get("patientCode")),
    doctorCode: optionalText(p.get("doctorCode")),
    sectionCode,
    trNo: optionalText(p.get("trNo")),
    trTy: optionalNumber(p.get("trTy")),
    limit: optionalNumber(p.get("limit")) ?? 500,
  };
}

function buildPatientsUrl(input: ReceiptsInquiryInput) {
  const params = new URLSearchParams();
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);
  if (input.sectionCode != null && input.sectionCode !== DEFAULT_SECTION_CODE) {
    params.set("sectionCode", String(input.sectionCode));
  }
  if (input.patientCode?.trim()) params.set("patientCode", input.patientCode.trim());
  if (input.doctorCode?.trim()) params.set("doctorCode", input.doctorCode.trim());
  if (input.trNo?.trim()) params.set("trNo", input.trNo.trim());
  if (input.trTy !== undefined) params.set("trTy", String(input.trTy));
  if (input.limit != null && input.limit !== 500) params.set("limit", String(input.limit));
  const qs = params.toString();
  return qs ? `/accounting/patients?${qs}` : "/accounting/patients";
}

function receiptDetailUrl(sectionCode: number, trTy: number, trNo: string) {
  return `/accounting/receipts/${sectionCode}/${trTy}/${encodeURIComponent(trNo)}`;
}

function formatMoney(value: number) {
  return formatMoneyAr(value);
}

function LoadingRows() {
  return (
    <table className={reportStyles.loadingTable} aria-hidden>
      <tbody>
        {Array.from({ length: 6 }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: 9 }).map((__, j) => (
              <td key={j}>
                <Skeleton className="h-5 w-full min-w-12" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AccountingPatientsInquiry() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const filters = useMemo(() => readFilters(search), [search]);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const q = accountingTrpc.accounting.receiptsInquiry.useQuery(filters, {
    refetchOnWindowFocus: false,
  });

  const rows = q.data ?? [];

  const applyFilters = () => {
    setLocation(buildPatientsUrl(draft));
  };

  const resetFilters = () => {
    const d = defaultDateRange();
    const next: ReceiptsInquiryInput = {
      ...d,
      sectionCode: DEFAULT_SECTION_CODE,
      limit: 500,
    };
    setDraft(next);
    setLocation(buildPatientsUrl(next));
  };

  const goReceipt = (row: ReceiptHeader) => {
    setLocation(receiptDetailUrl(row.sectionCode, row.trTy, row.trNo));
  };

  return (
    <AccountingShell>
      <div className="space-y-4" dir="rtl">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="gap-2">
            <CardTitle className="text-xl tracking-tight">استعلام المرضى والإيصالات</CardTitle>
            <CardDescription>
              عرض إيصالات المرضى حسب الفترة والقسم والفلاتر. اضغط صفًا للانتقال إلى تفاصيل الإيصال.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium">
              <span>من تاريخ</span>
              <Input
                type="date"
                value={draft.fromDate ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, fromDate: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>إلى تاريخ</span>
              <Input
                type="date"
                value={draft.toDate ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, toDate: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود القسم (افتراضي {DEFAULT_SECTION_CODE})</span>
              <Input
                type="number"
                value={draft.sectionCode ?? DEFAULT_SECTION_CODE}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    sectionCode: optionalNumber(e.target.value) ?? DEFAULT_SECTION_CODE,
                  }))
                }
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود المريض</span>
              <Input
                value={draft.patientCode ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, patientCode: e.target.value || undefined }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود الطبيب</span>
              <Input
                value={draft.doctorCode ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, doctorCode: e.target.value || undefined }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>رقم الإيصال</span>
              <Input
                value={draft.trNo ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, trNo: e.target.value || undefined }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>نوع الإيصال (trTy)</span>
              <Input
                type="number"
                value={draft.trTy ?? ""}
                placeholder="1, 5, 6, 8"
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    trTy: optionalNumber(e.target.value),
                  }))
                }
              />
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="button" className="flex-1 sm:flex-none" onClick={applyFilters}>
                <Search className="ml-2 h-4 w-4" />
                تطبيق
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                إعادة ضبط
              </Button>
              <Button type="button" variant="outline" onClick={() => void q.refetch()} disabled={q.isFetching}>
                <RefreshCw className={q.isFetching ? "ml-2 h-4 w-4 animate-spin" : "ml-2 h-4 w-4"} />
                تحديث
              </Button>
            </div>
          </CardContent>
        </Card>

        {q.isError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-start gap-3 py-5">
              <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                <CircleAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">تعذر تحميل البيانات</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {q.error.message || "تأكد من الاتصال بقاعدة بيانات الحسابات."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">الإيصالات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={reportStyles.reportShell}>
              <div className={reportStyles.reportMeta} role="note">
                <span className="font-semibold">الفترة:</span> من {formatDateAr(filters.fromDate)} إلى{" "}
                {formatDateAr(filters.toDate)}
              </div>

              {q.isLoading ? <LoadingRows /> : null}
              {!q.isLoading && rows.length === 0 ? (
                <div className={`${reportStyles.emptyState} text-muted-foreground`}>لا توجد بيانات</div>
              ) : null}
              {!q.isLoading && rows.length > 0 ? (
                <div className={reportStyles.reportBlock}>
                  <div className={reportStyles.blockHeader}>قائمة الإيصالات</div>
                  <table className={reportStyles.gridTable}>
                    <colgroup>
                      <col className={reportStyles.colCompact} />
                      <col className={reportStyles.colCompact} />
                      <col className={reportStyles.colCompact} />
                      <col className={reportStyles.colStretch} />
                      <col className={reportStyles.colStretch} />
                      <col className={reportStyles.colCompact} />
                      <col className={reportStyles.colCompact} />
                      <col className={reportStyles.colCompact} />
                      <col className={reportStyles.colStretch} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col" className={reportStyles.numeric}>
                          رقم الإيصال
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          التاريخ
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          كود المريض
                        </th>
                        <th scope="col">اسم المريض</th>
                        <th scope="col">الطبيب</th>
                        <th scope="col" className={reportStyles.numeric}>
                          الإجمالي
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          الخصم
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          المدفوع
                        </th>
                        <th scope="col">المستخدم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={`${row.sectionCode}-${row.trTy}-${row.trNo}`}
                          className={reportStyles.rowClickable}
                          tabIndex={0}
                          onClick={() => goReceipt(row)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              goReceipt(row);
                            }
                          }}
                        >
                          <td className={`${reportStyles.numeric} font-medium`}>
                            {toArabicDigits(row.trNo)}
                          </td>
                          <td className={reportStyles.numeric}>
                            {formatDateAr(row.transactionDate)}
                          </td>
                          <td className={reportStyles.numeric}>{toArabicDigits(row.patientCode)}</td>
                          <td>{row.patientName?.trim() || "—"}</td>
                          <td className="text-muted-foreground">—</td>
                          <td className={reportStyles.numeric}>{formatMoney(row.total)}</td>
                          <td className={reportStyles.numeric}>{formatMoney(row.discount)}</td>
                          <td className={reportStyles.numeric}>{formatMoney(row.paidValue)}</td>
                          <td>{row.enteredBy?.trim() || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
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
