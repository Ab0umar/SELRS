import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Clock, Activity } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"health" | "sync" | "audit">("health");

  const healthQuery = (trpc as any).attendance.systemHealth.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const auditStatsQuery = (trpc as any).attendance.auditStats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const auditLogsQuery = (trpc as any).attendance.auditLogs.useQuery(
    { limit: 100 },
    { refetchInterval: 30_000 }
  );

  const syncStatusQuery = (trpc as any).attendance.syncStatus.useQuery({ limit: 20 });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Attendance Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        {(["health", "sync", "audit"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* System Health Tab */}
      {activeTab === "health" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthQuery.isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </>
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
                    <span className="font-medium">{healthQuery.data.database}</span>
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
                    <div className="text-gray-500 text-sm">Never</div>
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
                  <CardTitle className="text-sm">Records Processed (24h)</CardTitle>
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
                      <div>Logs (24h): {auditStatsQuery.data.totalLogsLast24h}</div>
                      <div>Leaves: {auditStatsQuery.data.leaveActionsLast24h}</div>
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
        <Card>
          <CardHeader>
            <CardTitle>Sync Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {syncStatusQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : syncStatusQuery.data?.runs ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {syncStatusQuery.data.runs.map((run: any) => (
                  <div
                    key={run.id}
                    className="border rounded-lg p-3 bg-gray-50 text-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{run.source} • {run.trigger}</div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          run.status === "ok"
                            ? "bg-success/10 text-success"
                            : run.status === "partial"
                              ? "bg-warning/10 text-warning"
                              : run.status === "failed"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(run.startedAt).toLocaleString()} •{" "}
                      {run.rowsInserted} rows inserted
                    </div>
                    {run.error && (
                      <div className="text-destructive text-xs mt-1">{run.error}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <Card>
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
            ) : auditLogsQuery.data ? (
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
                        <Clock className="w-5 h-5 text-warning" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-words">{log.action}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      {log.empCd && (
                        <div className="text-xs text-gray-600">Emp: {log.empCd}</div>
                      )}
                      {log.error && (
                        <div className="text-xs text-destructive mt-1">{log.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
