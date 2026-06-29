import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Terminal,
  Settings2,
  Radio,
  Download,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import SyncStatus from "./SyncStatus";
import EmpSync from "./EmpSync";

const tRPC = trpc as any;

export default function DeviceSettings() {
  const [ef10k, setEf10k] = useState({
    ip: "",
    port: 5005,
    enabled: false,
    zk40Protocol: "tcp" as "adms" | "tcp",
    fkProtocol: 0 as 0 | 1,
    commPassword: 0,
  });
  const [k40, setK40] = useState({
    ip: "",
    port: 4370,
    enabled: false,
    zk40Protocol: "tcp" as "adms" | "tcp",
    fkProtocol: 0 as 0 | 1,
    commPassword: 0,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const settingsQuery = tRPC.attendance.deviceSettings.useQuery();
  const statusQuery = tRPC.attendance.deviceStatus.useQuery({
    refetchInterval: 10000,
  });
  const admsStatus = tRPC.attendance.admsStatus.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const connectDevice = tRPC.attendance.connectDevice.useMutation();
  const disconnectDevice = tRPC.attendance.disconnectDevice.useMutation();
  const resetConnection = tRPC.attendance.resetDeviceConnection.useMutation();
  const updateSettings = tRPC.attendance.updateDeviceSettings.useMutation();
  const syncZK40 = tRPC.attendance.syncFromZK40.useMutation();
  const pushEmployeesZK40 = tRPC.attendance.pushEmployeesToZK40.useMutation();
  const resetFkHwm = tRPC.attendance.resetFkSyncHistory.useMutation();

  useEffect(() => {
    if (!settingsQuery.data) return;
    const d = settingsQuery.data as any;
    if (d.ef10k) {
      setEf10k({
        ip: d.ef10k.ip ?? "",
        port: d.ef10k.port ?? 5005,
        enabled: d.ef10k.enabled ?? false,
        zk40Protocol: d.ef10k.zk40Protocol ?? "tcp",
        fkProtocol: d.ef10k.fkProtocol ?? 0,
        commPassword: d.ef10k.commPassword ?? 0,
      });
    }
    if (d.k40) {
      setK40({
        ip: d.k40.ip ?? "",
        port: d.k40.port ?? 4370,
        enabled: d.k40.enabled ?? false,
        zk40Protocol: d.k40.zk40Protocol ?? "tcp",
        fkProtocol: d.k40.fkProtocol ?? 0,
        commPassword: d.k40.commPassword ?? 0,
      });
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (showSuccess) {
      const t = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showSuccess]);

  const saveEF10K = async () => {
    try {
      await updateSettings.mutateAsync({
        deviceId: 1,
        ip: ef10k.ip,
        port: ef10k.port,
        enabled: ef10k.enabled,
        zk40Protocol: ef10k.zk40Protocol,
        fkProtocol: ef10k.fkProtocol,
        commPassword: ef10k.commPassword,
      });
      setShowSuccess(true);
      settingsQuery.refetch();
    } catch {}
  };

  const saveK40 = async () => {
    try {
      await updateSettings.mutateAsync({
        deviceId: 2,
        ip: k40.ip,
        port: k40.port,
        enabled: k40.enabled,
        zk40Protocol: k40.zk40Protocol,
        fkProtocol: k40.fkProtocol,
        commPassword: k40.commPassword,
      });
      setShowSuccess(true);
      settingsQuery.refetch();
    } catch {}
  };

  const status = statusQuery.data ?? {
    connected: false,
    lastConnected: null,
    uptime: 0,
    lastPunch: null,
    punchCount: 0,
    connectionError: null,
  };
  const adms = admsStatus.data;
  const lastAdmsPunch = adms?.lastPunch ? new Date(adms.lastPunch) : null;
  const admsMins = lastAdmsPunch
    ? (Date.now() - lastAdmsPunch.getTime()) / 60000
    : Infinity;
  const admsOnline = admsMins < 60;

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all duration-200 text-slate-800 font-medium";

  return (
    <div className="space-y-6" dir="rtl">
      {showSuccess && (
        <Alert variant="default" className="border-teal-200 bg-teal-50 text-teal-800 shadow-md shadow-teal-50/50 animate-in fade-in duration-300">
          <CheckCircle className="h-4 w-4 text-teal-600" />
          <AlertDescription className="font-semibold text-xs">تم حفظ إعدادات أجهزة الحضور بنجاح</AlertDescription>
        </Alert>
      )}

      {/* ── Bento Grid Puzzle ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Bento Box 1: EF10K Live Monitor (col-span-6) - Mint Theme */}
        <div className="md:col-span-6 p-6 bg-[#ECFDF5] border border-emerald-150 rounded-3xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-emerald-600 text-white font-mono text-[9px] font-bold">DEV 01</div>
                <h3 className="text-xs font-black text-emerald-950">جهاز EF10K (الرئيسي)</h3>
              </div>
              
              {status.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold bg-emerald-600/10 text-emerald-700 border border-emerald-350 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  متصل
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold bg-rose-600/10 text-rose-700 border border-rose-350">
                  غير متصل
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white/80 rounded-xl border border-emerald-100/50">
                <span className="text-[9px] text-emerald-800/60 block font-bold">آخر وقت للمزامنة</span>
                <span className="font-mono font-bold text-emerald-950 text-[10px] mt-1 block">
                  {status.lastConnected ? new Date(status.lastConnected).toLocaleTimeString("ar-EG") : "—"}
                </span>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-emerald-100/50">
                <span className="text-[9px] text-emerald-800/60 block font-bold">سجلات البصمة</span>
                <span className="font-mono font-bold text-emerald-950 text-[10px] mt-1 block">
                  {status.punchCount ?? 0} بصمة
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap pt-3 border-t border-emerald-100/50">
              <Button
                size="sm"
                onClick={() => connectDevice.mutateAsync().then(() => statusQuery.refetch())}
                disabled={connectDevice.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-4 h-auto rounded-lg shadow-sm"
              >
                اتصال
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => disconnectDevice.mutateAsync().then(() => statusQuery.refetch())}
                disabled={disconnectDevice.isPending}
                className="border-emerald-250 hover:bg-emerald-100 text-emerald-950 text-[10px] font-bold py-1.5 px-4 h-auto rounded-lg"
              >
                فصل
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open("/attendance/admin/console", "_blank")}
                className="border-emerald-250 hover:bg-emerald-100 text-emerald-950 text-[10px] font-bold py-1.5 px-4 h-auto rounded-lg gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-700" />
                شاشة الفحص
              </Button>
            </div>
          </div>
        </div>

        {/* Bento Box 2: ZK40 Live Monitor (col-span-6) - Sky Theme */}
        <div className="md:col-span-6 p-6 bg-[#F0F9FF] border border-sky-150 rounded-3xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-sky-100/50 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-sky-600 text-white font-mono text-[9px] font-bold">DEV 02</div>
                <h3 className="text-xs font-black text-sky-950">جهاز K40 Pro (الفرعي)</h3>
              </div>
              
              {admsOnline ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold bg-sky-600/10 text-sky-700 border border-sky-350 shadow-[0_0_12px_rgba(56,189,248,0.1)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                  ADMS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold bg-rose-600/10 text-rose-700 border border-rose-350">
                  غير متصل
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white/80 rounded-xl border border-sky-100/50">
                <span className="text-[9px] text-sky-800/60 block font-bold">آخر نبضة مستلمة</span>
                <span className="font-mono font-bold text-sky-950 text-[10px] mt-1 block">
                  {lastAdmsPunch ? lastAdmsPunch.toLocaleTimeString("ar-EG") : "—"}
                </span>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-sky-100/50">
                <span className="text-[9px] text-sky-800/60 block font-bold">سجلات البصمة</span>
                <span className="font-mono font-bold text-sky-950 text-[10px] mt-1 block">
                  {adms?.punchCount ?? 0} بصمة
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap pt-3 border-t border-sky-100/50">
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await syncZK40.mutateAsync();
                    admsStatus.refetch();
                  } catch {}
                }}
                disabled={syncZK40.isPending || !k40.ip}
                className="bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold py-1.5 px-4 h-auto rounded-lg shadow-sm"
              >
                تزامن يدوي
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => admsStatus.refetch()}
                disabled={admsStatus.isRefetching}
                className="border-sky-250 hover:bg-sky-100 text-sky-950 text-[10px] font-bold py-1.5 px-4 h-auto rounded-lg"
              >
                فصل
              </Button>
            </div>
          </div>
        </div>

        {/* Bento Box 3: Network Configuration (col-span-12) - White with details */}
        <div className="md:col-span-12 p-6 bg-white border border-slate-200 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings2 className="w-4.5 h-4.5 text-teal-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">تفاصيل تهيئة المنافذ والبروتوكول</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* EF10K Config Form */}
            <div className="space-y-4 md:border-l md:border-slate-100 md:pl-8">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <div className="w-1 h-3 bg-teal-600 rounded-full"></div>
                <h4 className="text-xs font-bold text-slate-800">تهيئة جهاز EF10K</h4>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">رقم البروتوكول (FK Protocol)</label>
                <select
                  value={ef10k.fkProtocol}
                  onChange={(e) => setEf10k({ ...ef10k, fkProtocol: parseInt(e.target.value) as 0 | 1 })}
                  className={inputCls}
                >
                  <option value={0}>Protocol 0 (الافتراضي)</option>
                  <option value={1}>Protocol 1</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">IP الجهاز</label>
                  <input
                    type="text"
                    value={ef10k.ip}
                    onChange={(e) => setEf10k({ ...ef10k, ip: e.target.value })}
                    placeholder="192.168.0.10"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">المنفذ</label>
                  <input
                    type="number"
                    value={ef10k.port}
                    onChange={(e) => setEf10k({ ...ef10k, port: parseInt(e.target.value) || 5005 })}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ef10k-enabled-bento"
                  checked={ef10k.enabled}
                  onChange={(e) => setEf10k({ ...ef10k, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="ef10k-enabled-bento" className="text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                  تفعيل ومزامنة الجهاز في النظام
                </label>
              </div>

              <Button
                onClick={saveEF10K}
                disabled={updateSettings.isPending}
                className="w-full text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 h-auto"
              >
                {updateSettings.isPending ? "جاري..." : "حفظ إعدادات EF10K"}
              </Button>
              <Button
                onClick={async () => {
                  if (!confirm("مسح HWM للمزامنة؟ ستُعاد استيراد جميع البصمات في المزامنة القادمة.")) return;
                  await resetFkHwm.mutateAsync();
                }}
                disabled={resetFkHwm.isPending}
                variant="outline"
                className="w-full text-[10px] font-bold border-red-300 text-red-700 hover:bg-red-50 rounded-lg py-2 h-auto"
              >
                {resetFkHwm.isPending ? "جاري..." : "إعادة ضبط HWM (استعادة بصمات مفقودة)"}
              </Button>
            </div>

            {/* K40 Pro Config Form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <div className="w-1 h-3 bg-sky-600 rounded-full"></div>
                <h4 className="text-xs font-bold text-slate-800">تهيئة جهاز K40 Pro</h4>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">بروتوكول الاتصال</label>
                <select
                  value={k40.zk40Protocol}
                  onChange={(e) => setK40({ ...k40, zk40Protocol: e.target.value as "adms" | "tcp" })}
                  className={inputCls}
                >
                  <option value="adms">ADMS (الخادم يستقبل - Push)</option>
                  <option value="tcp">TCP (الخادم يسحب - Pull)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">IP الجهاز</label>
                  <input
                    type="text"
                    value={k40.ip}
                    onChange={(e) => setK40({ ...k40, ip: e.target.value })}
                    placeholder="192.168.0.20"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">المنفذ</label>
                  <input
                    type="number"
                    value={k40.port}
                    onChange={(e) => setK40({ ...k40, port: parseInt(e.target.value) || 4370 })}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="k40-enabled-bento"
                  checked={k40.enabled}
                  onChange={(e) => setK40({ ...k40, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="k40-enabled-bento" className="text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                  تفعيل ومزامنة الجهاز في النظام
                </label>
              </div>

              <Button
                onClick={saveK40}
                disabled={updateSettings.isPending}
                className="w-full text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 h-auto"
              >
                {updateSettings.isPending ? "جاري..." : "حفظ إعدادات K40 Pro"}
              </Button>
            </div>

          </div>
        </div>

        {/* Bento Box 4: Sync status & timeline logs (col-span-6) */}
        <div className="md:col-span-6">
          <SyncStatus />
        </div>

        {/* Bento Box 5: Employee sync & names list (col-span-6) */}
        <div className="md:col-span-6">
          <EmpSync />
        </div>

      </div>
    </div>
  );
}
