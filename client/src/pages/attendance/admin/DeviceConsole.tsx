import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Terminal, Send, X, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const tRPC = trpc as any;

interface LogEntry {
  id: number;
  timestamp: Date;
  type: 'command' | 'response' | 'error';
  message: string;
}

export default function DeviceConsole() {
  const queryClient = useQueryClient();
  const [commandInput, setCommandInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logId, setLogId] = useState(1);
  const [diagnosticIP, setDiagnosticIP] = useState('192.168.1.100');
  const [diagnosticPort, setDiagnosticPort] = useState('5005');

  const addLog = (type: 'command' | 'response' | 'error', message: string) => {
    setLogs((prev) => [
      { id: logId, timestamp: new Date(), type, message },
      ...prev.slice(0, 99), // Keep last 100 logs
    ]);
    setLogId((prev) => prev + 1);
  };

  const deviceStatusQuery = tRPC.attendance.deviceStatus.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const sendCommand = useMutation({
    mutationFn: (hex: string) => tRPC.attendance.sendDeviceCommand.mutate({ hex }),
    onSuccess: (result: any) => {
      addLog('command', `Sent: ${commandInput}`);
      addLog('response', result.success ? 'Command sent successfully' : `Error: ${result.error}`);
      setCommandInput('');
    },
    onError: (error: any) => {
      addLog('error', `Failed to send: ${error.message}`);
    },
  });

  const requestStatus = useMutation({
    mutationFn: () => tRPC.attendance.sendDeviceCommand.mutate({ hex: 'AABB0000' }),
    onSuccess: () => {
      addLog('command', 'Requested device status');
    },
    onError: (error: any) => {
      addLog('error', `Failed: ${error.message}`);
    },
  });

  const requestEmployeeData = useMutation({
    mutationFn: () => tRPC.attendance.sendDeviceCommand.mutate({ hex: 'AABB0100' }),
    onSuccess: () => {
      addLog('command', 'Requested employee data');
    },
    onError: (error: any) => {
      addLog('error', `Failed: ${error.message}`);
    },
  });

  const runDiagnostics = useMutation({
    mutationFn: () =>
      tRPC.attendance.runDeviceDiagnostics.mutate({
        ip: diagnosticIP,
        port: parseInt(diagnosticPort) || 5005,
      }),
    onSuccess: (result: any) => {
      addLog('command', `Running diagnostics on ${diagnosticIP}:${diagnosticPort}`);
      if (result.success) {
        addLog('response', '✓ All diagnostic tests passed!');
        result.results.forEach((r: any) => {
          addLog('response', `${r.success ? '✓' : '✗'} ${r.test}: ${r.message}`);
        });
      } else {
        addLog('error', '✗ Some diagnostic tests failed');
        result.results.forEach((r: any) => {
          if (!r.success) {
            addLog('error', `${r.test}: ${r.message}`);
          }
        });
      }
    },
    onError: (error: any) => {
      addLog('error', `Diagnostics failed: ${error.message}`);
    },
  });

  const clearLogs = () => {
    setLogs([]);
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    // Validate hex format
    if (!/^[0-9A-Fa-f]*$/.test(commandInput)) {
      addLog('error', 'Invalid hex format. Use 0-9, A-F only.');
      return;
    }

    if (commandInput.length % 2 !== 0) {
      addLog('error', 'Hex string must have even length (pairs of bytes).');
      return;
    }

    sendCommand.mutate(commandInput.toUpperCase());
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Device Test Console</h1>

      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-semibold">
                {deviceStatusQuery.data?.connected ? (
                  <span className="text-success">Connected</span>
                ) : (
                  <span className="text-destructive">Offline</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total Punches</p>
              <p className="font-mono">{deviceStatusQuery.data?.punchCount ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Punch</p>
              <p className="font-mono text-xs">
                {deviceStatusQuery.data?.lastPunch
                  ? new Date(deviceStatusQuery.data.lastPunch).toLocaleTimeString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Commands</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => requestStatus.mutate()}
              disabled={requestStatus.isPending}
              variant="outline"
              className="text-xs"
            >
              {requestStatus.isPending ? 'Sending...' : 'Query Status'}
            </Button>
            <Button
              onClick={() => requestEmployeeData.mutate()}
              disabled={requestEmployeeData.isPending}
              variant="outline"
              className="text-xs"
            >
              {requestEmployeeData.isPending ? 'Sending...' : 'Get Employees'}
            </Button>
          </div>
          <div className="text-xs text-gray-600">
            <p>Query Status: AABB0000 (Query device status)</p>
            <p>Get Employees: AABB0100 (Fetch employee list from device)</p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Hex Command */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send Raw Hex Command</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendCommand} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Hex String (uppercase, no spaces)</label>
              <Input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value.toUpperCase())}
                placeholder="e.g., AABB1234"
                className="font-mono"
                disabled={sendCommand.isPending}
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: AABB1234 (8 characters = 4 bytes)
              </p>
            </div>
            <Button type="submit" disabled={sendCommand.isPending || !commandInput.trim()} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {sendCommand.isPending ? 'Sending...' : 'Send Command'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5" />
            Device Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Device IP</label>
              <Input
                type="text"
                value={diagnosticIP}
                onChange={(e) => setDiagnosticIP(e.target.value)}
                placeholder="192.168.1.100"
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Port</label>
              <Input
                type="number"
                value={diagnosticPort}
                onChange={(e) => setDiagnosticPort(e.target.value)}
                placeholder="5005"
                className="text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => runDiagnostics.mutate()}
                disabled={runDiagnostics.isPending}
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-1" />
                {runDiagnostics.isPending ? 'Testing...' : 'Run Tests'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Tests TCP connectivity, device response, and adapter status. Helps diagnose connection issues.
          </p>
        </CardContent>
      </Card>

      {/* Console Output */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Terminal className="w-5 h-5" />
              Console Output ({logs.length})
            </CardTitle>
            <Button
              onClick={clearLogs}
              variant="outline"
              size="sm"
              disabled={logs.length === 0}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No commands sent yet. Try sending a test command.
            </div>
          ) : (
            <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id}>
                  <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
                  <span className="ml-2">
                    {log.type === 'command' && <span className="text-primary">[CMD]</span>}
                    {log.type === 'response' && <span className="text-success">[RES]</span>}
                    {log.type === 'error' && <span className="text-destructive">[ERR]</span>}
                  </span>
                  <span className="ml-2">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 space-y-1">
        <p>🔧 Device test console for development and debugging</p>
        <p>Send raw hex commands to the fingerprint device via TCP</p>
        <p>Monitor connection status and punch reception in real-time</p>
      </div>
    </div>
  );
}
