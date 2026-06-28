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
  employees?: { empNo: string; name: string }[];
}

export default function EmpSync() {
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [result, setResult] = useState<EmpSyncResult | null>(null);

  const mut = tRPC.attendance.syncEmployeesFromDevice.useMutation({
    onSuccess: (r: EmpSyncResult) => {
      setResult(r);
      toast.success(
        `تم تزامن الموظفين: ${r.inserted} جديد، ${r.updated} محدَّث`,
      );
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const handleSync = () => {
    const input: Record<string, unknown> = {};
    if (ip.trim()) input.ip = ip.trim();
    if (port.trim()) input.port = parseInt(port) || 5005;
    mut.mutate(input as any);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border border-slate-100 shadow-lg shadow-slate-100/80 bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-slate-50/30 to-white">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            تزامن الأسماء والموظفين
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">IP الجهاز (اختياري)</label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="تلقائي من الإعدادات"
                dir="ltr"
                className="text-xs border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 font-mono py-1.5 h-auto rounded-lg"
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">المنفذ</label>
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="5005"
                dir="ltr"
                className="text-xs border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 font-mono py-1.5 h-auto rounded-lg"
              />
            </div>
          </div>

          <Button
            onClick={handleSync}
            disabled={mut.isPending}
            className="w-full text-xs font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg py-2.5 h-auto gap-2 shadow-md shadow-teal-100/50 hover:shadow-lg transition-all"
          >
            {mut.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {mut.isPending ? "جاري مزامنة الأسماء..." : "تزامن الموظفين من الجهاز"}
          </Button>

          {result && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <Alert variant="default" className="border-teal-200 bg-teal-50 text-teal-800 py-2.5 px-3 shadow-md shadow-teal-50/30 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 text-teal-600 float-right ml-2 mt-0.5" />
                <div className="text-xs font-semibold">
                  <div>تمت مزامنة الموظفين بنجاح</div>
                  <div className="mt-1 flex gap-4 text-[10px] text-teal-700 font-bold">
                    <span>إجمالي: {result.total}</span>
                    <span>جدد: {result.inserted}</span>
                    <span>محدَّثون: {result.updated}</span>
                  </div>
                </div>
              </Alert>

              {/* Synced employees grid sample */}
              {(result.employees?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                  <div className="bg-slate-50/80 px-3 py-2 text-[10px] font-bold text-slate-500 border-b border-slate-100">
                    قائمة بأسماء الموظفين المزامنين
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 text-[11px] bg-white">
                    {result.employees!.slice(0, 30).map((e) => (
                      <div key={e.empNo} className="flex px-3.5 py-2 hover:bg-slate-50/50 justify-between transition-colors">
                        <span className="font-mono font-bold text-teal-600">{e.empNo}</span>
                        <span className="text-slate-700 font-semibold">{e.name}</span>
                      </div>
                    ))}
                    {(result.employees?.length ?? 0) > 30 && (
                      <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 bg-slate-50/50 text-center">
                        و {result.employees!.length - 30} موظفين آخرين...
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
