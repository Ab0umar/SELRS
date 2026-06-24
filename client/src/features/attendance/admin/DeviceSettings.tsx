import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const tRPC = trpc as any;

export default function DeviceSettings() {
  const [formData, setFormData] = useState({
    ip: "",
    port: 5005,
    enabled: false,
    zk40Ip: "",
    zk40Port: 4370,
    zk40Enabled: false,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Load current settings from server
  const settingsQuery = tRPC.attendance.deviceSettings.useQuery();
  const statusQuery = tRPC.attendance.deviceStatus.useQuery({
    refetchInterval: 10000,
  });

  // Device control mutations
  const connectDevice = tRPC.attendance.connectDevice.useMutation();
  const disconnectDevice = tRPC.attendance.disconnectDevice.useMutation();
  const resetConnection = tRPC.attendance.resetDeviceConnection.useMutation();
  const updateSettings = tRPC.attendance.updateDeviceSettings.useMutation();
  const syncNow = tRPC.attendance.syncNow.useMutation();
  const syncZK40 = tRPC.attendance.syncFromZK40.useMutation();
  const zk40Logs = tRPC.attendance.zk40SyncLogs.useQuery();
  const materializeDaily = tRPC.attendance.materializeDaily.useMutation();
  const bootstrapShifts = tRPC.attendance.bootstrapShifts.useMutation();

  // Populate form when settings load from server
  useEffect(() => {
    if (settingsQuery.data) {
      setFormData({
        ip: settingsQuery.data.ip,
        port: settingsQuery.data.port,
        enabled: settingsQuery.data.enabled,
        zk40Ip: (settingsQuery.data as any).zk40Ip ?? "",
        zk40Port: (settingsQuery.data as any).zk40Port ?? 4370,
        zk40Enabled: (settingsQuery.data as any).zk40Enabled ?? false,
      });
    }
  }, [settingsQuery.data]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleSaveConfig = async () => {
    try {
      await updateSettings.mutateAsync({
        ip: formData.ip,
        port: formData.port,
        enabled: formData.enabled,
        zk40Ip: formData.zk40Ip || null,
        zk40Port: formData.zk40Port,
        zk40Enabled: formData.zk40Enabled,
      });
      setShowSuccess(true);
      await settingsQuery.refetch();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const handleConnect = async () => {
    try {
      await connectDevice.mutateAsync();
      await statusQuery.refetch();
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectDevice.mutateAsync();
      await statusQuery.refetch();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const handleResetConnection = async () => {
    try {
      await resetConnection.mutateAsync();
      await statusQuery.refetch();
    } catch (error) {
      console.error("Failed to reset connection:", error);
    }
  };

  const handleSyncNow = async () => {
    try {
      const result = await syncNow.mutateAsync();
      console.log("Sync result:", result);
      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to sync:", error);
    }
  };

  const handleMaterializeDaily = async () => {
    try {
      const result = await materializeDaily.mutateAsync({});
      console.log("Materialize result:", result);
      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to materialize:", error);
    }
  };

  const handleBootstrapShifts = async () => {
    try {
      const result = await bootstrapShifts.mutateAsync({});
      console.log("Bootstrap result:", result);
      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to bootstrap shifts:", error);
    }
  };

  const status = statusQuery.data || {
    connected: false,
    lastConnected: null,
    uptime: 0,
    lastPunch: null,
    punchCount: 0,
    connectionError: null,
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Device console / وحدة الجهاز
        </p>
        <h2 className="text-3xl font-bold text-foreground">
          إعدادات جهاز البصمة
        </h2>
      </div>

      {/* Device Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {status?.connected ? (
                <>
                  <Wifi className="w-5 h-5 text-success" />
                  الجهاز متصل
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-destructive" />
                  الجهاز غير متصل
                </>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusQuery.refetch()}
              disabled={statusQuery.isRefetching}
            >
              <RefreshCw
                className={`w-4 h-4 ${statusQuery.isRefetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {status?.connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{status.connectionError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">آخر اتصال</p>
              <p className="font-mono">
                {status?.lastConnected
                  ? new Date(status.lastConnected).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">زمن التشغيل (ثانية)</p>
              <p className="font-mono">{status?.uptime ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">آخر بصمة</p>
              <p className="font-mono">
                {status?.lastPunch
                  ? new Date(status.lastPunch).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">إجمالي البصمات</p>
              <p className="font-mono">{status?.punchCount ?? 0}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="default"
              onClick={handleConnect}
              disabled={connectDevice.isPending}
            >
              {connectDevice.isPending ? "جارٍ الاتصال..." : "اتصال"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnectDevice.isPending}
            >
              {disconnectDevice.isPending ? "جارٍ الفصل..." : "فصل"}
            </Button>
            <Button
              variant="outline"
              onClick={handleResetConnection}
              disabled={resetConnection.isPending}
            >
              {resetConnection.isPending
                ? "جارٍ إعادة الضبط..."
                : "إعادة الضبط"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Device Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>إعداد الجهاز</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSuccess && (
            <Alert
              variant="default"
              className="border-success/30 bg-success/10"
            >
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                تم حفظ الإعدادات بنجاح
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              عنوان الجهاز
            </label>
            <Input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              placeholder="192.168.0.10"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              أدخل عنوان IP أو اسم المضيف
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">المنفذ</label>
            <Input
              type="number"
              value={formData.port}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  port: parseInt(e.target.value) || 5005,
                })
              }
              min="1"
              max="65535"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              منفذ TCP, غالبا 5005
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
              className="rounded border-border text-primary focus:ring-primary/20"
            />
            <label
              htmlFor="enabled"
              className="text-sm font-medium cursor-pointer"
            >
              تفعيل التكامل مع الجهاز
            </label>
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </CardContent>
      </Card>

      {/* ZK40 Pro Device Card */}
      <Card>
        <CardHeader>
          <CardTitle>جهاز ZK40 Pro (بصمة بعيدة)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">عنوان IP العام</label>
            <input
              type="text"
              value={formData.zk40Ip}
              onChange={(e) => setFormData({ ...formData, zk40Ip: e.target.value })}
              placeholder="مثال: 41.x.x.x أو hostname"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">المنفذ (عادةً 4370)</label>
            <input
              type="number"
              value={formData.zk40Port}
              onChange={(e) => setFormData({ ...formData, zk40Port: parseInt(e.target.value) || 4370 })}
              min="1"
              max="65535"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="zk40Enabled"
              checked={formData.zk40Enabled}
              onChange={(e) => setFormData({ ...formData, zk40Enabled: e.target.checked })}
              className="rounded border-border"
            />
            <label htmlFor="zk40Enabled" className="text-sm font-medium cursor-pointer">
              تفعيل جهاز ZK40
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveConfig} disabled={updateSettings.isPending} className="flex-1">
              {updateSettings.isPending ? "جارٍ الحفظ..." : "حفظ إعدادات ZK40"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const result = await syncZK40.mutateAsync();
                  setShowSuccess(true);
                  console.log("ZK40 sync result:", result);
                } catch (err) {
                  console.error("ZK40 sync failed:", err);
                }
              }}
              disabled={syncZK40.isPending || !formData.zk40Ip}
              className="flex-1"
            >
              {syncZK40.isPending ? "جارٍ المزامنة..." : "مزامنة ZK40 الآن"}
            </Button>
          </div>
          {syncZK40.data && (
            <Alert variant="default" className="border-success/30 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                ZK40: {syncZK40.data.recordsInserted} سجل جديد من {syncZK40.data.recordsSeen}
              </AlertDescription>
            </Alert>
          )}
          {syncZK40.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{String(syncZK40.error)}</AlertDescription>
            </Alert>
          )}

          {/* Sync Log */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">سجل المزامنة</p>
              <Button variant="ghost" size="sm" onClick={() => zk40Logs.refetch()} disabled={zk40Logs.isFetching}>
                <RefreshCw className={`w-3 h-3 ${zk40Logs.isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {zk40Logs.data && zk40Logs.data.length === 0 && (
              <p className="text-xs text-muted-foreground">لا توجد عمليات مزامنة بعد.</p>
            )}
            {zk40Logs.data && zk40Logs.data.length > 0 && (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-1.5 text-right font-medium">الوقت</th>
                      <th className="px-2 py-1.5 text-center font-medium">الحالة</th>
                      <th className="px-2 py-1.5 text-center font-medium">مرئي</th>
                      <th className="px-2 py-1.5 text-center font-medium">مُضاف</th>
                      <th className="px-2 py-1.5 text-center font-medium">مكرر</th>
                      <th className="px-2 py-1.5 text-right font-medium">خطأ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zk40Logs.data.map((row: any) => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                          {new Date(row.startedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                            ${row.status === "ok" ? "bg-success/15 text-success" :
                              row.status === "failed" ? "bg-destructive/15 text-destructive" :
                              "bg-muted text-muted-foreground"}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono">{row.rowsSeen}</td>
                        <td className="px-2 py-1.5 text-center font-mono text-success">{row.rowsInserted}</td>
                        <td className="px-2 py-1.5 text-center font-mono text-muted-foreground">{row.rowsSkipped}</td>
                        <td className="px-2 py-1.5 text-destructive truncate max-w-[160px]">{row.error ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync from Access DB */}
      <Card>
        <CardHeader>
          <CardTitle>مزامنة قاعدة البيانات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            مزامنة بيانات الحضور من Access إلى MySQL
          </p>
          <Button
            onClick={handleSyncNow}
            disabled={syncNow.isPending}
            className="w-full"
          >
            {syncNow.isPending ? "جارٍ المزامنة..." : "مزامنة الآن"}
          </Button>
          {syncNow.data && (
            <Alert className="border-success/30 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                تم {syncNow.data.status}، عدد الصفوف المضافة:{" "}
                {syncNow.data.rowsInserted}
              </AlertDescription>
            </Alert>
          )}
          {syncNow.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{String(syncNow.error)}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Materialize Daily Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>توليد الحضور اليومي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            إنشاء سجلات الحضور اليومي من البصمات الخام عند الحاجة.
          </p>
          <Button
            onClick={handleMaterializeDaily}
            disabled={materializeDaily.isPending}
            className="w-full"
          >
            {materializeDaily.isPending ? "جارٍ الحساب..." : "توليد السجلات"}
          </Button>
          {materializeDaily.data && (
            <Alert className="border-success/30 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                {materializeDaily.data.message}
              </AlertDescription>
            </Alert>
          )}
          {materializeDaily.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {String(materializeDaily.error)}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Bootstrap Shifts & Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>تهيئة الورديات والتعيينات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            إنشاء وردية افتراضية وتعيين كل الموظفين عليها.
          </p>
          <Button
            onClick={handleBootstrapShifts}
            disabled={bootstrapShifts.isPending}
            className="w-full"
          >
            {bootstrapShifts.isPending
              ? "جارٍ الإعداد..."
              : "تهيئة الورديات الافتراضية"}
          </Button>
          {bootstrapShifts.data && (
            <Alert className="border-success/30 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                {bootstrapShifts.data.message}
              </AlertDescription>
            </Alert>
          )}
          {bootstrapShifts.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {String(bootstrapShifts.error)}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
