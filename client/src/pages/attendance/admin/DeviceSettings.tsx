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
  const materializeDaily = tRPC.attendance.materializeDaily.useMutation();
  const bootstrapShifts = tRPC.attendance.bootstrapShifts.useMutation();

  // Populate form when settings load from server
  useEffect(() => {
    if (settingsQuery.data) {
      setFormData({
        ip: settingsQuery.data.ip,
        port: settingsQuery.data.port,
        enabled: settingsQuery.data.enabled,
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
          Device console
        </p>
        <h2 className="text-3xl font-bold text-foreground">
          Fingerprint Device Settings
        </h2>
      </div>

      {/* Device Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {status?.connected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-600" />
                  Device Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-600" />
                  Device Offline
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
              <p className="text-muted-foreground">Last Connected</p>
              <p className="font-mono">
                {status?.lastConnected
                  ? new Date(status.lastConnected).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Uptime (seconds)</p>
              <p className="font-mono">{status?.uptime ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Punch</p>
              <p className="font-mono">
                {status?.lastPunch
                  ? new Date(status.lastPunch).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Punches</p>
              <p className="font-mono">{status?.punchCount ?? 0}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="default"
              onClick={handleConnect}
              disabled={connectDevice.isPending}
            >
              {connectDevice.isPending ? "Connecting..." : "Connect"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnectDevice.isPending}
            >
              {disconnectDevice.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
            <Button
              variant="outline"
              onClick={handleResetConnection}
              disabled={resetConnection.isPending}
            >
              {resetConnection.isPending ? "Resetting..." : "Reset Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Device Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Device Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSuccess && (
            <Alert variant="default" className="border-green-600 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Settings updated successfully
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Device IP</label>
            <Input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              placeholder="192.168.0.10"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter device IP address or hostname
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Port</label>
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
              TCP port (typically 5005)
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
              Enable device integration
            </label>
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>

      {/* Sync from Access DB */}
      <Card>
        <CardHeader>
          <CardTitle>Database Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sync attendance data from Tararus Access DB to MySQL database
          </p>
          <Button
            onClick={handleSyncNow}
            disabled={syncNow.isPending}
            className="w-full"
          >
            {syncNow.isPending ? "Syncing..." : "Sync Now"}
          </Button>
          {syncNow.data && (
            <Alert className="border-green-600 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Sync {syncNow.data.status} - Rows: {syncNow.data.rowsInserted}{" "}
                inserted
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
          <CardTitle>Materialize Daily Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Build daily attendance records from raw punch data. Use this if
            daily records are missing or need to be refreshed after sync.
          </p>
          <Button
            onClick={handleMaterializeDaily}
            disabled={materializeDaily.isPending}
            className="w-full"
          >
            {materializeDaily.isPending
              ? "Computing..."
              : "Materialize Daily Records"}
          </Button>
          {materializeDaily.data && (
            <Alert className="border-green-600 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
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
          <CardTitle>Setup Shifts & Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a default shift (8AM-5PM) and assign all employees to it.
            Required for attendance computation.
          </p>
          <Button
            onClick={handleBootstrapShifts}
            disabled={bootstrapShifts.isPending}
            className="w-full"
          >
            {bootstrapShifts.isPending
              ? "Setting up..."
              : "Setup Default Shifts"}
          </Button>
          {bootstrapShifts.data && (
            <Alert className="border-green-600 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
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

      {/* Device Commands Card (Future) */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Commands</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Raw device command interface available in Device Console at
            /attendance/admin/console
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
