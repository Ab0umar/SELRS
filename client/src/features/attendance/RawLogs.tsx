import { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/useMobile";
import { ReportToolbar } from "./ReportToolbar";

const directionTone = {
  in: "border-success/20 bg-success/10 text-success",
  out: "border-info/20 bg-info/10 text-info",
};

export default function RawLogs({
  from,
  to,
  department,
}: {
  from: string;
  to: string;
  department?: string;
}) {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState({
    empNo: "",
    fromDate: "",
    toDate: "",
  });
  useEffect(() => {
    setFilters((current) => ({ ...current, fromDate: from, toDate: to }));
  }, [from, to]);

  const rawPunchesQuery = (trpc as any).attendance.rawPunches.useQuery(
    {
      empCd: filters.empNo || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      department,
      limit: 500,
    },
    {
      enabled: !!(filters.fromDate || filters.empNo),
    },
  );

  const handleSearch = () => {
    if (!filters.fromDate && !filters.empNo) {
      alert("أدخل كود موظف أو نطاق تاريخ للبحث");
      return;
    }
    rawPunchesQuery.refetch();
  };

  const handleExport = () => {
    if (!rawPunchesQuery.data?.punches) return;

    const csv = [
      ["الموظف", "التاريخ والوقت", "الاتجاه", "الجهاز"],
      ...rawPunchesQuery.data.punches.map((p: any) => [
        p.empCd,
        new Date(p.punchAt).toLocaleString(),
        p.direction === "in" ? "دخول" : "خروج",
        p.deviceId || "-",
      ]),
    ]
      .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raw-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const punches = rawPunchesQuery.data?.punches ?? [];

  return (
    <div className="w-full p-0" dir="rtl">
      <ReportToolbar>
        <Input
          placeholder="كود الموظف"
          value={filters.empNo}
          onChange={(event) =>
            setFilters((current) => ({ ...current, empNo: event.target.value }))
          }
          className="h-10 w-44"
        />
        <Button onClick={handleSearch} disabled={rawPunchesQuery.isLoading}>
          <Search className="h-4 w-4" /> بحث
        </Button>
      </ReportToolbar>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div />
        <span className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs font-semibold text-info">
          <Search className="h-3.5 w-3.5" />
          فلترة مباشرة
        </span>
      </div>

      <Card className="hidden">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">البحث</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input
              placeholder="كود الموظف"
              value={filters.empNo}
              onChange={(e) =>
                setFilters({ ...filters, empNo: e.target.value })
              }
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={rawPunchesQuery.isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
                بحث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-background">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-foreground">
            النتائج
            {rawPunchesQuery.data &&
              ` (${punches.length} من ${rawPunchesQuery.data.total})`}
          </CardTitle>
          {punches.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2 border-secondary/20 text-primary hover:bg-secondary/10"
            >
              <Download className="h-4 w-4" />
              تصدير CSV
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
          ) : punches.length > 0 && isMobile ? (
            <div className="space-y-2" dir="rtl">
              {punches.map((punch: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-background p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {new Date(punch.punchAt).toLocaleString("ar-EG")}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {punch.empCd}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        punch.direction === "in"
                          ? directionTone.in
                          : directionTone.out
                      }`}
                    >
                      {punch.direction === "in" ? "دخول" : "خروج"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    الجهاز: {punch.deviceId || "-"}
                  </div>
                </div>
              ))}
            </div>
          ) : punches.length > 0 ? (
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
                  {punches.map((punch: any, idx: number) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {rawPunchesQuery.isError
                ? "تعذر تحميل السجلات."
                : "لا توجد نتائج. استخدم الفلاتر للبحث."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
