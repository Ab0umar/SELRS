import { useState } from "react";
import { Download, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const directionTone = {
  in: "border-success/20 bg-success/10 text-success",
  out: "border-info/20 bg-info/10 text-info",
};

export default function RawLogs() {
  const [filters, setFilters] = useState({
    empNo: "",
    fromDate: "",
    toDate: "",
  });

  const rawPunchesQuery = (trpc as any).attendance.rawPunches.useQuery(
    {
      empCd: filters.empNo || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      limit: 500,
    },
    {
      enabled: !!(filters.fromDate || filters.empNo),
    },
  );

  const handleSearch = () => {
    if (!filters.fromDate && !filters.empNo) {
      alert("Please enter at least an employee code or date range");
      return;
    }
    rawPunchesQuery.refetch();
  };

  const handleExport = () => {
    if (!rawPunchesQuery.data?.punches) return;

    const csv = [
      ["Employee", "DateTime", "Direction", "Device"],
      ...rawPunchesQuery.data.punches.map((p: any) => [
        p.empCd,
        new Date(p.punchAt).toLocaleString(),
        p.direction === "in" ? "IN" : "OUT",
        p.deviceId || "-",
      ]),
    ]
      .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raw-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="mx-auto max-w-7xl p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Raw Punch Logs</h1>
          <p className="text-sm text-muted-foreground">
            سجل خام، لكن الآن لونه يوضح اتجاه الحركة والبحث بسرعة.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs font-semibold text-info">
          <Search className="h-3.5 w-3.5" />
          فلترة مباشرة
        </span>
      </div>

      <Card className="mb-6 border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input
              placeholder="Employee Code"
              value={filters.empNo}
              onChange={(e) =>
                setFilters({ ...filters, empNo: e.target.value })
              }
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters({ ...filters, fromDate: e.target.value })
              }
              className="border-border bg-background text-foreground focus:border-info focus:ring-2 focus:ring-info/15"
            />
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters({ ...filters, toDate: e.target.value })
              }
              className="border-border bg-background text-foreground focus:border-info focus:ring-2 focus:ring-info/15"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={rawPunchesQuery.isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-background">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-foreground">
            Results
            {rawPunchesQuery.data &&
              ` (${rawPunchesQuery.data.punches.length} of ${rawPunchesQuery.data.total})`}
          </CardTitle>
          {rawPunchesQuery.data?.punches &&
            rawPunchesQuery.data.punches.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2 border-secondary/20 text-secondary hover:bg-secondary/10"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
        </CardHeader>
        <CardContent>
          {rawPunchesQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rawPunchesQuery.data?.punches &&
            rawPunchesQuery.data.punches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="px-4 py-2 text-right font-semibold text-foreground">
                      الموظف
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-foreground">
                      التاريخ والوقت
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-foreground">
                      الاتجاه
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-foreground">
                      الجهاز
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rawPunchesQuery.data.punches.map(
                    (punch: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-2 font-mono text-muted-foreground">
                          {punch.empCd}
                        </td>
                        <td className="px-4 py-2 text-foreground">
                          {new Date(punch.punchAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              punch.direction === "in"
                                ? directionTone.in
                                : directionTone.out
                            }`}
                          >
                            {punch.direction === "in" ? "دخول" : "خروج"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {punch.deviceId || "-"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {rawPunchesQuery.isError
                ? "Error loading punches"
                : "No results. Use filters to search."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
