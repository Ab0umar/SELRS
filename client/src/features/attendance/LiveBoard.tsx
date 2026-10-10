import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wifi,
  WifiOff,
  ArrowRightFromLine,
  ArrowLeftFromLine,
  CircleHelp,
  AlertCircle,
  Cpu,
  Trash2,
  Play,
  Square,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import {
  liveBoardReconnectDelay,
  mergeLivePunches,
  shouldReconnectLiveBoard,
  type LivePunch,
} from "./livePunches";

const tRPC = trpc as any;

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

export default function LiveBoard() {
  const isMobile = useIsMobile();
  const [punchTab, setPunchTab] = useState<"ef10k" | "k40pro">("ef10k");
  const [punches, setPunches] = useState<LivePunch[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const admsStatus = tRPC.attendance.admsStatus.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const fkStatus = tRPC.attendance.fkStatus.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsState, setWsState] = useState<
    | "connecting"
    | "connected"
    | "reconnecting"
    | "rejected"
    | "error"
    | "paused"
  >("connecting");
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const punchesQuery = tRPC.attendance.rawPunches.useQuery(
    { limit: 50 },
    { refetchInterval: 30000 },
  );

  useEffect(() => {
    if (!isMonitoring) return;

    let disposed = false;
    let reconnectTimer: number | undefined;
    let reconnectAttempt = 0;

    const connect = () => {
      if (disposed) return;
      setWsState(reconnectAttempt > 0 ? "reconnecting" : "connecting");
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch (err) {
        console.error("Failed to create WebSocket:", err);
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempt = 0;
        setWsConnected(true);
        setWsState("connected");
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
            setPunches((prev) => mergeLivePunches(prev, [newPunch]));
            setAnnouncement(`وصلت بصمة جديدة للموظف ${newPunch.empCd}`);
          }
        } catch (err) {
          console.error("Failed to parse WS message:", err);
        }
      };

      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        setWsConnected(false);
        setWsState(event.code === 1008 ? "rejected" : "reconnecting");
        // 1008 is an intentional authorization rejection; retrying cannot fix it.
        if (shouldReconnectLiveBoard(event.code)) scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setWsConnected(false);
        setWsState("error");
        ws.close();
      };
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== undefined) return;
      const delay = liveBoardReconnectDelay(reconnectAttempt);
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, delay);
    };

    connect();
    return () => {
      disposed = true;
      if (!isMonitoring) setWsState("paused");
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      const currentWs = wsRef.current;
      if (currentWs?.readyState === WebSocket.OPEN) {
        currentWs.send(JSON.stringify({ type: "unsubscribe-attendance" }));
      }
      if (
        currentWs?.readyState === WebSocket.OPEN ||
        currentWs?.readyState === WebSocket.CONNECTING
      ) {
        currentWs.close();
      }
      if (wsRef.current === currentWs) wsRef.current = null;
    };
  }, [isMonitoring]);

  useEffect(() => {
    if (!isMonitoring) setWsState("paused");
  }, [isMonitoring]);

  useEffect(() => {
    if (punchesQuery.data?.punches) {
      const formatted = punchesQuery.data.punches.map((p: any) => ({
        empCd: p.empCd,
        timestamp: new Date(p.punchAt),
        direction: p.direction,
        deviceId: p.deviceId || "unknown",
      }));
      setPunches((prev) => mergeLivePunches(prev, formatted));
    }
  }, [punchesQuery.data]);

  const deviceStatus = tRPC.attendance.deviceStatus.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  // Remember when the screen was cleared so the next poll doesn't refill it.
  const [clearedAt, setClearedAt] = useState<number>(0);
  const clearPunches = () => {
    setClearedAt(Date.now());
    setPunches([]);
    setAnnouncement("تم مسح شاشة البصمات");
  };
  // EF10K tab: FK device punches (and manual/unknown ones), after any clear.
  const fkPunches = punches.filter(
    (punch) =>
      punch.timestamp.getTime() > clearedAt &&
      String(punch.deviceId).toLowerCase().startsWith("fk"),
  );
  // ZK/ADMS is push-based: treat it as live if a punch arrived in the last hour.
  const admsLastPunch = admsStatus.data?.lastPunch
    ? new Date(admsStatus.data.lastPunch).getTime()
    : 0;
  const zkLive = Date.now() - admsLastPunch < 60 * 60 * 1000;

  return (
    <div className="attendance-live min-w-0 space-y-6" dir="rtl">
      <h1 className="border-b border-border pb-4 text-2xl font-semibold text-foreground">
        الحضور الآن
      </h1>
      <div className="attendance-live-grid">
        {/* Left Column: Live status indicators */}
        <div className="md:col-span-5 space-y-6">
          {/* FK live channel */}
          <section className="attendance-panel p-5" aria-label="قناة FK">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-success-text font-bold block">
                  قناة البث المباشر: FK
                </span>

                {wsConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success-text border border-border/60">
                    متصل الآن
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive-text border border-destructive/30">
                    {wsState === "connecting"
                      ? "جارٍ الاتصال"
                      : wsState === "reconnecting"
                        ? "جارٍ إعادة الاتصال"
                        : wsState === "rejected"
                          ? "الاتصال مرفوض"
                          : wsState === "paused"
                            ? "الاستلام متوقف"
                            : "تعذر الاتصال"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 flex items-center justify-center relative shrink-0">
                  <Wifi className="w-5 h-5 text-success-text" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    حالة بوابة FK (EF10-K)
                  </span>
                  <span className="text-xs text-success-text block mt-0.5">
                    تلقي الحركات الفوري من بوابة FK
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="min-w-0 border-s border-border ps-3">
                  <span className="text-xs text-muted-foreground block font-bold">
                    إجمالي الحركات
                  </span>
                  <span className="font-mono font-bold text-foreground text-xs block mt-0.5">
                    {fkStatus.isLoading
                      ? "جارٍ التحميل"
                      : fkStatus.isError
                        ? "غير متاح"
                        : `${fkStatus.data?.punchCount ?? 0} بصمة`}
                  </span>
                </div>
                <div className="min-w-0 border-s border-border ps-3">
                  <span className="text-xs text-muted-foreground block font-bold">
                    آخر وقت بث
                  </span>
                  <span className="font-mono font-bold text-foreground text-xs block mt-0.5">
                    {fkStatus.data?.lastPunch
                      ? new Date(fkStatus.data.lastPunch).toLocaleTimeString(
                          "ar-EG",
                        )
                      : "لا توجد حركة"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  onClick={toggleMonitoring}
                  className="h-auto gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  {isMonitoring ? (
                    <Square className="w-3 h-3 text-primary-foreground" />
                  ) : (
                    <Play className="w-3 h-3 text-primary-foreground" />
                  )}
                  {isMonitoring ? "إيقاف الاستلام" : "تشغيل الاستلام"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearPunches}
                  disabled={punches.length === 0}
                  className="border-border/60 hover:bg-muted text-foreground text-xs font-bold py-1.5 px-4 h-auto rounded-lg gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-success-text" />
                  مسح الشاشة
                </Button>
              </div>
            </div>
          </section>

          {/* ZK/ADMS live channel */}
          <section className="attendance-panel p-5" aria-label="قناة ZK">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-info font-bold block">
                  قناة البث المباشر: ZK / ADMS
                </span>

                {zkLive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-info/10 text-info border border-border/60">
                    نشط الآن
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive-text border border-destructive/30">
                    {admsStatus.isLoading
                      ? "جارٍ التحقق"
                      : admsStatus.isError
                        ? "تعذر التحقق"
                        : "لا توجد حركة حديثة"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="w-12 h-12 rounded-full bg-info/10 border border-info/30 flex items-center justify-center relative shrink-0">
                  <Wifi className="w-5 h-5 text-info" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    حالة خوادم ADMS (K40 Pro)
                  </span>
                  <span className="text-xs text-info block mt-0.5">
                    تلقي الحركات الفوري من بوابة ZK
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="min-w-0 border-s border-border ps-3">
                  <span className="text-xs text-muted-foreground block font-bold">
                    إجمالي الحركات
                  </span>
                  <span className="font-mono font-bold text-foreground text-xs block mt-0.5">
                    {admsStatus.isLoading
                      ? "جارٍ التحميل"
                      : admsStatus.isError
                        ? "غير متاح"
                        : `${admsStatus.data?.punchCount ?? 0} بصمة`}
                  </span>
                </div>
                <div className="min-w-0 border-s border-border ps-3">
                  <span className="text-xs text-muted-foreground block font-bold">
                    آخر وقت بث
                  </span>
                  <span className="font-mono font-bold text-foreground text-xs block mt-0.5">
                    {admsStatus.data?.lastPunch
                      ? new Date(admsStatus.data.lastPunch).toLocaleTimeString(
                          "ar-EG",
                        )
                      : "لا توجد حركة"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Rolling Punches Stream console */}
        <div className="attendance-panel min-w-0 space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-foreground">
              شاشة البصمات المستلمة
            </h3>
            <div
              role="tablist"
              aria-label="مصادر البصمات"
              className="flex gap-1 bg-muted p-0.5 border border-border/60 rounded-lg"
            >
              {(["ef10k", "k40pro"] as const).map((t) => (
                <Button variant="bare"
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={punchTab === t}
                  aria-controls={`live-punch-panel-${t}`}
                  tabIndex={punchTab === t ? 0 : -1}
                  onClick={() => setPunchTab(t)}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                    punchTab === t
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "ef10k" ? "بوابة EF10K" : "بوابة K40 Pro"}
                </Button>
              ))}
            </div>
          </div>

          <div
            id={`live-punch-panel-${punchTab}`}
            role="tabpanel"
            aria-label={
              punchTab === "ef10k" ? "بصمات بوابة EF10K" : "بصمات بوابة K40 Pro"
            }
            className="min-w-0 pt-2"
          >
            {punchTab === "ef10k" &&
              (fkPunches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 py-10 text-center text-muted-foreground text-xs">
                  <p>
                    {punchesQuery.isLoading
                      ? "جاري تحميل الحركات"
                      : punchesQuery.isError
                        ? "تعذر تحميل الحركات. حاول التحديث بعد قليل."
                        : "لا توجد حركات حضور مستلمة بعد"}
                  </p>
                </div>
              ) : (
                <div className="max-h-[380px] space-y-2.5 overflow-y-auto ps-1">
                  {fkPunches.map((punch, idx) => (
                    <div
                      key={`${punch.empCd}-${punch.timestamp.getTime()}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-success/10 text-success-text flex items-center justify-center font-bold">
                          {punch.direction === "in" ? (
                            <ArrowRightFromLine className="w-4 h-4 text-success-text" />
                          ) : punch.direction === "out" ? (
                            <ArrowLeftFromLine className="w-4 h-4 text-success-text" />
                          ) : (
                            <CircleHelp className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-foreground block">
                            ID: {punch.empCd}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-0.5 font-mono">
                            {punch.timestamp.toLocaleTimeString("ar-EG")}
                          </span>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="inline-flex px-2 py-0.5 rounded bg-muted text-foreground text-xs font-bold">
                          {punch.direction === "in"
                            ? "دخول"
                            : punch.direction === "out"
                              ? "خروج"
                              : "غير معروف"}
                        </span>
                        <span className="text-xs text-muted-foreground block mt-0.5 font-mono">
                          {punch.deviceId}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {punchTab === "k40pro" &&
              (() => {
                const recent = punches
                  .filter(
                    (punch) =>
                      punch.timestamp.getTime() > clearedAt &&
                      !String(punch.deviceId).toLowerCase().startsWith("fk") &&
                      !["unknown", "manual"].includes(
                        String(punch.deviceId).toLowerCase(),
                      ),
                  )
                  .map((punch) => ({ ...punch, punchAt: punch.timestamp }));
                if (!recent.length)
                  return (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 py-10 text-center text-muted-foreground text-xs">
                      <p>
                        {punchesQuery.isLoading
                          ? "جاري تحميل الحركات"
                          : punchesQuery.isError
                            ? "تعذر تحميل الحركات. حاول التحديث بعد قليل."
                            : "لا توجد بصمات K40 Pro مسجلة"}
                      </p>
                    </div>
                  );
                if (isMobile) {
                  return (
                    <div className="max-h-[380px] space-y-2.5 overflow-y-auto ps-1">
                      {recent.map((p: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-foreground block">
                              ID: {p.empCd}
                            </span>
                            <span className="text-xs text-muted-foreground block mt-0.5 font-mono">
                              {new Date(p.punchAt).toLocaleString("ar-EG", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                          <div className="text-end">
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${p.direction === "in" ? "bg-success/10  text-success-text " : "bg-success/10  text-success-text "}`}
                            >
                              {p.direction === "in"
                                ? "دخول"
                                : p.direction === "out"
                                  ? "خروج"
                                  : "غير محدد"}
                            </span>
                            <span className="text-xs text-muted-foreground block mt-0.5 font-mono">
                              {p.deviceId}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div role="region" aria-label="جدول بيانات" tabIndex={0} className="border border-border/60 rounded-xl max-h-[380px] overflow-auto">
                    <table
                      aria-label="البصمات المستلمة"
                      className="w-full text-start text-xs"
                    >
                      <thead className="bg-muted border-b border-border/60 text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-bold">
                            الموظف
                          </th>
                          <th scope="col" className="px-4 py-2.5 font-bold">
                            وقت الحضور
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-2.5 text-center font-bold"
                          >
                            الحالة
                          </th>
                          <th scope="col" className="px-4 py-2.5 font-bold">
                            الجهاز
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-foreground font-medium">
                        {recent.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-mono">{p.empCd}</td>
                            <td className="px-4 py-2.5 font-mono">
                              {new Date(p.punchAt).toLocaleString("ar-EG", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${p.direction === "in" ? "bg-success/10  text-success-text " : "bg-success/10  text-success-text "}`}
                              >
                                {p.direction === "in"
                                  ? "دخول"
                                  : p.direction === "out"
                                    ? "خروج"
                                    : "غير محدد"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-muted-foreground">
                              {p.deviceId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>

      {announcement && (
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      )}

      {(deviceStatus.data?.connectionError ||
        deviceStatus.isError ||
        punchesQuery.isError ||
        fkStatus.isError ||
        admsStatus.isError) && (
        <div className="pt-2">
          <Alert
            variant="destructive"
            className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive-text"
          >
            <AlertCircle className="h-4 w-4 text-destructive-text" />
            <AlertDescription className="text-xs font-bold">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {deviceStatus.data?.connectionError ??
                    "تعذر تحميل بعض بيانات البث."}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void punchesQuery.refetch();
                    void fkStatus.refetch();
                    void admsStatus.refetch();
                    void deviceStatus.refetch();
                  }}
                >
                  إعادة المحاولة
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="text-xs text-muted-foreground font-semibold ps-2">
        * يتم تحديث سجل البث تلقائياً كل 30 ثانية أو عبر WebSocket بشكل لحظي.
      </div>
    </div>
  );
}
