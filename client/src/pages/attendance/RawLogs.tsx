import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download } from "lucide-react";

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
    }
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
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Raw Punch Logs</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Employee Code"
              value={filters.empNo}
              onChange={(e) => setFilters({ ...filters, empNo: e.target.value })}
            />
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters({ ...filters, fromDate: e.target.value })
              }
            />
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters({ ...filters, toDate: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={rawPunchesQuery.isLoading}
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>
            Results
            {rawPunchesQuery.data &&
              ` (${rawPunchesQuery.data.punches.length} of ${rawPunchesQuery.data.total})`}
          </CardTitle>
          {rawPunchesQuery.data?.punches && rawPunchesQuery.data.punches.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
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
          ) : rawPunchesQuery.data?.punches && rawPunchesQuery.data.punches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 px-4">الموظف</th>
                    <th className="text-right py-2 px-4">التاريخ والوقت</th>
                    <th className="text-right py-2 px-4">الاتجاه</th>
                    <th className="text-right py-2 px-4">الجهاز</th>
                  </tr>
                </thead>
                <tbody>
                  {rawPunchesQuery.data.punches.map((punch: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-mono">{punch.empCd}</td>
                      <td className="py-2 px-4">
                        {new Date(punch.punchAt).toLocaleString('ar-EG')}
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            punch.direction === "in"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {punch.direction === "in" ? "دخول" : "خروج"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-500">
                        {punch.deviceId || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
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
