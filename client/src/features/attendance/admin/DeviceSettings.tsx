import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

const tRPC = trpc as any;

export default function DeviceSettings() {
  const [ef10k, setEf10k] = useState({ ip: "", port: 5005, enabled: false, zk40Protocol: "tcp" as "adms" | "tcp", fkProtocol: 0 as 0 | 1, commPassword: 0 });
  const [k40, setK40] = useState({ ip: "", port: 4370, enabled: false, zk40Protocol: "adms" as "adms" | "tcp", fkProtocol: 0 as 0 | 1, commPassword: 0, admsEnabled: true });
  const [showSuccess, setShowSuccess] = useState(false);

  const settingsQuery    = tRPC.attendance.deviceSettings.useQuery();
  const statusQuery      = tRPC.attendance.deviceStatus.useQuery({ refetchInterval: 10000 });
  const admsStatus       = tRPC.attendance.admsStatus.useQuery(undefined, { refetchInterval: 15000 });
  const connectDevice    = tRPC.attendance.connectDevice.useMutation();
  const disconnectDevice = tRPC.attendance.disconnectDevice.useMutation();
  const resetConnection  = tRPC.attendance.resetDeviceConnection.useMutation();
  const updateSettings   = tRPC.attendance.updateDeviceSettings.useMutation();
  const syncZK40         = tRPC.attendance.syncFromZK40.useMutation();
  const pushEmployeesZK40 = tRPC.attendance.pushEmployeesToZK40.useMutation();

  useEffect(() => {
    if (!settingsQuery.data) return;
    const d = settingsQuery.data as any;
    if (d.ef10k) {
      setEf10k({ ip: d.ef10k.ip ?? "", port: d.ef10k.port ?? 5005, enabled: d.ef10k.enabled ?? false, zk40Protocol: d.ef10k.zk40Protocol ?? "tcp", fkProtocol: d.ef10k.fkProtocol ?? 0, commPassword: d.ef10k.commPassword ?? 0 });
    }
    if (d.k40) {
      setK40({ ip: d.k40.ip ?? "", port: d.k40.port ?? 4370, enabled: d.k40.enabled ?? false, zk40Protocol: d.k40.zk40Protocol ?? "adms", fkProtocol: d.k40.fkProtocol ?? 0, commPassword: d.k40.commPassword ?? 0, admsEnabled: d.k40.admsEnabled ?? true });
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
      await updateSettings.mutateAsync({ deviceId: 1, ip: ef10k.ip, port: ef10k.port, enabled: ef10k.enabled, zk40Protocol: ef10k.zk40Protocol, fkProtocol: ef10k.fkProtocol, commPassword: ef10k.commPassword });
      setShowSuccess(true);
      settingsQuery.refetch();
    } catch {}
  };

  const saveK40 = async () => {
    try {
      await updateSettings.mutateAsync({ deviceId: 2, ip: k40.ip, port: k40.port, enabled: k40.enabled, zk40Protocol: k40.zk40Protocol, fkProtocol: k40.fkProtocol, commPassword: k40.commPassword, admsEnabled: k40.admsEnabled });
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* ── EF10K column ── */}
        <div className="space-y-4">
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">إعداد EF10K (جهاز 1)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">بروتوكول الاتصال</label>
                <select value={ef10k.zk40Protocol} onChange={(e) => setEf10k({ ...ef10k, zk40Protocol: e.target.value as "adms" | "tcp" })} className={inputCls}>
                  <option value="adms">ADMS (الجهاز يرسل للخادم)</option>
                  <option value="tcp">TCP مباشر (الخادم يسحب من الجهاز)</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ef10k.zk40Protocol === "tcp"
                    ? "اتصال مباشر بالجهاز عبر منفذ TCP — يتطلب وصول الخادم لشبكة الجهاز."
                    : "الجهاز يرسل البصمات للخادم تلقائياً (Push) — مناسب عند وجود الجهاز خلف راوتر."}
                </p>
              </div>
              {ef10k.zk40Protocol === "tcp" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">بروتوكول SDK</label>
                  <select value={ef10k.fkProtocol} onChange={(e) => setEf10k({ ...ef10k, fkProtocol: parseInt(e.target.value) as 0 | 1 })} className={inputCls}>
                    <option value={0}>Protocol 0 (افتراضي)</option>
                    <option value={1}>Protocol 1</option>
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">إذا ظهر "Connect failed. Try --protocol 1" اختر Protocol 1.</p>
                </div>
              )}
              {ef10k.zk40Protocol === "tcp" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">كلمة مرور الجهاز (Comm Key)</label>
                  <input type="number" value={ef10k.commPassword} onChange={(e) => setEf10k({ ...ef10k, commPassword: parseInt(e.target.value) || 0 })} placeholder="0" className={inputCls} />
                  <p className="mt-1 text-xs text-muted-foreground">Net Pwd من إعدادات الجهاز — اتركه 0 إذا لم يكن مضبوطاً.</p>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium">عنوان IP الجهاز</label>
                <input type="text" value={ef10k.ip} onChange={(e) => setEf10k({ ...ef10k, ip: e.target.value })} placeholder="192.168.0.10" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">المنفذ (TCP)</label>
                <input type="number" value={ef10k.port} onChange={(e) => setEf10k({ ...ef10k, port: parseInt(e.target.value) || 5005 })} min="1" max="65535" className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ef10k-enabled" checked={ef10k.enabled} onChange={(e) => setEf10k({ ...ef10k, enabled: e.target.checked })} className="rounded border-border" />
                <label htmlFor="ef10k-enabled" className="text-sm font-medium cursor-pointer">تفعيل EF10K</label>
              </div>
              <Button onClick={saveEF10K} disabled={updateSettings.isPending} className="w-full">
                {updateSettings.isPending ? "جارٍ الحفظ..." : "حفظ إعدادات EF10K"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── K40 Pro column ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {admsOnline
                    ? <><Wifi className="w-4 h-4 text-success" />K40 Pro — متصل</>
                    : <><WifiOff className="w-4 h-4 text-destructive" />K40 Pro — غير متصل</>}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => admsStatus.refetch()} disabled={admsStatus.isRefetching}>
                  <RefreshCw className={`w-3.5 h-3.5 ${admsStatus.isRefetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">آخر اتصال</p>
                  <p className="font-mono text-xs mt-0.5">{lastAdmsPunch ? lastAdmsPunch.toLocaleString("ar-EG") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">كود الجهاز (SN)</p>
                  <p className="font-mono text-xs mt-0.5">{adms?.lastDeviceId ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">آخر بصمة</p>
                  <p className="font-mono text-xs mt-0.5">{lastAdmsPunch ? lastAdmsPunch.toLocaleString("ar-EG") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي البصمات</p>
                  <p className="font-mono text-xs mt-0.5">{adms?.punchCount ?? 0}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={async () => { try { await syncZK40.mutateAsync(); admsStatus.refetch(); } catch {} }} disabled={syncZK40.isPending || !k40.ip}>
                  {syncZK40.isPending ? "جارٍ..." : "اتصال"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => admsStatus.refetch()} disabled={admsStatus.isRefetching}>
                  فصل
                </Button>
                <Button size="sm" variant="outline" onClick={() => { syncZK40.reset(); admsStatus.refetch(); }}>
                  إعادة الضبط
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">إعداد K40 Pro (جهاز 2)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">بروتوكول الاتصال</label>
                <select value={k40.zk40Protocol} onChange={(e) => setK40({ ...k40, zk40Protocol: e.target.value as "adms" | "tcp" })} className={inputCls}>
                  <option value="adms">ADMS (الجهاز يرسل للخادم)</option>
                  <option value="tcp">TCP مباشر (الخادم يسحب من الجهاز)</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {k40.zk40Protocol === "tcp"
                    ? "اتصال مباشر بالجهاز عبر منفذ TCP — يتطلب وصول الخادم لشبكة الجهاز."
                    : "الجهاز يرسل البصمات للخادم تلقائياً (Push) — مناسب عند وجود الجهاز خلف راوتر."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="k40-adms-enabled" checked={k40.admsEnabled} onChange={(e) => setK40({ ...k40, admsEnabled: e.target.checked })} className="rounded border-border" />
                <label htmlFor="k40-adms-enabled" className="text-sm font-medium cursor-pointer">تفعيل استقبال ADMS (Push)</label>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">عند الإيقاف، يتجاهل الخادم البصمات المُرسَلة عبر ADMS — استخدمه عند الاعتماد على TCP فقط.</p>
              {k40.zk40Protocol === "tcp" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">بروتوكول SDK</label>
                  <select value={k40.fkProtocol} onChange={(e) => setK40({ ...k40, fkProtocol: parseInt(e.target.value) as 0 | 1 })} className={inputCls}>
                    <option value={0}>Protocol 0 (افتراضي)</option>
                    <option value={1}>Protocol 1</option>
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">إذا ظهر "Connect failed. Try --protocol 1" اختر Protocol 1.</p>
                </div>
              )}
              {k40.zk40Protocol === "tcp" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">كلمة مرور الجهاز (Comm Key)</label>
                  <input type="number" value={k40.commPassword} onChange={(e) => setK40({ ...k40, commPassword: parseInt(e.target.value) || 0 })} placeholder="0" className={inputCls} />
                  <p className="mt-1 text-xs text-muted-foreground">Net Pwd من إعدادات الجهاز — اتركه 0 إذا لم يكن مضبوطاً.</p>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium">عنوان IP الجهاز</label>
                <input type="text" value={k40.ip} onChange={(e) => setK40({ ...k40, ip: e.target.value })} placeholder="192.168.0.20" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">المنفذ (عادةً 4370)</label>
                <input type="number" value={k40.port} onChange={(e) => setK40({ ...k40, port: parseInt(e.target.value) || 4370 })} min="1" max="65535" className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="zk40-enabled" checked={k40.enabled} onChange={(e) => setK40({ ...k40, enabled: e.target.checked })} className="rounded border-border" />
                <label htmlFor="zk40-enabled" className="text-sm font-medium cursor-pointer">تفعيل K40 Pro</label>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={saveK40} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? "جارٍ الحفظ..." : "حفظ إعدادات K40 Pro"}
                </Button>
                <Button variant="outline" onClick={async () => { try { await syncZK40.mutateAsync(); setShowSuccess(true); } catch {} }} disabled={syncZK40.isPending || !k40.ip}>
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
