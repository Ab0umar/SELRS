import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

export default function AttendanceHome() {
  const dashboardQuery = (trpc as any).attendance.dashboardSummary.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const handleRefresh = () => {
    dashboardQuery.refetch();
  };

  const data = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Present Today */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Present Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-3xl font-bold text-green-600">
                {data?.presentToday ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absent Today */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Absent Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-3xl font-bold text-red-600">
                {data?.absentToday ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Late Today */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Late Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-3xl font-bold text-yellow-600">
                {data?.lateToday ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inside Now */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inside Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-3xl font-bold text-blue-600">
                {data?.insideNow ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Missing Checkout Yesterday */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing Checkout
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-3xl font-bold text-orange-600">
                {data?.missingCheckoutYesterday ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Sync */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <div className="text-sm font-semibold">
                  {data?.lastSync.status === "never"
                    ? "Never"
                    : data?.lastSync.status === "ok"
                      ? "OK"
                      : data?.lastSync.status === "partial"
                        ? "Partial"
                        : data?.lastSync.status === "failed"
                          ? "Failed"
                          : data?.lastSync.status === "running"
                            ? "Running"
                            : "Locked"}
                </div>
                {data?.lastSync.finishedAt && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(data.lastSync.finishedAt).toLocaleString()}
                  </div>
                )}
                {data?.lastSync.rowsInserted && (
                  <div className="text-xs text-muted-foreground">
                    {data.lastSync.rowsInserted} rows
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
