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
import { toast } from "sonner";

import { askConfirm } from "../askConfirm";
import { Input } from "@/components/ui/input";
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
  const statusQuery = tRPC.attendance.deviceStatus.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const admsStatus = tRPC.attendance.admsStatus.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const zk40Status = tRPC.attendance.zk40Status.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const connectDevice = tRPC.attendance.connectDevice.useMutation();
  const disconnectDevice = tRPC.attendance.disconnectDevice.useMutation();
  const resetConnection = tRPC.attendance.resetDeviceConnection.useMutation();
  const connectZK40 = tRPC.attendance.connectZK40Device.useMutation();
  const disconnectZK40 = tRPC.attendance.disconnectZK40Device.useMutation();
  const updateSettings = tRPC.attendance.updateDeviceSettings.useMutation();
  const syncZK40 = tRPC.attendance.syncFromZK40.useMutation();
  const pushEmployeesZK40 = tRPC.attendance.pushEmployeesToZK40.useMutation();
  const resetFkHwm = tRPC.attendance.resetFkSyncHistory.useMutation();
  const resetZkHwm = tRPC.attendance.resetZkSyncHistory.useMutation();

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
        enabled: ef10k.enabled,
        zk40Protocol: ef10k.zk40Protocol,
        fkProtocol: ef10k.fkProtocol,
      });
      setShowSuccess(true);
      settingsQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ إعدادات FK",
      );
    }
  };

  const saveK40 = async () => {
    try {
      await updateSettings.mutateAsync({
        deviceId: 2,
        enabled: k40.enabled,
        zk40Protocol: k40.zk40Protocol,
        fkProtocol: k40.fkProtocol,
      });
      setShowSuccess(true);
      settingsQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ إعدادات ZK",
      );
    }
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
    "w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-foreground font-medium";

  if (settingsQuery.isLoading) {
    return (
      <div
        role="status"
        className="py-8 text-center text-sm text-muted-foreground"
      >
        جارٍ تحميل إعدادات الأجهزة.
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 p-6 text-sm"
      >
        <span>تعذر تحميل إعدادات الأجهزة.</span>
        <Button
          type="button"
          variant="outline"
          onClick={() => settingsQuery.refetch()}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {showSuccess && (
        <Alert
          variant="default"
          className="border-primary/20 bg-primary/5 text-primary shadow-teal-50/50"
        >
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="font-semibold text-xs">
            تم حفظ إعدادات أجهزة الحضور بنجاح
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* EF10K Live Monitor */}
        <div className="md:col-span-6 p-6 bg-card border border-border/60 rounded-xl flex flex-col justify-between transition-transform duration-200">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-primary text-primary-foreground font-mono text-xs font-bold">
                  DEV 01
                </div>
                <h3 className="text-xs font-black text-foreground">
                  جهاز EF10K (الرئيسي)
                </h3>
              </div>

              {status.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-success/30">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  متصل
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive-text border border-destructive/30">
                  غير متصل
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-muted/30 rounded-xl border border-border/60">
                <span className="text-xs text-muted-foreground block font-bold">
                  آخر وقت للمزامنة
                </span>
                <span className="font-mono font-bold text-foreground text-xs mt-1 block">
                  {status.lastConnected
                    ? new Date(status.lastConnected).toLocaleTimeString("ar-EG")
                    : "-"}
                </span>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl border border-border/60">
                <span className="text-xs text-muted-foreground block font-bold">
                  سجلات البصمة
                </span>
                <span className="font-mono font-bold text-foreground text-xs mt-1 block">
                  {status.punchCount ?? 0} بصمة
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap pt-3 border-t border-border/60">
              <Button
                size="sm"
                onClick={() =>
                  connectDevice.mutate(undefined, {
                    onSuccess: () => statusQuery.refetch(),
                    onError: (error: Error) => toast.error(error.message),
                  })
                }
                disabled={connectDevice.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-1.5 px-4 h-auto rounded-lg shadow-xs"
              >
                اتصال
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  disconnectDevice.mutate(undefined, {
                    onSuccess: () => statusQuery.refetch(),
                    onError: (error: Error) => toast.error(error.message),
                  })
                }
                disabled={disconnectDevice.isPending}
                className="border-border/60 hover:bg-muted text-foreground text-xs font-bold py-1.5 px-4 h-auto rounded-lg"
              >
                فصل
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  window.open("/attendance/admin/console", "_blank")
                }
                className="border-border/60 hover:bg-muted text-foreground text-xs font-bold py-1.5 px-4 h-auto rounded-lg gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5 text-primary" />
                شاشة الفحص
              </Button>
            </div>
          </div>
        </div>

        {/* ZK40 Live Monitor */}
        <div className="md:col-span-6 p-6 bg-card border border-border/60 rounded-xl flex flex-col justify-between transition-transform duration-200">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-primary text-primary-foreground font-mono text-xs font-bold">
                  DEV 02
                </div>
                <h3 className="text-xs font-black text-foreground">
                  جهاز K40 Pro (الفرعي)
                </h3>
              </div>

              {k40.zk40Protocol === "tcp" ? (
                zk40Status.data?.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-info/30">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
                    </span>
                    متصل
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-bold bg-destructive/10 text-destructive-text gap-1.5 px-3 py-1 rounded-full border border-rose-350">
                    غير متصل
                  </span>
                )
              ) : admsOnline ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-info/30">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
                  </span>
                  ADMS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive-text border border-destructive/30">
                  غير متصل
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-muted/30 rounded-xl border border-border/60">
                <span className="text-xs text-muted-foreground block font-bold">
                  {k40.zk40Protocol === "tcp"
                    ? "آخر وقت للاتصال"
                    : "آخر نبضة مستلمة"}
                </span>
                <span className="font-mono font-bold text-foreground text-xs mt-1 block">
                  {k40.zk40Protocol === "tcp"
                    ? zk40Status.data?.lastConnected
                      ? new Date(
                          zk40Status.data.lastConnected,
                        ).toLocaleTimeString("ar-EG")
                      : "-"
                    : lastAdmsPunch
                      ? lastAdmsPunch.toLocaleTimeString("ar-EG")
                      : "-"}
                </span>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl border border-border/60">
                <span className="text-xs text-muted-foreground block font-bold">
                  سجلات البصمة
                </span>
                <span className="font-mono font-bold text-foreground text-xs mt-1 block">
                  {adms?.punchCount ?? 0} بصمة
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap pt-3 border-t border-border/60">
              <Button
                size="sm"
                onClick={() =>
                  connectZK40.mutate(undefined, {
                    onSuccess: () => {
                      zk40Status.refetch();
                      settingsQuery.refetch();
                    },
                    onError: (error: Error) => toast.error(error.message),
                  })
                }
                disabled={connectZK40.isPending || !k40.ip}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-1.5 px-4 h-auto rounded-lg shadow-xs"
              >
                اتصال
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  disconnectZK40.mutate(undefined, {
                    onSuccess: () => {
                      zk40Status.refetch();
                      settingsQuery.refetch();
                    },
                    onError: (error: Error) => toast.error(error.message),
                  })
                }
                disabled={disconnectZK40.isPending}
                className="border-border/60 hover:bg-muted text-foreground text-xs font-bold py-1.5 px-4 h-auto rounded-lg"
              >
                فصل
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const synced = await syncZK40.mutateAsync();
                    if (!synced.success)
                      throw new Error(synced.error || "فشلت المزامنة");
                    admsStatus.refetch();
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "فشلت المزامنة",
                    );
                  }
                }}
                disabled={syncZK40.isPending || !k40.ip}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-1.5 px-4 h-auto rounded-lg shadow-xs"
              >
                تزامن يدوي
              </Button>
            </div>
          </div>
        </div>

        {/* Network Configuration */}
        <div className="md:col-span-12 p-6 bg-card border border-border/60 rounded-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Settings2 className="w-4.5 h-4.5 text-primary" />
            <h3 className="text-xs font-black text-foreground">
              تفاصيل تهيئة المنافذ والبروتوكول
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* EF10K Config Form */}
            <div className="space-y-4 md:border-e md:border-border/60 md:pe-8">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <div className="h-3 w-1 rounded-full bg-primary"></div>
                <h4 className="text-xs font-bold text-foreground">
                  تهيئة جهاز EF10K
                </h4>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">
                  رقم البروتوكول (FK Protocol)
                </label>
                <select
                  aria-label="رقم البروتوكول (FK Protocol)"
                  value={ef10k.fkProtocol}
                  onChange={(e) =>
                    setEf10k({
                      ...ef10k,
                      fkProtocol: parseInt(e.target.value) as 0 | 1,
                    })
                  }
                  className={inputCls}
                >
                  <option value={0}>Protocol 0 (الافتراضي)</option>
                  <option value={1}>Protocol 1</option>
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">
                    IP الجهاز
                  </label>
                  <Input bare
                    aria-label="IP الجهاز"
                    type="text"
                    value={ef10k.ip}
                    disabled
                    readOnly
                    className={`${inputCls} font-mono bg-muted/40 text-muted-foreground cursor-not-allowed`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">
                    المنفذ
                  </label>
                  <Input bare
                    aria-label="المنفذ"
                    type="number"
                    value={ef10k.port}
                    disabled
                    readOnly
                    className={`${inputCls} font-mono bg-muted/40 text-muted-foreground cursor-not-allowed`}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                * يُقرأ IP والمنفذ من متغيرات البيئة (.env) فقط ولا يمكن
                تعديلهما من هنا
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ef10k-enabled-bento"
                  checked={ef10k.enabled}
                  onChange={(e) =>
                    setEf10k({ ...ef10k, enabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label
                  htmlFor="ef10k-enabled-bento"
                  className="text-xs font-bold text-muted-foreground cursor-pointer select-none"
                >
                  تفعيل ومزامنة الجهاز في النظام
                </label>
              </div>

              <Button
                onClick={saveEF10K}
                disabled={updateSettings.isPending}
                className="w-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-2 h-auto"
              >
                {updateSettings.isPending ? "جاري" : "حفظ إعدادات EF10K"}
              </Button>
              <Button
                onClick={async () => {
                  if (
                    !(await askConfirm(
                      "إعادة ضبط مزامنة FK؟ ستُسحب البصمات من 1 يناير 2026 فقط.",
                    ))
                  )
                    return;
                  try {
                    await resetFkHwm.mutateAsync();
                    toast.success("تمت إعادة ضبط مزامنة FK");
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "تعذر إعادة ضبط مزامنة FK",
                    );
                  }
                }}
                disabled={resetFkHwm.isPending}
                variant="outline"
                className="w-full whitespace-normal text-xs font-bold border-destructive/30 text-destructive-text hover:bg-muted rounded-lg py-2 h-auto"
              >
                {resetFkHwm.isPending ? "جاري" : "إعادة ضبط FK من 1 يناير 2026"}
              </Button>
            </div>

            {/* K40 Pro Config Form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <div className="w-1 h-3 bg-primary rounded-full"></div>
                <h4 className="text-xs font-bold text-foreground">
                  تهيئة جهاز K40 Pro
                </h4>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">
                  بروتوكول الاتصال
                </label>
                <select
                  aria-label="بروتوكول الاتصال"
                  value={k40.zk40Protocol}
                  onChange={(e) =>
                    setK40({
                      ...k40,
                      zk40Protocol: e.target.value as "adms" | "tcp",
                    })
                  }
                  className={inputCls}
                >
                  <option value="adms">ADMS (الخادم يستقبل - Push)</option>
                  <option value="tcp">TCP (الخادم يسحب - Pull)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">
                    IP الجهاز
                  </label>
                  <Input bare
                    aria-label="IP الجهاز"
                    type="text"
                    value={k40.ip}
                    disabled
                    readOnly
                    className={`${inputCls} font-mono bg-muted/40 text-muted-foreground cursor-not-allowed`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">
                    المنفذ
                  </label>
                  <Input bare
                    aria-label="المنفذ"
                    type="number"
                    value={k40.port}
                    disabled
                    readOnly
                    className={`${inputCls} font-mono bg-muted/40 text-muted-foreground cursor-not-allowed`}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                * يُقرأ IP والمنفذ من متغيرات البيئة (.env) فقط ولا يمكن
                تعديلهما من هنا
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="k40-enabled-bento"
                  checked={k40.enabled}
                  onChange={(e) =>
                    setK40({ ...k40, enabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label
                  htmlFor="k40-enabled-bento"
                  className="text-xs font-bold text-muted-foreground cursor-pointer select-none"
                >
                  تفعيل ومزامنة الجهاز في النظام
                </label>
              </div>

              <Button
                onClick={saveK40}
                disabled={updateSettings.isPending}
                className="w-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-2 h-auto"
              >
                {updateSettings.isPending ? "جاري" : "حفظ إعدادات K40 Pro"}
              </Button>
              <Button
                onClick={async () => {
                  if (
                    !(await askConfirm(
                      "مسح HWM للمزامنة؟ ستُعاد استيراد جميع البصمات في المزامنة القادمة.",
                    ))
                  )
                    return;
                  try {
                    await resetZkHwm.mutateAsync();
                    toast.success("تمت إعادة ضبط HWM لجهاز K40 Pro");
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "تعذر إعادة ضبط HWM",
                    );
                  }
                }}
                disabled={resetZkHwm.isPending}
                variant="outline"
                className="w-full whitespace-normal text-xs font-bold border-destructive/30 text-destructive-text hover:bg-muted rounded-lg py-2 h-auto"
              >
                {resetZkHwm.isPending
                  ? "جاري"
                  : "إعادة ضبط HWM (استعادة بصمات مفقودة)"}
              </Button>
            </div>
          </div>
        </div>

        {/* Sync status & timeline logs */}
        <div className="md:col-span-6">
          <SyncStatus />
        </div>

        {/* Employee sync & names list */}
        <div className="md:col-span-6">
          <EmpSync />
        </div>
      </div>
    </div>
  );
}
