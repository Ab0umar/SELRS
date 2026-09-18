import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  Database,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { localISODate } from "@/lib/utils";

interface ReceiptRecord {
  rcptNo: string;
  patientCode: string;
  patientName: string;
  serviceName: string;
  doctorCode: string;
  doctorName: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  time: string;
}

export function RevenueLedgerPreview() {
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const todayStr = useMemo(() => localISODate(), []);

  // 1. Live MSSQL Queries (op2026)
  const summaryQuery = trpc.accounting.lasikRevenueSummary.useQuery(
    { fromDate: todayStr, toDate: todayStr },
    { refetchInterval: 60000, refetchOnWindowFocus: true },
  );

  const transactionsQuery = trpc.accounting.lasikServices.useQuery(
    { fromDate: todayStr, toDate: todayStr, limit: 100 },
    { refetchInterval: 60000, refetchOnWindowFocus: true },
  );

  const receiptsQuery = trpc.accounting.lasikReceipts.useQuery(
    { fromDate: todayStr, toDate: todayStr, limit: 100 },
    { refetchInterval: 60000, refetchOnWindowFocus: true },
  );

  const hasLiveData =
    transactionsQuery.data !== undefined && !transactionsQuery.isError;

  const liveReceipts: ReceiptRecord[] = useMemo(() => {
    const receiptDates = new Map(
      (receiptsQuery.data ?? []).map((receipt) => [
        `${receipt.trTy}-${receipt.trNo}`,
        receipt.transactionDate,
      ]),
    );
    return (transactionsQuery.data ?? []).map((tx) => {
      const transactionDate = receiptDates.get(`${tx.trTy}-${tx.trNo}`);
      const timeStr = transactionDate
        ? new Date(transactionDate).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      const gross = tx.quantity * tx.price;
      const discount = tx.discountValue;
      const net = gross - discount;
      return {
        rcptNo: tx.trNo,
        patientCode: tx.patientCode,
        patientName: tx.patientName || "",
        serviceName: tx.serviceName || "",
        doctorCode: tx.doctorCode || "",
        doctorName: tx.doctorName || "",
        grossAmount: gross,
        discountAmount: discount,
        netAmount: net,
        time: timeStr,
      };
    });
  }, [receiptsQuery.data, transactionsQuery.data]);

  const doctors = useMemo(() => {
    const unique = new Map<string, string>();
    for (const row of liveReceipts) {
      if (row.doctorCode && row.doctorName) {
        unique.set(row.doctorCode, row.doctorName);
      }
    }
    return Array.from(unique, ([code, name]) => ({ code, name }));
  }, [liveReceipts]);

  const filteredData = useMemo(() => {
    if (selectedDoctor === "all") return liveReceipts;
    return liveReceipts.filter((row) => row.doctorCode === selectedDoctor);
  }, [liveReceipts, selectedDoctor]);

  const totals = useMemo(() => {
    if (selectedDoctor === "all" && summaryQuery.data) {
      return {
        gross: summaryQuery.data.totalGross,
        discount: summaryQuery.data.totalDiscount,
        net: summaryQuery.data.netAfterDiscount,
        share: 0,
      };
    }
    return filteredData.reduce(
      (acc, cur) => ({
        gross: acc.gross + cur.grossAmount,
        discount: acc.discount + cur.discountAmount,
        net: acc.net + cur.netAmount,
        share: 0,
      }),
      { gross: 0, discount: 0, net: 0, share: 0 },
    );
  }, [filteredData, summaryQuery.data]);

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            سجل إيرادات اليوم وحصص الأطباء (
            <bdi dir="ltr">Live MSSQL op2026</bdi>)
          </h2>
          <p className="text-xs text-muted-foreground">
            استعلام حصري للقراءة من قاعدة بيانات الحسابات{" "}
            <bdi dir="ltr">MSSQL</bdi> وفق سطور الخدمات{" "}
            <bdi dir="ltr">PAPAT_SRV</bdi>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[10px] flex items-center gap-1 ${
              hasLiveData
                ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                : "border-blue-500/40 text-blue-500 bg-blue-500/10"
            }`}
          >
            <Database className="w-3 h-3" />
            {hasLiveData ? (
              <span>
                متصل بقاعدة <bdi dir="ltr">op2026</bdi> (مباشر)
              </span>
            ) : (
              "تعذر تحميل بيانات الإيرادات"
            )}
          </Badge>

          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="تصفية حسب الطبيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأطباء والخدمات</SelectItem>
              {doctors.map((doctor) => (
                <SelectItem dir="auto" key={doctor.code} value={doctor.code}>
                  {doctor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => {
              void summaryQuery.refetch();
              void transactionsQuery.refetch();
              void receiptsQuery.refetch();
            }}
            className="p-1.5 rounded-md border border-border bg-card hover:bg-muted text-muted-foreground transition-[background-color,color]"
            title="تحديث البيانات من MSSQL"
            aria-label="تحديث بيانات الإيرادات من MSSQL"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                transactionsQuery.isFetching ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              الإجمالي قبل الخصم
            </span>
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-1">
            {totals.gross.toLocaleString()}{" "}
            <span className="text-xs font-normal">ج.م</span>
          </div>
          <span
            dir="ltr"
            lang="en"
            className="text-[10px] text-muted-foreground"
          >
            Gross Revenue
          </span>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              إجمالي الخصومات
            </span>
            <span className="text-[11px] text-amber-500 font-mono">-%</span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-500 mt-1">
            -{totals.discount.toLocaleString()}{" "}
            <span className="text-xs font-normal">ج.م</span>
          </div>
          <span
            dir="ltr"
            lang="en"
            className="text-[10px] text-muted-foreground"
          >
            Total Discounts
          </span>
        </Card>

        <Card className="p-3 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              صافي الإيراد الفعلي
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {totals.net.toLocaleString()}{" "}
            <span className="text-xs font-normal">ج.م</span>
          </div>
          <span
            dir="ltr"
            lang="en"
            className="text-[10px] text-muted-foreground"
          >
            Net Center + Doctor
          </span>
        </Card>

        <Card className="p-3 border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
              حصص الأطباء
            </span>
            <Badge
              dir="ltr"
              lang="en"
              variant="outline"
              className="text-[9px] h-4"
            >
              Share
            </Badge>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            غير متاحة
          </div>
          <span className="text-[10px] text-muted-foreground">
            لا توجد قاعدة حصة في مصدر البيانات
          </span>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-20">رقم الإيصال</TableHead>
                <TableHead>كود / اسم المريض</TableHead>
                <TableHead>الخدمة الطبية</TableHead>
                <TableHead>الطبيب المعالج</TableHead>
                <TableHead className="text-right">الصافي</TableHead>
                <TableHead className="text-center w-24">الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow
                  key={`${row.rcptNo}-${row.patientCode}-${row.serviceName}`}
                >
                  <TableCell className="font-mono font-medium text-foreground">
                    #{row.rcptNo}
                  </TableCell>
                  <TableCell>
                    <div dir="auto" className="font-medium">
                      {row.patientName || "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      كود: {row.patientCode}
                    </div>
                  </TableCell>
                  <TableCell dir="auto" className="text-muted-foreground">
                    {row.serviceName || "—"}
                  </TableCell>
                  <TableCell dir="auto" className="text-xs font-medium">
                    {row.doctorName || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-500">
                    {row.netAmount.toLocaleString()} ج.م
                  </TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                    {row.time}
                  </TableCell>
                </TableRow>
              ))}
              {hasLiveData && filteredData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    لا توجد إيرادات مسجلة لهذا اليوم.
                  </TableCell>
                </TableRow>
              )}
              {transactionsQuery.isError && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-destructive"
                  >
                    تعذر تحميل الإيرادات. حدّث البيانات أو راجع اتصال قاعدة
                    الحسابات.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex justify-between items-center text-[11px] text-muted-foreground px-1">
        <span>
          مربوط بجدول <bdi dir="ltr">MSSQL</bdi>: <bdi dir="ltr">PAPAT_SRV</bdi>{" "}
          مع <bdi dir="ltr">PAJRNRCVH</bdi> عبر <bdi dir="ltr">PAT_CD</bdi>
        </span>
        <span className="text-emerald-500 font-medium">
          ● المزامنة النشطة 60 ثانية
        </span>
      </div>
    </div>
  );
}
