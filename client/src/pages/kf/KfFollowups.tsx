import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FilterX, Eye } from "lucide-react";

const FOLLOWUP_STATUS_AR = {
  scheduled: "مجدولة",
  completed: "اكتملت",
  missed: "لم يحضر"
};

export default function KfFollowups() {
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"scheduled" | "completed" | "missed" | "all">("all");

  // Build query input
  const queryInput: any = {};
  if (dateFilter) queryInput.date = dateFilter;
  if (statusFilter !== "all") queryInput.status = statusFilter;

  // Query
  const { data: followups = [], isLoading, isError } = trpc.kf.listFollowups.useQuery(queryInput);

  const handleClearFilters = () => {
    setDateFilter("");
    setStatusFilter("all");
  };

  return (
    <section dir="rtl" className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">جدول متابعات المرضى</h1>
        <p className="text-muted-foreground text-sm">استعراض ومتابعة مواعيد المراجعات الطبية المجدولة لكافة المرضى</p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-semibold">تصفية النتائج</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1 flex-1 max-w-xs">
            <label htmlFor="dateFilter" className="text-xs text-muted-foreground font-medium">تاريخ المتابعة</label>
            <Input
              id="dateFilter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div className="space-y-1 flex-1 max-w-xs">
            <label htmlFor="statusFilter" className="text-xs text-muted-foreground font-medium">الحالة</label>
            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
              <SelectTrigger id="statusFilter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="scheduled">مجدولة</SelectItem>
                <SelectItem value="completed">اكتملت</SelectItem>
                <SelectItem value="missed">لم يحضر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(dateFilter || statusFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              className="gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <FilterX className="h-4 w-4" />
              <span>إلغاء الفلترة</span>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* List Card */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">تاريخ المتابعة</TableHead>
                <TableHead className="text-right">كود المريض</TableHead>
                <TableHead className="text-right">اسم المريض</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الملاحظات</TableHead>
                <TableHead className="text-left">ملف المريض</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-destructive">
                    حدث خطأ أثناء تحميل جدول المتابعات.
                  </TableCell>
                </TableRow>
              ) : followups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    لا توجد مواعيد متابعة تطابق معايير البحث المحددة.
                  </TableCell>
                </TableRow>
              ) : (
                followups.map((f: any) => (
                  <TableRow key={f.kfFollowupId} className="hover:bg-muted/30">
                    <TableCell className="font-semibold">
                      {new Date(f.followupDate).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{"KF-" + String(f.kfPatientId).padStart(4, "0")}</TableCell>
                    <TableCell className="font-semibold">{f.patientName || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          f.status === "completed"
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : f.status === "missed"
                            ? "bg-amber-500 hover:bg-amber-600"
                            : "bg-primary hover:bg-primary/95"
                        }
                      >
                        {(FOLLOWUP_STATUS_AR as Record<string, string>)[f.status ?? "scheduled"] || f.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={f.notes ?? ""}>
                      {f.notes || "—"}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button variant="ghost" size="icon" asChild className="cursor-pointer">
                        <Link href={`/kf/patients/${f.kfPatientId}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
