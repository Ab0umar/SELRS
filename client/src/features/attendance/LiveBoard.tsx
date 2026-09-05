import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wifi,
  WifiOff,
  ArrowRightFromLine,
  ArrowLeftFromLine,
  AlertCircle,
  Cpu,
  Trash2,
  Play,
  Square,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";

const tRPC = trpc as any;

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

interface LivePunch {
  empCd: string;
  timestamp: Date;
  direction: "in" | "out" | "unknown";
  deviceId: string;
}

export default function LiveBoard() {
  const isMobile = useIsMobile();
  const [punchTab, setPunchTab] = useState<"ef10k" | "k40pro">("ef10k");
  const [punches, setPunches] = useState<LivePunch[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const admsStatus = tRPC.attendance.admsStatus.useQuery(undefined, { refetchInterval: 15000 });
  const fkStatus = tRPC.attendance.fkStatus.useQuery(undefined, { refetchInterval: 15000 });
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

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
            setPunches((prev) => [newPunch, ...prev.slice(0, 99)]);
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
        const currentWs = wsRef.current;
        if (currentWs?.readyState === WebSocket.OPEN) {
          currentWs.send(
            JSON.stringify({ type: "unsubscribe-attendance" }),
          );
        }
        if (
          currentWs?.readyState === WebSocket.OPEN ||
          currentWs?.readyState === WebSocket.CONNECTING
        ) {
          currentWs.close();
        }
        if (wsRef.current === currentWs) wsRef.current = null;
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
    }
  }, [isMonitoring]);

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

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const clearPunches = () => {
    setPunches([]);
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ── Bento Grid Puzzle ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Live status indicators (col-span-5) */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Bento Box 1: FK live channel (Mint Theme) */}
          <div className="p-6 bg-[#ECFDF5] border border-emerald-150 rounded-3xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">قناة البث المباشر — FK</span>

                {wsConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600/10 text-emerald-700 border border-emerald-250">
                    نشط الآن
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-600/10 text-rose-700 border border-rose-250">
                    غير متصل
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative shrink-0">
                  <span className={`absolute w-10 h-10 rounded-full border border-emerald-500/20 ${wsConnected ? "animate-ping" : ""}`}></span>
                  <Wifi className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">حالة بوابة FK (EF10-K)</span>
                  <span className="text-[10px] text-emerald-700/80 block mt-0.5">تلقي الحركات الفوري من بوابة FK</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-emerald-100 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold">إجمالي الحركات</span>
                  <span className="font-mono font-bold text-emerald-950 text-[11px] block mt-0.5">
                    {fkStatus.data?.punchCount ?? 0} بصمة
                  </span>
                </div>
                <div className="p-3 bg-white border border-emerald-100 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold">آخر وقت بث</span>
                  <span className="font-mono font-bold text-emerald-950 text-[11px] block mt-0.5">
                    {fkStatus.data?.lastPunch ? new Date(fkStatus.data.lastPunch).toLocaleTimeString("ar-EG") : "—"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-emerald-100/50">
                <Button
                  size="sm"
                  onClick={toggleMonitoring}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-4 h-auto rounded-lg gap-1.5 shadow-sm"
                >
                  {isMonitoring ? <Square className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white" />}
                  {isMonitoring ? "إيقاف الاستلام" : "تشغيل الاستلام"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearPunches}
                  disabled={punches.length === 0}
                  className="border-emerald-250 hover:bg-emerald-100 text-emerald-950 text-[10px] font-bold py-1.5 px-4 h-auto rounded-lg gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-emerald-700" />
                  مسح الشاشة
                </Button>
              </div>
            </div>
          </div>

          {/* Bento Box 2: ZK/ADMS live channel (Sky Theme) */}
          <div className="p-6 bg-[#F0F9FF] border border-sky-150 rounded-3xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-sky-850 font-bold uppercase tracking-wider block">قناة البث المباشر — ZK / ADMS</span>

                {wsConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-600/10 text-sky-700 border border-sky-250">
                    نشط الآن
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-600/10 text-rose-700 border border-rose-250">
                    غير متصل
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center relative shrink-0">
                  <span className={`absolute w-10 h-10 rounded-full border border-sky-500/20 ${wsConnected ? "animate-ping" : ""}`}></span>
                  <Wifi className="w-5 h-5 text-sky-700" />
                </div>
                <div>
                  <span className="text-xs font-bold text-sky-950 block">حالة خوادم ADMS (K40 Pro)</span>
                  <span className="text-[10px] text-sky-700/80 block mt-0.5">تلقي الحركات الفوري من بوابة ZK</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-sky-100 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold">إجمالي الحركات</span>
                  <span className="font-mono font-bold text-sky-950 text-[11px] block mt-0.5">
                    {admsStatus.data?.punchCount ?? 0} بصمة
                  </span>
                </div>
                <div className="p-3 bg-white border border-sky-100 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold">آخر وقت بث</span>
                  <span className="font-mono font-bold text-sky-950 text-[11px] block mt-0.5">
                    {admsStatus.data?.lastPunch ? new Date(admsStatus.data.lastPunch).toLocaleTimeString("ar-EG") : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Rolling Punches Stream console (col-span-7) */}
        <div className="md:col-span-7 p-6 bg-white border border-slate-200 rounded-3xl space-y-4 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">شاشة البصمات المستلمة</h3>
            <div className="flex gap-1 bg-slate-50 p-0.5 border border-slate-100 rounded-lg">
              {(["ef10k", "k40pro"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPunchTab(t)}
                  className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all ${
                    punchTab === t ? "bg-slate-900 text-white shadow-sm" : "text-slate-550 hover:text-slate-900"
                  }`}
                >
                  {t === "ef10k" ? "بوابة EF10K" : "بوابة K40 Pro"}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            {punchTab === "ef10k" && (
              punches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-slate-400 text-xs">
                  <p>لا توجد حركات حضور مستلمة بعد</p>
                </div>
              ) : (
                <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
                  {punches.map((punch, idx) => (
                    <div
                      key={`${punch.empCd}-${punch.timestamp.getTime()}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-150 bg-slate-50/30 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                          {punch.direction === "in" ? <ArrowRightFromLine className="w-4 h-4 text-emerald-600" /> : <ArrowLeftFromLine className="w-4 h-4 text-teal-600" />}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-800 block">ID: {punch.empCd}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">{punch.timestamp.toLocaleTimeString("ar-EG")}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold">
                          {punch.direction === "in" ? "دخول" : punch.direction === "out" ? "خروج" : "غير معروف"}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">{punch.deviceId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {punchTab === "k40pro" && (() => {
              const recent = admsStatus.data?.recentPunches ?? [];
              if (!recent.length) return (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-slate-400 text-xs">
                  <p>لا توجد بصمات K40 Pro مسجلة</p>
                </div>
              );
              if (isMobile) {
                return (
                  <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
                    {recent.map((p: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-150 bg-slate-50/30 text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-800 block">ID: {p.empCd}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                            {new Date(p.punchAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <div className="text-left">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${p.direction === "in" ? "bg-emerald-50 text-emerald-700" : "bg-teal-50 text-teal-700"}`}>
                            {p.direction === "in" ? "دخول" : "خروج"}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">{p.deviceId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-bold">الموظف</th>
                        <th className="px-4 py-2.5 font-bold">وقت الحضور</th>
                        <th className="px-4 py-2.5 text-center font-bold">الحالة</th>
                        <th className="px-4 py-2.5 font-bold">الجهاز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {recent.map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/30">
                          <td className="px-4 py-2.5 font-mono">{p.empCd}</td>
                          <td className="px-4 py-2.5 font-mono">{new Date(p.punchAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${p.direction === "in" ? "bg-emerald-50 text-emerald-700" : "bg-teal-50 text-teal-700"}`}>
                              {p.direction === "in" ? "دخول" : "خروج"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-400">{p.deviceId}</td>
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

      {deviceStatus?.connectionError && (
        <div className="pt-2">
          <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-800 rounded-2xl shadow-sm">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <AlertDescription className="text-xs font-bold">{deviceStatus.connectionError}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="text-[10px] text-slate-400 font-semibold pr-2">
        * يتم تحديث سجل البث تلقائياً كل 30 ثانية أو عبر WebSocket بشكل لحظي.
      </div>
    </div>
  );
}
