import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

type ReportTab = "monthly" | "late" | "absent" | "ot" | "summary";

export default function Reports() {
  const [date, setDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const [activeTab, setActiveTab] = useState<ReportTab>("summary");

  const monthlyQuery = (trpc as any).attendance.monthlyReport.useQuery({
    year: date.year,
    month: date.month,
  });

  const lateQuery = (trpc as any).attendance.lateReport.useQuery({
    year: date.year,
    month: date.month,
  });

  const absentQuery = (trpc as any).attendance.absentReport.useQuery({
    year: date.year,
    month: date.month,
  });

  const otQuery = (trpc as any).attendance.otReport.useQuery({
    year: date.year,
    month: date.month,
  });

  const summaryQuery = (trpc as any).attendance.summaryReport.useQuery({
    year: date.year,
    month: date.month,
  });

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((h) => `"${row[h]}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const renderTable = (data: any[], columns: string[]) => {
    if (!data || data.length === 0) {
      return <div className="text-center py-8 text-gray-500">No data</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th key={col} className="text-left py-3 px-4 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, idx: number) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="py-2 px-4">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Attendance Reports</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Period Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Year</label>
              <Input
                type="number"
                min="2020"
                max="2099"
                value={date.year}
                onChange={(e) =>
                  setDate({ ...date, year: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Month</label>
              <select
                value={date.month}
                onChange={(e) =>
                  setDate({ ...date, month: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2024, m - 1).toLocaleString("en-US", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex gap-2 border-b">
            {(["summary", "late", "absent", "ot", "monthly"] as ReportTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium ${
                    activeTab === tab
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              )
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {activeTab === "summary" && (
            <div>
              <div className="mb-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (summaryQuery.data) {
                      handleExportCSV(
                        summaryQuery.data,
                        `summary-${date.year}-${String(date.month).padStart(
                          2,
                          "0"
                        )}.csv`
                      );
                    }
                  }}
                  disabled={!summaryQuery.data || summaryQuery.data.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              {summaryQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                renderTable(summaryQuery.data || [], [
                  "empCd",
                  "empName",
                  "presentDays",
                  "absentDays",
                  "leaveDays",
                  "totalLateMins",
                  "totalOTHours",
                ])
              )}
            </div>
          )}

          {activeTab === "late" && (
            <div>
              <div className="mb-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (lateQuery.data) {
                      handleExportCSV(
                        lateQuery.data,
                        `late-${date.year}-${String(date.month).padStart(
                          2,
                          "0"
                        )}.csv`
                      );
                    }
                  }}
                  disabled={!lateQuery.data || lateQuery.data.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              {lateQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                renderTable(lateQuery.data || [], [
                  "empCd",
                  "empName",
                  "lateDays",
                  "totalLateMins",
                  "avgLateMins",
                ])
              )}
            </div>
          )}

          {activeTab === "absent" && (
            <div>
              <div className="mb-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (absentQuery.data) {
                      handleExportCSV(
                        absentQuery.data,
                        `absent-${date.year}-${String(date.month).padStart(
                          2,
                          "0"
                        )}.csv`
                      );
                    }
                  }}
                  disabled={!absentQuery.data || absentQuery.data.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              {absentQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                renderTable(absentQuery.data || [], ["empCd", "empName", "absentDays"])
              )}
            </div>
          )}

          {activeTab === "ot" && (
            <div>
              <div className="mb-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (otQuery.data) {
                      handleExportCSV(
                        otQuery.data,
                        `ot-${date.year}-${String(date.month).padStart(
                          2,
                          "0"
                        )}.csv`
                      );
                    }
                  }}
                  disabled={!otQuery.data || otQuery.data.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              {otQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                renderTable(otQuery.data || [], ["empCd", "empName", "otDays", "totalOTHours"])
              )}
            </div>
          )}

          {activeTab === "monthly" && (
            <div>
              <div className="mb-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (monthlyQuery.data) {
                      handleExportCSV(
                        monthlyQuery.data,
                        `monthly-${date.year}-${String(date.month).padStart(
                          2,
                          "0"
                        )}.csv`
                      );
                    }
                  }}
                  disabled={!monthlyQuery.data || monthlyQuery.data.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              {monthlyQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                renderTable(monthlyQuery.data || [], [
                  "empCd",
                  "empName",
                  "totalDays",
                  "presentDays",
                  "absentDays",
                  "leaveDays",
                  "totalLateMins",
                  "totalOTMins",
                ])
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
