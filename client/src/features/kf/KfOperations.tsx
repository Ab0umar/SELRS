import { useState } from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  ClipboardList,
  FilterX,
  Eye,
  ArrowLeftRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";

const OP_STATUS_AR = {
  scheduled: "مجدولة",
  completed: "اكتملت",
  cancelled: "ملغاة",
};

export default function KfOperations() {
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "accountant";
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "scheduled" | "completed" | "cancelled" | "all"
  >("all");
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  const queryInput: any = {};
  if (dateFilter) queryInput.date = dateFilter;
  if (statusFilter !== "all") queryInput.status = statusFilter;

  const utils = trpc.useUtils();
  const {
    data: operations = [],
    isLoading,
    isError,
    refetch,
  } = trpc.kf.listOperations.useQuery(queryInput);
  const deleteMut = trpc.kf.deleteOperation.useMutation({
    onSuccess: () => {
      utils.kf.listOperations.invalidate();
      toast.success("تم حذف العملية");
      setDelConfirm(null);
    },
    onError: () => toast.error("تعذر حذف العملية"),
  });

  const handleClearFilters = () => {
    setDateFilter("");
    setStatusFilter("all");
  };

  return (
    <section dir="rtl" className="space-y-4">
      <div className="sr-only">
        <h1 className="sr-only">جدول العمليات الجراحية</h1>
        <p className="text-muted-foreground text-sm">
          استعراض ومتابعة مواعيد العمليات الجراحية لكافة المرضى
        </p>
      </div>

      <Card className="shadow-sm border-border/60 bg-card  hover:shadow-md transition-all duration-300">
        <CardHeader className="py-4 pb-4 border-b border-border/40 bg-muted/40 rounded-t-xl">
          <CardTitle className="text-sm font-semibold">تصفية النتائج</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1 flex-1 max-w-xs">
            <label
              htmlFor="dateFilter"
              className="text-xs text-muted-foreground font-medium"
            >
              تاريخ العملية
            </label>
            <DateInput
              id="dateFilter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div className="space-y-1 flex-1 max-w-xs">
            <label
              htmlFor="statusFilter"
              className="text-xs text-muted-foreground font-medium"
            >
              حالة العملية
            </label>
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

      <Card className="shadow-sm border-border/60 bg-card  hover:shadow-md transition-all duration-300">
        <CardContent className="p-0">
          <div className="md:hidden">
            {isLoading ? (
              <div
                role="status"
                className="space-y-3 p-4 text-sm text-muted-foreground"
              >
                جاري تحميل العمليات…
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div
                role="alert"
                className="space-y-3 p-6 text-center text-sm text-destructive"
              >
                <p>تعذر تحميل جدول العمليات.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : operations.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                لا توجد عمليات تطابق معايير البحث المحددة.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {operations.map((op: any) => (
                  <article key={op.kfOpId} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{op.patientName || "—"}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {op.patientName
                            ? "KF-" + String(op.kfPatientId).padStart(4, "0")
                            : "—"}
                        </p>
                      </div>
                      <Badge
                        className={
                          op.status === "completed"
                            ? "bg-success text-success-foreground"
                            : op.status === "cancelled"
                              ? "bg-destructive"
                              : "bg-primary"
                        }
                      >
                        {(OP_STATUS_AR as Record<string, string>)[
                          op.status ?? "scheduled"
                        ] || op.status}
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          التاريخ
                        </dt>
                        <dd>
                          {new Date(op.opDate).toLocaleDateString("ar-EG")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          نوع العملية
                        </dt>
                        <dd>{op.opType}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">العين</dt>
                        <dd>
                          {op.eye === "both"
                            ? "العينين"
                            : op.eye === "right"
                              ? "اليمنى"
                              : op.eye === "left"
                                ? "اليسرى"
                                : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          الجراح
                        </dt>
                        <dd>{op.doctorName || "—"}</dd>
                      </div>
                    </dl>
                    <div className="flex items-center justify-between gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/kf/patients/${op.kfPatientId}`}>
                          <Eye className="h-4 w-4" /> ملف المريض
                        </Link>
                      </Button>
                      {canDelete ? (
                        delConfirm === op.kfOpId ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                deleteMut.mutate({ kfOpId: op.kfOpId })
                              }
                              disabled={deleteMut.isPending}
                            >
                              {deleteMut.isPending ? (
                                <Loader2
                                  className="h-3 w-3 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                "حذف"
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDelConfirm(null)}
                            >
                              لا
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setDelConfirm(op.kfOpId)}
                            aria-label="حذف العملية"
                            title="حذف العملية"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                        )
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">التاريخ</TableHead>
                  <TableHead className="text-start">كود المريض</TableHead>
                  <TableHead className="text-start">اسم المريض</TableHead>
                  <TableHead className="text-start">نوع العملية</TableHead>
                  <TableHead className="text-start">العين</TableHead>
                  <TableHead className="text-start">الجراح</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                  <TableHead className="text-end">ملف المريض</TableHead>
                  <TableHead className="text-end"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-destructive"
                    >
                      <div
                        role="alert"
                        className="flex flex-col items-center gap-3"
                      >
                        <span>تعذر تحميل جدول العمليات.</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void refetch()}
                        >
                          إعادة المحاولة
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : operations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-10 text-muted-foreground"
                    >
                      لا توجد عمليات تطابق معايير البحث المحددة.
                    </TableCell>
                  </TableRow>
                ) : (
                  operations.map((op: any) => (
                    <TableRow key={op.kfOpId} className="hover:bg-muted/30">
                      <TableCell className="font-semibold">
                        {new Date(op.opDate).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {op.patientName
                          ? "KF-" + String(op.kfPatientId).padStart(4, "0")
                          : "—"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {op.patientName || "—"}
                      </TableCell>
                      <TableCell>{op.opType}</TableCell>
                      <TableCell>
                        {op.eye === "both" ? (
                          <Badge variant="secondary" className="gap-1">
                            <ArrowLeftRight className="h-3 w-3" />
                            <span>العينين</span>
                          </Badge>
                        ) : op.eye === "right" ? (
                          <Badge
                            variant="outline"
                            className="border-primary/20 text-primary bg-primary/5"
                          >
                            اليمنى
                          </Badge>
                        ) : op.eye === "left" ? (
                          <Badge
                            variant="outline"
                            className="border-secondary/25 text-primary bg-secondary/5"
                          >
                            اليسرى
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{op.doctorName || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            op.status === "completed"
                              ? "bg-success hover:bg-success/90 text-success-foreground"
                              : op.status === "cancelled"
                                ? "bg-destructive hover:bg-destructive/90"
                                : "bg-primary hover:bg-primary/95"
                          }
                        >
                          {(OP_STATUS_AR as Record<string, string>)[
                            op.status ?? "scheduled"
                          ] || op.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="cursor-pointer"
                        >
                          <Link
                            href={`/kf/patients/${op.kfPatientId}`}
                            aria-label="فتح ملف المريض"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell
                        className="text-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {delConfirm === op.kfOpId ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                deleteMut.mutate({ kfOpId: op.kfOpId })
                              }
                              disabled={deleteMut.isPending}
                            >
                              {deleteMut.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "حذف"
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => setDelConfirm(null)}
                            >
                              لا
                            </Button>
                          </div>
                        ) : canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setDelConfirm(op.kfOpId)}
                            aria-label="حذف العملية"
                            title="حذف العملية"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
