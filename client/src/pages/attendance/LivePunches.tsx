import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, ArrowRightFromLine, ArrowLeftFromLine, AlertCircle } from 'lucide-react';

const tRPC = require('@/lib/trpc').trpc as any;

interface LivePunch {
  empCd: string;
  timestamp: Date;
  direction: 'in' | 'out' | 'unknown';
  deviceId: string;
}

export default function LivePunches() {
  const [punches, setPunches] = useState<LivePunch[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);

  // Poll for recent punches
  const { data: punchesData, isLoading, refetch } = useQuery({
    queryKey: ['recentPunches'],
    queryFn: async () => {
      const result = await tRPC.attendance.rawPunches.query({
        limit: 50,
        fromDate: new Date(Date.now() - 1000 * 60 * 5).toISOString().split('T')[0], // Last 5 minutes
      });
      return result.punches || [];
    },
    refetchInterval: isMonitoring ? 2000 : false,
  });

  useEffect(() => {
    if (punchesData) {
      // Sort by time descending and convert timestamps
      const formatted = punchesData.map((p: any) => ({
        empCd: p.empCd,
        timestamp: new Date(p.punchAt),
        direction: p.direction,
        deviceId: p.deviceId || 'unknown',
      }));
      setPunches(formatted);
    }
  }, [punchesData]);

  // Device status
  const { data: deviceStatus } = useQuery({
    queryKey: ['deviceStatus'],
    queryFn: () => tRPC.attendance.deviceStatus.query(),
    refetchInterval: 5000,
  });

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const clearPunches = () => {
    setPunches([]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Live Punch Feed</h1>
        <div className="flex gap-2">
          <Button variant={isMonitoring ? 'default' : 'outline'} onClick={toggleMonitoring}>
            {isMonitoring ? 'Monitoring Active' : 'Monitoring Paused'}
          </Button>
          <Button variant="outline" onClick={clearPunches} disabled={punches.length === 0}>
            Clear Feed
          </Button>
        </div>
      </div>

      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {deviceStatus?.connected ? (
              <>
                <Wifi className="w-5 h-5 text-success" />
                Device Connected
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-destructive" />
                Device Offline
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-medium">{deviceStatus?.connected ? 'Connected' : 'Disconnected'}</p>
            </div>
            <div>
              <p className="text-gray-600">Punches Received</p>
              <p className="font-medium">{deviceStatus?.punchCount ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Punch</p>
              <p className="font-mono text-xs">
                {deviceStatus?.lastPunch
                  ? new Date(deviceStatus.lastPunch).toLocaleTimeString()
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Uptime</p>
              <p className="font-mono text-xs">{(deviceStatus?.uptime ?? 0) / 60 | 0}m {(deviceStatus?.uptime ?? 0) % 60}s</p>
            </div>
          </div>
          {deviceStatus?.connectionError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deviceStatus.connectionError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Punch Feed */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Punches ({punches.length})
            {isLoading && <span className="text-xs text-gray-500 ml-2">Refreshing...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {punches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No punches recorded in the last 5 minutes</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {punches.map((punch, idx) => (
                <div
                  key={`${punch.empCd}-${punch.timestamp.getTime()}-${idx}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded border"
                >
                  <div className="flex-shrink-0">
                    {punch.direction === 'in' ? (
                      <ArrowRightFromLine className="w-5 h-5 text-success" />
                    ) : punch.direction === 'out' ? (
                      <ArrowLeftFromLine className="w-5 h-5 text-primary" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-warning" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-semibold text-sm">{punch.empCd}</div>
                    <div className="text-xs text-gray-600">
                      {punch.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium capitalize text-gray-600">
                      {punch.direction}
                    </div>
                    <div className="text-xs text-gray-500">{punch.deviceId}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500">
        <p>Feed refreshes every 2 seconds when monitoring is active.</p>
        <p>Shows punches from the last 5 minutes.</p>
      </div>
    </div>
  );
}
