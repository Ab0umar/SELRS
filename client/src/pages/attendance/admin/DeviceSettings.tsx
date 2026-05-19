import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const tRPC = require('@/lib/trpc').trpc as any;

export default function DeviceSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ ip: '', port: 5005, enabled: false });
  const [showSuccess, setShowSuccess] = useState(false);

  // Use tRPC hooks directly
  const settingsQuery = tRPC.attendance.deviceSettings.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const statusQuery = tRPC.attendance.deviceStatus.useQuery(undefined, {
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  // Update form when settings load
  useEffect(() => {
    if (settingsQuery.data) {
      setFormData({
        ip: settingsQuery.data.ip,
        port: settingsQuery.data.port,
        enabled: settingsQuery.data.enabled,
      });
    }
  }, [settingsQuery.data]);

  const updateSettings = useMutation({
    mutationFn: (updates: any) => tRPC.attendance.updateDeviceSettings.mutate(updates),
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['attendance.deviceSettings'] });
    },
  });

  const connectDevice = useMutation({
    mutationFn: () => tRPC.attendance.connectDevice.mutate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance.deviceStatus'] });
    },
  });

  const disconnectDevice = useMutation({
    mutationFn: () => tRPC.attendance.disconnectDevice.mutate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance.deviceStatus'] });
    },
  });

  const resetConnection = useMutation({
    mutationFn: () => tRPC.attendance.resetDeviceConnection.mutate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance.deviceStatus'] });
    },
  });

  const status = statusQuery.data;
  const isLoading = settingsQuery.isLoading || statusQuery.isLoading;

  if (isLoading) return <div className="p-6">Loading device settings...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Fingerprint Device Settings</h1>

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
              onClick={() => statusQuery.refetch()}
              disabled={statusQuery.isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${statusQuery.isLoading ? 'animate-spin' : ''}`} />
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
              <p className="text-gray-600">Last Connected</p>
              <p className="font-mono">
                {status?.lastConnected ? new Date(status.lastConnected).toLocaleString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Uptime (seconds)</p>
              <p className="font-mono">{status?.uptime ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Punch</p>
              <p className="font-mono">
                {status?.lastPunch ? new Date(status.lastPunch).toLocaleString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total Punches</p>
              <p className="font-mono">{status?.punchCount ?? 0}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => connectDevice.mutate()}
              disabled={status?.connected || connectDevice.isPending}
              variant="default"
            >
              {connectDevice.isPending ? 'Connecting...' : 'Connect'}
            </Button>
            <Button
              onClick={() => disconnectDevice.mutate()}
              disabled={!status?.connected || disconnectDevice.isPending}
              variant="outline"
            >
              {disconnectDevice.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
            <Button
              onClick={() => resetConnection.mutate()}
              disabled={resetConnection.isPending}
              variant="outline"
            >
              {resetConnection.isPending ? 'Resetting...' : 'Reset Connection'}
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
              <AlertDescription className="text-green-800">Settings updated successfully</AlertDescription>
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
            <p className="text-xs text-gray-500 mt-1">Enter device IP address or hostname</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Port</label>
            <Input
              type="number"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 5005 })}
              min="1"
              max="65535"
            />
            <p className="text-xs text-gray-500 mt-1">TCP port (typically 5005)</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="enabled" className="text-sm font-medium cursor-pointer">
              Enable device integration
            </label>
          </div>

          <Button
            onClick={() => updateSettings.mutate(formData)}
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>

      {/* Device Commands Card (Future) */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Commands</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <p>Raw device command interface available in Device Console at /attendance/admin/console</p>
        </CardContent>
      </Card>
    </div>
  );
}
