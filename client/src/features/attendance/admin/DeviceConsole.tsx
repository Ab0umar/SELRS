import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Terminal,
  Send,
  Trash2,
  Zap,
  Cpu,
  Wifi,
  WifiOff,
  Clock,
  Copy,
  Info,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const tRPC = trpc as any;

interface LogEntry {
  id: number;
  timestamp: Date;
  type: "command" | "response" | "error";
  message: string;
}

export default function DeviceConsole() {
  const queryClient = useQueryClient();
  const [commandInput, setCommandInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logId, setLogId] = useState(1);
  const [diagnosticIP, setDiagnosticIP] = useState("192.168.0.10");
  const [diagnosticPort, setDiagnosticPort] = useState("5005");
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  const addLog = (type: "command" | "response" | "error", message: string) => {
    setLogs((prev) => [
      ...prev.slice(-99), // Keep last 100 logs (newer at bottom)
      { id: logId, timestamp: new Date(), type, message },
    ]);
    setLogId((prev) => prev + 1);
  };

  // Scroll to bottom when logs list changes
  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const deviceStatusQuery = tRPC.attendance.deviceStatus.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const sendCommand = tRPC.attendance.sendDeviceCommand.useMutation({
    onSuccess: (result: any) => {
      addLog("command", `Sent: ${commandInput}`);
      addLog(
        "response",
        result.success ? "Command sent successfully" : `Error: ${result.error}`,
      );
      setCommandInput("");
    },
    onError: (error: any) => {
      addLog("error", `Failed to send: ${error.message}`);
    },
  });

  const requestStatus = tRPC.attendance.sendDeviceCommand.useMutation({
    onSuccess: () => {
      addLog("command", "Requested device status");
    },
    onError: (error: any) => {
      addLog("error", `Failed: ${error.message}`);
    },
  });

  const requestEmployeeData = tRPC.attendance.sendDeviceCommand.useMutation({
    onSuccess: () => {
      addLog("command", "Requested employee data");
    },
    onError: (error: any) => {
      addLog("error", `Failed: ${error.message}`);
    },
  });

  const runDiagnostics = tRPC.attendance.runDeviceDiagnostics.useMutation({
    onSuccess: (result: any) => {
      addLog(
        "command",
        `Running diagnostics on ${diagnosticIP}:${diagnosticPort}`,
      );
      if (result.success) {
        addLog("response", "✓ All diagnostic tests passed!");
        result.results.forEach((r: any) => {
          addLog(
            "response",
            `${r.success ? "✓" : "✗"} ${r.test}: ${r.message}`,
          );
        });
      } else {
        addLog("error", "✗ Some diagnostic tests failed");
        result.results.forEach((r: any) => {
          if (!r.success) {
            addLog("error", `${r.test}: ${r.message}`);
          }
        });
      }
    },
    onError: (error: any) => {
      addLog("error", `Diagnostics failed: ${error.message}`);
    },
  });

  const clearLogs = () => {
    setLogs([]);
    toast.success("Console logs cleared");
  };

  const copyLogs = () => {
    if (logs.length === 0) return;
    const text = logs
      .map(
        (log) =>
          `[${log.timestamp.toLocaleTimeString()}] [${log.type.toUpperCase()}] ${log.message}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Logs copied to clipboard");
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    // Validate hex format
    if (!/^[0-9A-Fa-f]*$/.test(commandInput)) {
      addLog("error", "Invalid hex format. Use 0-9, A-F only.");
      return;
    }

    if (commandInput.length % 2 !== 0) {
      addLog("error", "Hex string must have even length (pairs of bytes).");
      return;
    }

    sendCommand.mutate({ hex: commandInput.toUpperCase() });
  };

  const isConnected = !!deviceStatusQuery.data?.connected;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium select-none">
        <span>Attendance Admin</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-zinc-800">Device Test Console</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-zinc-600" />
            Device Test Console
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Debug and monitor TCP connection status and punch reception in real-time.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Controls (5/12 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Connection Status Card */}
          <Card className="border-zinc-200 shadow-none bg-white rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-zinc-700 tracking-wider uppercase flex items-center justify-between">
                <span>Connection Status</span>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Wifi className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <WifiOff className="w-3.5 h-3.5" />
                    Offline
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                  <span className="text-xs font-medium text-zinc-500 block">Total Punches</span>
                  <span className="text-xl font-bold font-mono text-zinc-800 mt-1 block">
                    {deviceStatusQuery.data?.punchCount ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                  <span className="text-xs font-medium text-zinc-500 block">Last Punch Received</span>
                  <span className="text-sm font-semibold font-mono text-zinc-700 mt-2 block truncate">
                    {deviceStatusQuery.data?.lastPunch ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 inline" />
                        {new Date(deviceStatusQuery.data.lastPunch).toLocaleTimeString()}
                      </span>
                    ) : (
                      "Never"
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Commands & Hex Command Card */}
          <Card className="border-zinc-200 shadow-none bg-white rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-zinc-700 tracking-wider uppercase">
                Command Center
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Quick Actions */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-zinc-500">Quick Commands</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => requestStatus.mutate({ hex: "AABB0000" })}
                    disabled={requestStatus.isPending}
                    variant="outline"
                    className="text-xs py-1.5 h-auto font-medium hover:bg-zinc-50 border-zinc-200 active:opacity-90 transition-opacity"
                  >
                    {requestStatus.isPending ? "Sending..." : "Query Status"}
                  </Button>
                  <Button
                    onClick={() => requestEmployeeData.mutate({ hex: "AABB0100" })}
                    disabled={requestEmployeeData.isPending}
                    variant="outline"
                    className="text-xs py-1.5 h-auto font-medium hover:bg-zinc-50 border-zinc-200 active:opacity-90 transition-opacity"
                  >
                    {requestEmployeeData.isPending ? "Sending..." : "Get Employees"}
                  </Button>
                </div>
                <div className="p-2 bg-zinc-50 rounded-md border border-zinc-100 space-y-1 text-[11px] text-zinc-500 font-mono">
                  <p>• Query Status: <span className="font-semibold text-zinc-700">AABB0000</span></p>
                  <p>• Get Employees: <span className="font-semibold text-zinc-700">AABB0100</span></p>
                </div>
              </div>

              <hr className="border-zinc-100" />

              {/* Raw Hex form */}
              <form onSubmit={handleSendCommand} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 block">
                    Send Raw Hex Command
                  </label>
                  <Input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value.toUpperCase())}
                    placeholder="e.g., AABB1234"
                    className="font-mono text-sm border-zinc-200 focus:border-zinc-400 focus:ring-0 placeholder:text-zinc-400"
                    disabled={sendCommand.isPending}
                  />
                  <p className="text-[10px] text-zinc-400">
                    Must be an even length hexadecimal string (pairs of bytes).
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={sendCommand.isPending || !commandInput.trim()}
                  className="w-full text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white rounded-md transition-opacity active:opacity-90 py-2 h-auto"
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  {sendCommand.isPending ? "Sending..." : "Send Command"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Diagnostics Card */}
          <Card className="border-zinc-200 shadow-none bg-white rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-zinc-700 tracking-wider uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-zinc-500" />
                Network Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-1 uppercase">
                    Device IP Address
                  </label>
                  <Input
                    type="text"
                    value={diagnosticIP}
                    onChange={(e) => setDiagnosticIP(e.target.value)}
                    placeholder="192.168.0.10"
                    className="text-xs h-9 border-zinc-200 placeholder:text-zinc-400"
                  />
                </div>
                <div className="col-span-5">
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-1 uppercase">
                    Port
                  </label>
                  <Input
                    type="number"
                    value={diagnosticPort}
                    onChange={(e) => setDiagnosticPort(e.target.value)}
                    placeholder="5005"
                    className="text-xs h-9 border-zinc-200"
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  runDiagnostics.mutate({
                    ip: diagnosticIP,
                    port: parseInt(diagnosticPort) || 5005,
                  })
                }
                disabled={runDiagnostics.isPending}
                className="w-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-md transition-opacity active:opacity-90 py-2 h-auto"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500 fill-amber-500" />
                {runDiagnostics.isPending ? "Testing Connection..." : "Run Connectivity Tests"}
              </Button>
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-zinc-500 leading-relaxed">
                  Performs a localized check to verify TCP handshake, socket listener response, and network routing configurations.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Terminal Output (7/12 cols) */}
        <div className="lg:col-span-7 h-full">
          <Card className="border-zinc-200 shadow-none bg-white rounded-lg flex flex-col h-[595px]">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-zinc-700 tracking-wider uppercase flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-500" />
                  Terminal logs
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 font-mono text-zinc-500 lowercase">
                    {logs.length} lines
                  </span>
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={copyLogs}
                    variant="outline"
                    size="sm"
                    disabled={logs.length === 0}
                    className="text-xs h-8 border-zinc-200 font-medium px-2.5 hover:bg-zinc-50"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy Logs
                  </Button>
                  <Button
                    onClick={clearLogs}
                    variant="outline"
                    size="sm"
                    disabled={logs.length === 0}
                    className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-zinc-200 font-medium px-2.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col bg-zinc-950 overflow-hidden rounded-b-lg">
              {logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 space-y-2 select-none">
                  <Terminal className="w-8 h-8 text-zinc-600 stroke-[1.5]" />
                  <p className="text-xs font-mono">No commands sent. Logs are empty.</p>
                  <p className="text-[10px] text-zinc-600">Send quick or hex commands to begin monitoring.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 leading-relaxed">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2.5 break-all hover:bg-zinc-900/50 py-0.5 px-1 rounded transition-colors">
                      <span className="text-zinc-500 select-none shrink-0">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="shrink-0 select-none font-bold text-[10px]">
                        {log.type === "command" && (
                          <span className="text-blue-400 bg-blue-950/40 px-1 py-0.5 rounded border border-blue-900/50">
                            CMD
                          </span>
                        )}
                        {log.type === "response" && (
                          <span className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-900/50">
                            RES
                          </span>
                        )}
                        {log.type === "error" && (
                          <span className="text-rose-400 bg-rose-950/40 px-1 py-0.5 rounded border border-rose-900/50">
                            ERR
                          </span>
                        )}
                      </span>
                      <span className={
                        log.type === "command"
                          ? "text-zinc-100"
                          : log.type === "response"
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={consoleBottomRef} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

