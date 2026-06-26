import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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

  const settingsQuery = tRPC.attendance.deviceSettings.useQuery();
  const admsStatus = tRPC.attendance.admsStatus.useQuery(undefined, { refetchInterval: 15000 });
  const updateSettings = tRPC.attendance.updateDeviceSettings.useMutation();
  const syncZK40 = tRPC.attendance.syncFromZK40.useMutation();
  const pushEmployeesZK40 = tRPC.attendance.pushEmployeesToZK40.useMutation();

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

  const adms = admsStatus.data;
  const lastPunchDate = adms?.lastPunch ? new Date(adms.lastPunch) : null;
  const minutesSincePunch = lastPunchDate ? (Date.now() - lastPunchDate.getTime()) / 60000 : Infinity;
  const isOnline = minutesSincePunch < 60;

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

      {/* K40 Pro ADMS Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isOnline ? (
                <><Wifi className="w-5 h-5 text-success" />K40 Pro — متصل</>
              ) : (
                <><WifiOff className="w-5 h-5 text-muted-foreground" />K40 Pro — في انتظار البصمة</>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => admsStatus.refetch()} disabled={admsStatus.isRefetching}>
              <RefreshCw className={`w-4 h-4 ${admsStatus.isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">آخر بصمة (ADMS)</p>
              <p className="font-mono">{lastPunchDate ? lastPunchDate.toLocaleString("ar-EG") : "لا يوجد"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">إجمالي البصمات (ADMS)</p>
              <p className="font-mono">{adms?.punchCount ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">كود الجهاز</p>
              <p className="font-mono">{adms?.lastDeviceId ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">البروتوكول</p>
              <p className="font-mono text-xs">HTTP ADMS Push</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* K40 Pro Config Card */}
      <Card>
        <CardHeader>
          <CardTitle>إعداد K40 Pro (ADMS)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSuccess && (
            <Alert variant="default" className="border-success/30 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">تم حفظ الإعدادات بنجاح</AlertDescription>
            </Alert>
          )}
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
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSaveConfig} disabled={updateSettings.isPending} className="flex-1">
              {updateSettings.isPending ? "جارٍ الحفظ..." : "حفظ إعدادات K40 Pro"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await syncZK40.mutateAsync();
                  setShowSuccess(true);
                } catch (err) {
                  console.error("ZK40 sync failed:", err);
                }
              }}
              disabled={syncZK40.isPending || !formData.zk40Ip}
              className="flex-1"
            >
              {syncZK40.isPending ? "جارٍ المزامنة..." : "مزامنة K40 Pro الآن"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const result = await pushEmployeesZK40.mutateAsync();
                  alert(result.message);
                } catch (err) {
                  console.error("Push employees failed:", err);
                }
              }}
              disabled={pushEmployeesZK40.isPending}
              className="flex-1"
            >
              {pushEmployeesZK40.isPending ? "جارٍ الإرسال..." : "إرسال الموظفين → K40 Pro"}
            </Button>
          </div>
          {syncZK40.data && (
            <Alert variant="default" className="border-success/30 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                K40 Pro: {syncZK40.data.recordsInserted} سجل جديد من {syncZK40.data.recordsSeen}
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
  );
}
