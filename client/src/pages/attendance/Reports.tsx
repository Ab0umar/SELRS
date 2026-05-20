import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Calendar } from "lucide-react";

type ReportTab = "summary" | "late" | "absent" | "ot" | "monthly";

export default function Reports() {
  const [dates, setDates] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const [activeTab, setActiveTab] = useState<ReportTab>("summary");

  // Extract year and month from selected dates for the monthly report queries
  const selectedDate = new Date(dates.from);
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const monthlyQuery = (trpc as any).attendance.monthlyReport.useQuery({
    year,
    month,
  });

  const lateQuery = (trpc as any).attendance.lateReport.useQuery({
    year,
    month,
  });

  const absentQuery = (trpc as any).attendance.absentReport.useQuery({
    year,
    month,
  });

  const otQuery = (trpc as any).attendance.otReport.useQuery({
    year,
    month,
  });

  const summaryQuery = (trpc as any).attendance.summaryReport.useQuery({
    year,
    month,
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
      return <div className="text-center py-8 text-gray-500">لا توجد بيانات</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th key={col} className="text-right py-3 px-4 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, idx: number) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="py-2 px-4 text-right">
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

  const getTabLabel = (tab: ReportTab) => {
    const labels: { [key in ReportTab]: string } = {
      summary: 'ملخص',
      late: 'التأخير',
      absent: 'الغياب',
      ot: 'الساعات الإضافية',
      monthly: 'شهري',
    };
    return labels[tab];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">تقارير الحضور</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            اختيار الفترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-row-reverse">
            <div>
              <label className="block text-sm font-medium mb-1">إلى</label>
              <input
                type="date"
                value={dates.to}
                onChange={(e) => setDates({ ...dates, to: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">من</label>
              <input
                type="date"
                value={dates.from}
                onChange={(e) => setDates({ ...dates, from: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            التقارير تُعرض بناءً على الشهر المختار: {year}/{month}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex gap-2 border-b overflow-x-auto">
            {(["summary", "late", "absent", "ot", "monthly"] as ReportTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium whitespace-nowrap ${
                    activeTab === tab
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {getTabLabel(tab)}
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
                        `ملخص-${year}-${String(month).padStart(2, "0")}.csv`
                      );
                    }
                  }}
                  disabled={!summaryQuery.data || summaryQuery.data.length === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير
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
                        `تأخير-${year}-${String(month).padStart(2, "0")}.csv`
                      );
                    }
                  }}
                  disabled={!lateQuery.data || lateQuery.data.length === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير
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
                        `غياب-${year}-${String(month).padStart(2, "0")}.csv`
                      );
                    }
                  }}
                  disabled={!absentQuery.data || absentQuery.data.length === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير
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
                        `ساعات-إضافية-${year}-${String(month).padStart(2, "0")}.csv`
                      );
                    }
                  }}
                  disabled={!otQuery.data || otQuery.data.length === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير
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
                        `شهري-${year}-${String(month).padStart(2, "0")}.csv`
                      );
                    }
                  }}
                  disabled={!monthlyQuery.data || monthlyQuery.data.length === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير
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
                ])
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
