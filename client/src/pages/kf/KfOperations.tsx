import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ClipboardList, FilterX, Eye, ArrowLeftRight, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const OP_STATUS_AR = {
  scheduled: "مجدولة",
  completed: "اكتملت",
  cancelled: "ملغاة"
};

export default function KfOperations() {
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "accountant";
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"scheduled" | "completed" | "cancelled" | "all">("all");
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  // Build query input
  const queryInput: any = {};
  if (dateFilter) queryInput.date = dateFilter;
  if (statusFilter !== "all") queryInput.status = statusFilter;

  const utils = trpc.useUtils();
  // Query
  const { data: operations = [], isLoading, isError, refetch } = trpc.kf.listOperations.useQuery(queryInput);
  const deleteMut = trpc.kf.deleteOperation.useMutation({
    onSuccess: () => { utils.kf.listOperations.invalidate(); toast.success("تم حذف العملية"); setDelConfirm(null); },
    onError: () => toast.error("تعذر حذف العملية"),
  });

  const handleClearFilters = () => {
    setDateFilter("");
    setStatusFilter("all");
  };

  return (
    <section dir="rtl" className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">جدول العمليات الجراحية</h1>
        <p className="text-muted-foreground text-sm">استعراض ومتابعة مواعيد العمليات الجراحية لكافة المرضى</p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-semibold">تصفية النتائج</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1 flex-1 max-w-xs">
            <label htmlFor="dateFilter" className="text-xs text-muted-foreground font-medium">تاريخ العملية</label>
            <Input
              id="dateFilter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div className="space-y-1 flex-1 max-w-xs">
            <label htmlFor="statusFilter" className="text-xs text-muted-foreground font-medium">حالة العملية</label>
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
                <SelectItem value="cancelled">ملغاة</SelectItem>
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
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">كود المريض</TableHead>
                <TableHead className="text-right">اسم المريض</TableHead>
                <TableHead className="text-right">نوع العملية</TableHead>
                <TableHead className="text-right">العين</TableHead>
                <TableHead className="text-right">الجراح</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left">ملف المريض</TableHead>
                <TableHead className="text-left"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-destructive">
                    حدث خطأ أثناء تحميل جدول العمليات.
                  </TableCell>
                </TableRow>
              ) : operations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    لا توجد عمليات تطابق معايير البحث المحددة.
                  </TableCell>
                </TableRow>
              ) : (
                operations.map((op: any) => (
                  <TableRow key={op.kfOpId} className="hover:bg-muted/30">
                    <TableCell className="font-semibold">
                      {new Date(op.opDate).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{op.patientName ? "KF-" + String(op.kfPatientId).padStart(4, "0") : "—"}</TableCell>
                    <TableCell className="font-semibold">{op.patientName || "—"}</TableCell>
                    <TableCell>{op.opType}</TableCell>
                    <TableCell>
                      {op.eye === "both" ? (
                        <Badge variant="secondary" className="gap-1">
                          <ArrowLeftRight className="h-3 w-3" />
                          <span>العينين</span>
                        </Badge>
                      ) : op.eye === "right" ? (
                        <Badge variant="outline" className="border-sky-200 text-sky-700 bg-sky-50/20">اليمنى</Badge>
                      ) : op.eye === "left" ? (
                        <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50/20">اليسرى</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{op.doctorName || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          op.status === "completed"
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : op.status === "cancelled"
                            ? "bg-destructive hover:bg-destructive/90"
                            : "bg-primary hover:bg-primary/95"
                        }
                      >
                        {(OP_STATUS_AR as Record<string, string>)[op.status ?? "scheduled"] || op.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <Button variant="ghost" size="icon" asChild className="cursor-pointer">
                        <Link href={`/kf/patients/${op.kfPatientId}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                    <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                      {delConfirm === op.kfOpId ? (
                        <div className="flex gap-1">
                          <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => deleteMut.mutate({ kfOpId: op.kfOpId })} disabled={deleteMut.isPending}>
                            {deleteMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setDelConfirm(null)}>لا</Button>
                        </div>
                      ) : canDelete ? (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDelConfirm(op.kfOpId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
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
