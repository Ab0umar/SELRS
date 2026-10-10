import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Clock, Activity } from "lucide-react";
import { handleTabListKeys } from "@/lib/tabKeys";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"health" | "sync" | "audit">(
    "health",
  );
  const [syncSubTab, setSyncSubTab] = useState<"ef10k" | "k40pro">("ef10k");

  const healthQuery = (trpc as any).attendance.systemHealth.useQuery(
    undefined,
    {
      refetchInterval: 30_000,
    },
  );

  const auditStatsQuery = (trpc as any).attendance.auditStats.useQuery(
    undefined,
    {
      refetchInterval: 60_000,
    },
  );

  const auditLogsQuery = (trpc as any).attendance.auditLogs.useQuery(
    { limit: 100 },
    { refetchInterval: 30_000 },
  );

  const syncStatusQuery = (trpc as any).attendance.syncStatus.useQuery({
    limit: 20,
  });
  const zk40Logs = (trpc as any).attendance.zk40SyncLogs.useQuery();

  return (
    <div className="w-full min-w-0">
      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="لوحة إدارة الحضور"
        onKeyDown={(event) =>
          handleTabListKeys(
            event,
            ["health", "sync", "audit"],
            activeTab,
            setActiveTab,
            (key) => `attendance-admin-tab-${key}`,
          )
        }
        className="attendance-tabs mb-6"
      >
        {(["health", "sync", "audit"] as const).map((tab) => (
          <Button variant="bare"
            key={tab}
            type="button"
            id={`attendance-admin-tab-${tab}`}
            role="tab"
            tabIndex={activeTab === tab ? 0 : -1}
            aria-selected={activeTab === tab}
            aria-controls={`attendance-admin-panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "health"
              ? "سلامة النظام"
              : tab === "sync"
                ? "المزامنة"
                : "سجل التدقيق"}
          </Button>
        ))}
      </div>

      {/* System Health Tab */}
      {activeTab === "health" && (
        <div
          id="attendance-admin-panel-health"
          role="tabpanel"
          aria-labelledby="attendance-admin-tab-health"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {healthQuery.isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </>
          ) : healthQuery.isError ? (
            <div
              role="alert"
              className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
            >
              <span>تعذر تحميل سلامة النظام.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => healthQuery.refetch()}
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : healthQuery.data ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        healthQuery.data.database === "healthy"
                          ? "bg-success"
                          : "bg-destructive"
                      }`}
                    />
                    <span className="font-medium">
                      {healthQuery.data.database}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Last Sync</CardTitle>
                </CardHeader>
                <CardContent>
                  {healthQuery.data.lastSyncTime ? (
                    <div className="text-sm">
                      {new Date(healthQuery.data.lastSyncTime).toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">Never</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Syncs (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {healthQuery.data.syncRunsLast24h}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Errors (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      healthQuery.data.errorsLast24h > 0
                        ? "text-destructive"
                        : "text-success"
                    }`}
                  >
                    {healthQuery.data.errorsLast24h}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Records Processed (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {healthQuery.data.totalRecordsProcessed}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Audit Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {auditStatsQuery.data ? (
                    <div className="text-sm space-y-1">
                      <div>
                        Logs (24h): {auditStatsQuery.data.totalLogsLast24h}
                      </div>
                      <div>
                        Leaves: {auditStatsQuery.data.leaveActionsLast24h}
                      </div>
                    </div>
                  ) : auditStatsQuery.isError ? (
                    <div role="alert" className="text-sm text-destructive-text">
                      تعذر تحميل إحصاءات التدقيق.
                    </div>
                  ) : (
                    <Skeleton className="h-6" />
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* Sync Status Tab */}
      {activeTab === "sync" && (
        <Card
          id="attendance-admin-panel-sync"
          role="tabpanel"
          aria-labelledby="attendance-admin-tab-sync"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>سجل المزامنة</CardTitle>
              <div className="flex gap-1">
                {(["ef10k", "k40pro"] as const).map((t) => (
                  <Button variant="bare"
                    key={t}
                    onClick={() => setSyncSubTab(t)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${syncSubTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground border border-border"}`}
                  >
                    {t === "ef10k" ? "EF10K" : "K40 Pro"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {syncSubTab === "ef10k" &&
              (syncStatusQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : syncStatusQuery.isError ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 py-6 text-sm"
                >
                  <span>تعذر تحميل سجل مزامنة EF10K.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => syncStatusQuery.refetch()}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              ) : syncStatusQuery.data?.runs?.length ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {syncStatusQuery.data.runs.map((run: any) => (
                    <div
                      key={run.id}
                      className="border rounded-lg p-3 bg-muted/30 text-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">
                          {run.source} • {run.trigger}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            run.status === "ok"
                              ? "bg-success/10 text-success"
                              : run.status === "partial"
                                ? "bg-warning/10 text-warning-text"
                                : run.status === "failed"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-primary/10 text-primary"
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(run.startedAt).toLocaleString()} •{" "}
                        {run.rowsInserted} rows inserted
                      </div>
                      {run.error && (
                        <div className="text-destructive text-xs mt-1">
                          {run.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-sm text-muted-foreground">
                  لا توجد عمليات مزامنة EF10K بعد.
                </p>
              ))}
            {syncSubTab === "k40pro" &&
              (zk40Logs.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : zk40Logs.isError ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 py-6 text-sm"
                >
                  <span>تعذر تحميل سجل مزامنة K40 Pro.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => zk40Logs.refetch()}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              ) : !zk40Logs.data?.length ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد عمليات مزامنة بعد.
                </p>
              ) : (
                <div role="region" aria-label="جدول بيانات" tabIndex={0} className="rounded-md border overflow-x-auto max-h-96 overflow-y-auto">
                  <table aria-label="سجل المزامنة" className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/50">
                      <tr className="border-b">
                        <th
                          scope="col"
                          className="px-3 py-2 text-start font-medium"
                        >
                          الوقت
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-center font-medium"
                        >
                          الحالة
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-center font-medium"
                        >
                          مرئي
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-center font-medium"
                        >
                          مُضاف
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-center font-medium"
                        >
                          مكرر
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-start font-medium"
                        >
                          خطأ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {zk40Logs.data.map((row: any) => (
                        <tr
                          key={row.id}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-3 py-2 font-mono whitespace-nowrap">
                            {new Date(row.startedAt).toLocaleString("ar-EG", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-semibold ${row.status === "ok" ? "bg-success/15 text-success" : row.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {row.rowsSeen}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-success">
                            {row.rowsInserted}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                            {row.rowsSkipped}
                          </td>
                          <td className="px-3 py-2 text-destructive truncate max-w-[160px]">
                            {row.error ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <Card
          id="attendance-admin-panel-audit"
          role="tabpanel"
          aria-labelledby="attendance-admin-tab-audit"
        >
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogsQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : auditLogsQuery.isError ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 py-6 text-sm"
              >
                <span>تعذر تحميل سجل التدقيق.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => auditLogsQuery.refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : auditLogsQuery.data?.length ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLogsQuery.data.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-3 text-sm flex items-start gap-3"
                  >
                    <div>
                      {log.status === "success" ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : log.status === "error" ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Clock className="w-5 h-5 text-warning-text" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-words">
                        {log.action}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      {log.empCd && (
                        <div className="text-xs text-muted-foreground">
                          Emp: {log.empCd}
                        </div>
                      )}
                      {log.error && (
                        <div className="text-xs text-destructive mt-1">
                          {log.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-muted-foreground">
                لا توجد أحداث تدقيق بعد.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
