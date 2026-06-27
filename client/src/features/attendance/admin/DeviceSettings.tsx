import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

const tRPC = trpc as any;

export default function DeviceSettings() {
  const [formData, setFormData] = useState({
    ip: "",
    port: 5005,
    enabled: false,
    fkProtocol: 0 as 0 | 1,
    zk40Ip: "",
    zk40Port: 4370,
    zk40Enabled: false,
    zk40Protocol: "adms" as "adms" | "tcp",
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const settingsQuery   = tRPC.attendance.deviceSettings.useQuery();
  const statusQuery     = tRPC.attendance.deviceStatus.useQuery({ refetchInterval: 10000 });
  const admsStatus      = tRPC.attendance.admsStatus.useQuery(undefined, { refetchInterval: 15000 });
  const connectDevice   = tRPC.attendance.connectDevice.useMutation();
  const disconnectDevice = tRPC.attendance.disconnectDevice.useMutation();
  const resetConnection = tRPC.attendance.resetDeviceConnection.useMutation();
  const updateSettings  = tRPC.attendance.updateDeviceSettings.useMutation();
  const syncZK40        = tRPC.attendance.syncFromZK40.useMutation();
  const pushEmployeesZK40 = tRPC.attendance.pushEmployeesToZK40.useMutation();

  useEffect(() => {
    if (settingsQuery.data) {
      setFormData({
        ip: settingsQuery.data.ip,
        port: settingsQuery.data.port,
        enabled: settingsQuery.data.enabled,
        fkProtocol: ((settingsQuery.data as any).fkProtocol ?? 0) as 0 | 1,
        zk40Ip: (settingsQuery.data as any).zk40Ip ?? "",
        zk40Port: (settingsQuery.data as any).zk40Port ?? 4370,
        zk40Enabled: (settingsQuery.data as any).zk40Enabled ?? false,
        zk40Protocol: (settingsQuery.data as any).zk40Protocol ?? "adms",
      });
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (showSuccess) {
      const t = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showSuccess]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        ip: formData.ip,
        port: formData.port,
        enabled: formData.enabled,
        fkProtocol: formData.fkProtocol,
        zk40Ip: formData.zk40Ip || null,
        zk40Port: formData.zk40Port,
        zk40Enabled: formData.zk40Enabled,
        zk40Protocol: formData.zk40Protocol,
      });
      setShowSuccess(true);
      settingsQuery.refetch();
    } catch {}
  };

  const status = statusQuery.data ?? { connected: false, lastConnected: null, uptime: 0, lastPunch: null, punchCount: 0, connectionError: null };
  const adms = admsStatus.data;
  const lastAdmsPunch = adms?.lastPunch ? new Date(adms.lastPunch) : null;
  const admsMins = lastAdmsPunch ? (Date.now() - lastAdmsPunch.getTime()) / 60000 : Infinity;
  const admsOnline = admsMins < 60;

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Device console / وحدة الجهاز
        </p>
        <h2 className="text-3xl font-bold text-foreground">إعدادات أجهزة البصمة</h2>
      </div>

      {showSuccess && (
        <Alert variant="default" className="border-success/30 bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">تم حفظ الإعدادات بنجاح</AlertDescription>
        </Alert>
      )}

      {/* ── Two columns: EF10K | K40 Pro ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* ── EF10K column ── */}
        <div className="space-y-4">
          {/* EF10K status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {status.connected
                    ? <><Wifi className="w-4 h-4 text-success" />EF10K — متصل</>
                    : <><WifiOff className="w-4 h-4 text-destructive" />EF10K — غير متصل</>}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => statusQuery.refetch()} disabled={statusQuery.isRefetching}>
                  <RefreshCw className={`w-3.5 h-3.5 ${statusQuery.isRefetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {status.connectionError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{status.connectionError}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">آخر اتصال</p>
                  <p className="font-mono text-xs mt-0.5">{status.lastConnected ? new Date(status.lastConnected).toLocaleString("ar-EG") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">زمن التشغيل</p>
                  <p className="font-mono text-xs mt-0.5">{status.uptime ?? 0}s</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">آخر بصمة</p>
                  <p className="font-mono text-xs mt-0.5">{status.lastPunch ? new Date(status.lastPunch).toLocaleString("ar-EG") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي البصمات</p>
                  <p className="font-mono text-xs mt-0.5">{status.punchCount ?? 0}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => connectDevice.mutateAsync().then(() => statusQuery.refetch())} disabled={connectDevice.isPending}>
                  {connectDevice.isPending ? "جارٍ..." : "اتصال"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => disconnectDevice.mutateAsync().then(() => statusQuery.refetch())} disabled={disconnectDevice.isPending}>
                  {disconnectDevice.isPending ? "جارٍ..." : "فصل"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => resetConnection.mutateAsync().then(() => statusQuery.refetch())} disabled={resetConnection.isPending}>
                  {resetConnection.isPending ? "جارٍ..." : "إعادة الضبط"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* EF10K config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">إعداد EF10K</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">عنوان IP الجهاز</label>
                <input type="text" value={formData.ip} onChange={(e) => setFormData({ ...formData, ip: e.target.value })} placeholder="192.168.0.10" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">المنفذ (TCP)</label>
                <input type="number" value={formData.port} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 5005 })} min="1" max="65535" className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ef10k-enabled" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} className="rounded border-border" />
                <label htmlFor="ef10k-enabled" className="text-sm font-medium cursor-pointer">تفعيل EF10K</label>
              </div>
              <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full">
                {updateSettings.isPending ? "جارٍ الحفظ..." : "حفظ إعدادات EF10K"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── K40 Pro column ── */}
        <div className="space-y-4">
          {/* K40 Pro status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {admsOnline
                    ? <><Wifi className="w-4 h-4 text-success" />K40 Pro — متصل</>
                    : <><WifiOff className="w-4 h-4 text-muted-foreground" />K40 Pro — في انتظار البصمة</>}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => admsStatus.refetch()} disabled={admsStatus.isRefetching}>
                  <RefreshCw className={`w-3.5 h-3.5 ${admsStatus.isRefetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">آخر بصمة</p>
                  <p className="font-mono text-xs mt-0.5">{lastAdmsPunch ? lastAdmsPunch.toLocaleString("ar-EG") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي البصمات</p>
                  <p className="font-mono text-xs mt-0.5">{adms?.punchCount ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">كود الجهاز (SN)</p>
                  <p className="font-mono text-xs mt-0.5">{adms?.lastDeviceId ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">البروتوكول</p>
                  <p className="font-mono text-xs mt-0.5">HTTP ADMS Push</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* K40 Pro config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">إعداد K40 Pro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">بروتوكول الاتصال</label>
                <select value={formData.zk40Protocol} onChange={(e) => setFormData({ ...formData, zk40Protocol: e.target.value as "adms" | "tcp" })} className={inputCls}>
                  <option value="adms">ADMS (الجهاز يرسل للخادم)</option>
                  <option value="tcp">TCP مباشر (الخادم يسحب من الجهاز)</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formData.zk40Protocol === "tcp"
                    ? "اتصال مباشر بالجهاز عبر منفذ TCP (عادةً 4370) — يتطلب وصول الخادم لشبكة الجهاز."
                    : "الجهاز يرسل البصمات للخادم تلقائياً (Push) — مناسب عند وجود الجهاز خلف راوتر."}
                </p>
              </div>
              {formData.zk40Protocol === "tcp" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">بروتوكول SDK</label>
                  <select value={formData.fkProtocol} onChange={(e) => setFormData({ ...formData, fkProtocol: parseInt(e.target.value) as 0 | 1 })} className={inputCls}>
                    <option value={0}>Protocol 0 (افتراضي)</option>
                    <option value={1}>Protocol 1</option>
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">إذا ظهر "Connect failed. Try --protocol 1" اختر Protocol 1.</p>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium">عنوان IP العام</label>
                <input type="text" value={formData.zk40Ip} onChange={(e) => setFormData({ ...formData, zk40Ip: e.target.value })} placeholder="41.x.x.x أو hostname" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">المنفذ (عادةً 4370)</label>
                <input type="number" value={formData.zk40Port} onChange={(e) => setFormData({ ...formData, zk40Port: parseInt(e.target.value) || 4370 })} min="1" max="65535" className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="zk40-enabled" checked={formData.zk40Enabled} onChange={(e) => setFormData({ ...formData, zk40Enabled: e.target.checked })} className="rounded border-border" />
                <label htmlFor="zk40-enabled" className="text-sm font-medium cursor-pointer">تفعيل K40 Pro</label>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleSave} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                <Button variant="outline" onClick={async () => { try { await syncZK40.mutateAsync(); setShowSuccess(true); } catch {} }} disabled={syncZK40.isPending || !formData.zk40Ip}>
                  {syncZK40.isPending ? "جارٍ..." : "تزامن البصمات"}
                </Button>
                <Button variant="outline" onClick={async () => { try { const r = await pushEmployeesZK40.mutateAsync(); alert(r.message); } catch {} }} disabled={pushEmployeesZK40.isPending}>
                  {pushEmployeesZK40.isPending ? "جارٍ..." : "تزامن الموظفين"}
                </Button>
              </div>
              {syncZK40.data && (
                <Alert variant="default" className="border-success/30 bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    {syncZK40.data.recordsInserted} سجل جديد من {syncZK40.data.recordsSeen}
                  </AlertDescription>
                </Alert>
              )}
              {syncZK40.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{String(syncZK40.error)}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
