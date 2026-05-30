import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wifi,
  WifiOff,
  ArrowRightFromLine,
  ArrowLeftFromLine,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const tRPC = trpc as any;

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

interface LivePunch {
  empCd: string;
  timestamp: Date;
  direction: "in" | "out" | "unknown";
  deviceId: string;
}

export default function LiveBoard() {
  const [punches, setPunches] = useState<LivePunch[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const connectionTone = wsConnected
    ? "border-success/30 bg-success/10 text-success"
    : "border-destructive/30 bg-destructive/10 text-destructive";
  const connectionDot = wsConnected ? "bg-success" : "bg-destructive";

  const punchesQuery = tRPC.attendance.rawPunches.useQuery(
    { limit: 50 },
    { refetchInterval: 30000 },
  );

  useEffect(() => {
    if (!isMonitoring) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setWsConnected(true);
        ws.send(JSON.stringify({ type: "subscribe-attendance" }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "punch-received") {
            const newPunch: LivePunch = {
              empCd: msg.empCd,
              timestamp: new Date(msg.timestamp),
              direction: msg.direction,
              deviceId: msg.deviceId || "unknown",
            };
            setPunches((prev) => [newPunch, ...prev.slice(0, 99)]); // Keep last 100
          }
        } catch (err) {
          console.error("Failed to parse WS message:", err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setWsConnected(false);
      };

      wsRef.current = ws;

      return () => {
        if (wsRef.current) {
          wsRef.current.send(
            JSON.stringify({ type: "unsubscribe-attendance" }),
          );
          wsRef.current.close();
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
    }
  }, [isMonitoring]);

  // Load initial punch history on mount
  useEffect(() => {
    if (punchesQuery.data?.punches) {
      const formatted = punchesQuery.data.punches.map((p: any) => ({
        empCd: p.empCd,
        timestamp: new Date(p.punchAt),
        direction: p.direction,
        deviceId: p.deviceId || "unknown",
      }));
      setPunches((prev) => [...formatted, ...prev].slice(0, 100));
    }
  }, [punchesQuery.data]);

  const { data: deviceStatus } = tRPC.attendance.deviceStatus.useQuery(
    undefined,
    { refetchInterval: 5000 },
  );
  const statusTone = deviceStatus?.connected
    ? "border-success/30 bg-success/10 text-success"
    : "border-warning/30 bg-warning/10 text-warning";

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const clearPunches = () => {
    setPunches([]);
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
            المتابعة المباشرة
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            سجل البصمات المباشر
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${connectionTone}`}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${connectionDot}`} />
            {wsConnected ? "اتصال مباشر" : "اتصال مباشر متوقف"}
          </div>
          <Button
            variant={isMonitoring ? "default" : "outline"}
            onClick={toggleMonitoring}
          >
            {isMonitoring ? "إيقاف المتابعة" : "تشغيل المتابعة"}
          </Button>
          <Button
            variant="outline"
            onClick={clearPunches}
            disabled={punches.length === 0}
          >
            مسح السجل
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-background">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/25 px-4 py-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg border ${statusTone}`}
            >
              {deviceStatus?.connected ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {deviceStatus?.connected ? "الجهاز متصل" : "الجهاز غير متصل"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {deviceStatus?.connected
                  ? "جهاز الحضور يرسل البصمات الآن."
                  : "الجهاز لا يرسل بيانات في الوقت الحالي."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {deviceStatus?.punchCount ?? 0}
            </span>
            بصمات مستلمة
          </div>
        </div>
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">الحالة</p>
            <p
              className={`mt-1 text-sm font-semibold ${deviceStatus?.connected ? "text-success" : "text-warning"}`}
            >
              {deviceStatus?.connected ? "متصل" : "غير متصل"}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              البصمات المستلمة
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {deviceStatus?.punchCount ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              آخر بصمة
            </p>
            <p className="mt-1 font-mono text-xs text-foreground">
              {deviceStatus?.lastPunch
                ? new Date(deviceStatus.lastPunch).toLocaleTimeString()
                : "لا يوجد"}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              مدة التشغيل
            </p>
            <p className="mt-1 font-mono text-xs text-foreground">
              {((deviceStatus?.uptime ?? 0) / 60) | 0}m{" "}
              {(deviceStatus?.uptime ?? 0) % 60}s
            </p>
          </div>
        </div>
        {deviceStatus?.connectionError && (
          <div className="px-4 pb-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {deviceStatus.connectionError}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/25 px-4 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              آخر البصمات ({punches.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              {punchesQuery.isLoading
                ? "جارٍ تحديث البيانات..."
                : "آخر 50 بصمة من قاعدة البيانات."}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            يحتفظ حتى 100 بصمة حديثة
          </div>
        </div>
        <div className="px-4 py-4">
          {punches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-muted-foreground">
              <p>لا توجد سجلات حضور</p>
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {punches.map((punch, idx) => (
                <div
                  key={`${punch.empCd}-${punch.timestamp.getTime()}-${idx}`}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background px-3 py-3 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex-shrink-0">
                    {punch.direction === "in" ? (
                      <ArrowRightFromLine className="h-5 w-5 text-success" />
                    ) : punch.direction === "out" ? (
                      <ArrowLeftFromLine className="h-5 w-5 text-primary" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-warning" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold text-foreground">
                      {punch.empCd}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {punch.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium capitalize text-muted-foreground">
                      {punch.direction === "in"
                        ? "دخول"
                        : punch.direction === "out"
                          ? "خروج"
                          : "غير معروف"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {punch.deviceId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="text-xs text-muted-foreground">
        <p>يتجدد كل 30 ثانية، ويعرض آخر 50 سجل.</p>
      </div>
    </div>
  );
}
