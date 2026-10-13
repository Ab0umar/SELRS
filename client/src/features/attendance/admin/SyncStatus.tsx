import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getLocalToday } from "@/lib/localDate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  FileDown,
  ArrowDownToLine,
  History,
} from "lucide-react";
import { toast } from "sonner";

const tRPC = trpc as any;

function fmt(date: string | Date | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface SyncResult {
  success: boolean;
  recordsSeen: number;
  recordsInserted: number;
  recordsSkipped: number;
  duration?: number;
  error?: string;
}

export default function SyncStatus() {
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const runsQ = tRPC.attendance.syncStatus.useQuery(
    { limit: 8 },
    { refetchInterval: 15000, refetchOnWindowFocus: false },
  );

  const exportMut = tRPC.attendance.exportDevicePunches.useMutation({
    onSuccess: (result: any) => {
      if (!result.success || !result.punches?.length) {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }
      const header =
        "empNo,timestamp,direction,year,month,day,hour,minute,second";
      const rows = result.punches.map(
        (p: any) =>
          `${p.empNo},${p.timestamp},${p.direction},${p.year},${p.month},${p.day},${p.hour},${p.minute},${p.second}`,
      );
      const csv = [header, ...rows].join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = getLocalToday();
      a.href = url;
      a.download = `punches_${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${result.count} بصمة`);
    },
    onError: (e: any) => toast.error("تعذر التصدير: " + e.message),
  });

  const syncMut = tRPC.attendance.syncFromFKDevice.useMutation({
    onSuccess: (result: SyncResult) => {
      setLastResult(result);
      if (result.success) {
        toast.success(`تم استيراد ${result.recordsInserted} بصمة جديدة`);
        runsQ?.refetch?.();
      } else {
        toast.error("فشل التزامن: " + (result.error ?? "خطأ غير معروف"));
      }
    },
    onError: (e: any) => {
      toast.error("تعذرت المزامنة: " + e.message);
    },
  });

  const handleSync = () => {
    const input: Record<string, unknown> = {};
    if (ip.trim()) input.ip = ip.trim();
    if (port.trim()) input.port = parseInt(port) || 5005;
    syncMut.mutate(input as any);
  };

  const busy = syncMut.isPending;

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border border-border/60 bg-card rounded-xl overflow-hidden transition-colors duration-300">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/40">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/5 text-primary shrink-0">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            سحب بصمات الحضور اليدوي
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <label className="text-xs font-bold text-muted-foreground block">
                عنوان IP (اختياري)
              </label>
              <Input
                aria-label="عنوان IP (اختياري)"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="تلقائي من الإعدادات"
                dir="ltr"
                className="h-11 min-w-0 text-xs border-input focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono rounded-lg"
              />
            </div>
            <div className="w-full space-y-1 sm:w-24">
              <label className="text-xs font-bold text-muted-foreground block">
                المنفذ
              </label>
              <Input
                aria-label="المنفذ"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="5005"
                dir="ltr"
                className="h-11 min-w-0 text-xs border-input focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono rounded-lg"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            * اتركه فارغاً ليقوم النظام بالاتصال مباشرة بعنوان IP المثبت في
            نموذج الإعدادات.
          </p>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
            <Button
              onClick={handleSync}
              disabled={busy || exportMut.isPending}
              className="min-w-0 whitespace-normal text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-2 h-auto flex-1 gap-1.5 transition-colors"
            >
              {busy ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {busy ? "جاري السحب" : "سحب البصمات"}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                exportMut.mutate(
                  ip.trim()
                    ? { ip: ip.trim(), port: parseInt(port) || 5005 }
                    : ({} as any),
                )
              }
              disabled={busy || exportMut.isPending}
              className="text-xs font-semibold border-border/60 hover:bg-muted/40 text-foreground rounded-lg py-2 h-auto gap-1.5"
            >
              {exportMut.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              {exportMut.isPending ? "جاري" : "تصدير CSV"}
            </Button>
          </div>

          {lastResult && (
            <Alert
              variant="default"
              className={`py-2.5 px-3 text-start  ${
                lastResult.success
                  ? "border-success/30  bg-success/10  text-success-text  shadow-emerald-50/30"
                  : "border-destructive/30  bg-destructive/10  text-destructive-text  shadow-rose-50/30"
              }`}
            >
              {lastResult.success ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success-text float-right me-2 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold">تم سحب البيانات بنجاح</div>
                    <div className="mt-1 space-y-0.5 font-medium opacity-90 text-xs">
                      <div>سجلات مقروءة: {lastResult.recordsSeen}</div>
                      <div>سجلات جديدة: {lastResult.recordsInserted}</div>
                      <div>سجلات مكررة: {lastResult.recordsSkipped}</div>
                      {lastResult.duration != null && (
                        <div>
                          الزمن المستغرق:{" "}
                          {(lastResult.duration / 1000).toFixed(1)} ثانية
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive-text float-right me-2 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold">فشل عملية المزامنة</div>
                    <div className="mt-0.5 font-mono">{lastResult.error}</div>
                  </div>
                </div>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent sync runs timeline */}
      {runsQ?.isLoading ? (
        <div
          role="status"
          className="py-6 text-center text-sm text-muted-foreground"
        >
          جارٍ تحميل سجل العمليات.
        </div>
      ) : runsQ?.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>تعذر تحميل سجل العمليات.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runsQ.refetch()}
            >
              إعادة المحاولة
            </Button>
          </AlertDescription>
        </Alert>
      ) : runsQ?.data?.runs?.length > 0 ? (
        <Card className="border border-border/60 bg-card rounded-xl overflow-hidden transition-colors duration-300">
          <CardHeader className="pb-2 border-b border-border/60 bg-muted/40 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <div className="p-1 rounded bg-primary/5 text-primary shrink-0">
                <History className="w-3.5 h-3.5" />
              </div>
              سجل العمليات الأخيرة
            </CardTitle>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 bg-card">
            <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
              {runsQ.data.runs.map((run: any, i: number) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 px-4 py-3 hover:bg-muted/40 transition-colors text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    {run.status === "ok" ? (
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                      </span>
                    ) : (
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                      </span>
                    )}
                    <span className="text-muted-foreground font-mono text-xs">
                      {fmt(run.startedAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
                    <span className="text-muted-foreground">
                      سجلات: {run.rowsSeen ?? 0}
                    </span>
                    <span className="font-bold text-success-text">
                      +{run.rowsInserted ?? 0}
                    </span>
                    {run.error && (
                      <span
                        className="min-w-0 break-words text-destructive-text sm:max-w-xs"
                        title={run.error}
                      >
                        {run.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          لا توجد عمليات مزامنة بعد.
        </p>
      )}
    </div>
  );
}
