import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Users, CheckCircle2, UserCheck } from "lucide-react";
import { toast } from "sonner";

const tRPC = trpc as any;

interface EmpSyncResult {
  success: boolean;
  inserted: number;
  updated: number;
  total: number;
  error?: string;
  employees?: { empNo: string; name: string }[];
}

export default function EmpSync() {
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [result, setResult] = useState<EmpSyncResult | null>(null);

  const mut = tRPC.attendance.syncEmployeesFromDevice.useMutation({
    onSuccess: (r: EmpSyncResult) => {
      setResult(r);
      if (r.success) {
        toast.success(
          `تم تزامن الموظفين: ${r.inserted} جديد، ${r.updated} محدَّث`,
        );
      } else {
        toast.error(r.error ?? "فشل تزامن الموظفين من الجهاز");
      }
    },
    onError: (e: any) =>
      toast.error("تعذر مزامنة الموظفين من الجهاز: " + e.message),
  });

  const handleSync = () => {
    const input: Record<string, unknown> = {};
    if (ip.trim()) input.ip = ip.trim();
    if (port.trim()) input.port = parseInt(port) || 5005;
    mut.mutate(input as any);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border border-border/60 bg-card rounded-xl overflow-hidden transition-colors duration-300">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/40">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/5 text-primary shrink-0">
              <Users className="w-4 h-4" />
            </div>
            تزامن الأسماء والموظفين
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <label className="text-xs font-bold text-muted-foreground block">
                IP الجهاز (اختياري)
              </label>
              <Input
                aria-label="IP الجهاز (اختياري)"
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

          <Button
            onClick={handleSync}
            disabled={mut.isPending}
            className="w-full text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-2.5 h-auto gap-2 transition-colors"
          >
            {mut.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {mut.isPending ? "جاري مزامنة الأسماء" : "تزامن الموظفين من الجهاز"}
          </Button>

          {result && (
            <div className="space-y-3 pt-3 border-t border-border/60">
              <Alert
                variant="default"
                className="bg-primary/5 text-foreground border-primary/20 py-2.5 px-3 shadow-md shadow-teal-50/30"
              >
                <CheckCircle2 className="h-4 w-4 text-primary float-right me-2 mt-0.5" />
                <div className="text-xs font-semibold">
                  <div>تمت مزامنة الموظفين بنجاح</div>
                  <div className="mt-1 flex gap-4 text-xs text-primary font-bold">
                    <span>إجمالي: {result.total}</span>
                    <span>جدد: {result.inserted}</span>
                    <span>محدَّثون: {result.updated}</span>
                  </div>
                </div>
              </Alert>

              {/* Synced employees grid sample */}
              {(result.employees?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-border/60 overflow-hidden shadow-xs bg-card">
                  <div className="bg-muted/40 px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border/60">
                    قائمة بأسماء الموظفين المزامنين
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/60 text-xs bg-card">
                    {result.employees!.slice(0, 30).map((e) => (
                      <div
                        key={e.empNo}
                        className="flex px-3.5 py-2 hover:bg-muted/30 justify-between transition-colors"
                      >
                        <span className="font-mono font-bold text-primary">
                          {e.empNo}
                        </span>
                        <span className="text-foreground font-semibold">
                          {e.name}
                        </span>
                      </div>
                    ))}
                    {(result.employees?.length ?? 0) > 30 && (
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 text-center">
                        و {result.employees!.length - 30} موظفين آخرين
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
