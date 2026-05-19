import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, ArrowRightFromLine, ArrowLeftFromLine, AlertCircle } from 'lucide-react';

const tRPC = require('@/lib/trpc').trpc as any;

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

interface LivePunch {
  empCd: string;
  timestamp: Date;
  direction: 'in' | 'out' | 'unknown';
  deviceId: string;
}

export default function LiveBoard() {
  const [punches, setPunches] = useState<LivePunch[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Load initial punch history
  const { data: punchesData, isLoading } = useQuery({
    queryKey: ['recentPunches'],
    queryFn: async () => {
      const result = await tRPC.attendance.rawPunches.query({
        limit: 50,
        fromDate: new Date(Date.now() - 1000 * 60 * 5).toISOString().split('T')[0],
      });
      return result.punches || [];
    },
    refetchInterval: 30000, // Periodic refresh every 30s
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isMonitoring) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setWsConnected(true);
        // Subscribe to attendance punches
        ws.send(JSON.stringify({ type: 'subscribe-attendance' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'punch-received') {
            const newPunch: LivePunch = {
              empCd: msg.empCd,
              timestamp: new Date(msg.timestamp),
              direction: msg.direction,
              deviceId: msg.deviceId || 'unknown',
            };
            setPunches((prev) => [newPunch, ...prev.slice(0, 99)]); // Keep last 100
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setWsConnected(false);
      };

      wsRef.current = ws;

      return () => {
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe-attendance' }));
          wsRef.current.close();
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }, [isMonitoring]);

  // Load initial punch history on mount
  useEffect(() => {
    if (punchesData) {
      const formatted = punchesData.map((p: any) => ({
        empCd: p.empCd,
        timestamp: new Date(p.punchAt),
        direction: p.direction,
        deviceId: p.deviceId || 'unknown',
      }));
      setPunches((prev) => [...formatted, ...prev].slice(0, 100)); // Merge with WS punches
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs px-3 py-1 rounded bg-gray-100">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
          </div>
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
                      <ArrowRightFromLine className="w-5 h-5 text-green-600" />
                    ) : punch.direction === 'out' ? (
                      <ArrowLeftFromLine className="w-5 h-5 text-blue-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
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
        <p>Real-time updates via WebSocket. Periodic sync every 30 seconds.</p>
        <p>Shows punches from the last 5 minutes. Stores up to 100 recent punches.</p>
      </div>
    </div>
  );
}
