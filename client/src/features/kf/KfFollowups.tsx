import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar, FilterX, Eye, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";

const FOLLOWUP_STATUS_AR = {
  scheduled: "مجدولة",
  completed: "اكتملت",
  missed: "لم يحضر",
};

export default function KfFollowups() {
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "accountant";
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "scheduled" | "completed" | "missed" | "all"
  >("all");
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  const queryInput: any = {};
  if (dateFilter) queryInput.date = dateFilter;
  if (statusFilter !== "all") queryInput.status = statusFilter;

  const utils = trpc.useUtils();
  const {
    data: followups = [],
    isLoading,
    isError,
    refetch,
  } = trpc.kf.listFollowups.useQuery(queryInput);
  const deleteMut = trpc.kf.deleteFollowup.useMutation({
    onSuccess: () => {
      utils.kf.listFollowups.invalidate();
      toast.success("تم حذف المتابعة");
      setDelConfirm(null);
    },
    onError: () => toast.error("تعذر حذف المتابعة"),
  });

  const handleClearFilters = () => {
    setDateFilter("");
    setStatusFilter("all");
  };

  return (
    <section dir="rtl" className="space-y-4">
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
              تاريخ المتابعة
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
              الحالة
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

      <Card className="shadow-sm border-border/60 bg-card  hover:shadow-md transition-all duration-300">
        <CardContent className="p-0">
          <div className="md:hidden">
            {isLoading ? (
              <div
                role="status"
                className="space-y-3 p-4 text-sm text-muted-foreground"
              >
                جاري تحميل المتابعات…
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div
                role="alert"
                className="space-y-3 p-6 text-center text-sm text-destructive"
              >
                <p>تعذر تحميل جدول المتابعات.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : followups.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                لا توجد مواعيد متابعة تطابق معايير البحث المحددة.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {followups.map((f: any) => (
                  <article key={f.kfFollowupId} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{f.patientName || "—"}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {"KF-" + String(f.kfPatientId).padStart(4, "0")}
                        </p>
                      </div>
                      <Badge
                        className={
                          f.status === "completed"
                            ? "bg-success text-success-foreground"
                            : f.status === "missed"
                              ? "bg-warning text-warning-foreground"
                              : "bg-primary text-primary-foreground"
                        }
                      >
                        {(FOLLOWUP_STATUS_AR as Record<string, string>)[
                          f.status ?? "scheduled"
                        ] || f.status}
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          تاريخ المتابعة
                        </dt>
                        <dd>
                          {new Date(f.followupDate).toLocaleDateString("ar-EG")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          الملاحظات
                        </dt>
                        <dd className="truncate">{f.notes || "—"}</dd>
                      </div>
                    </dl>
                    <div className="flex items-center justify-between gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/kf/patients/${f.kfPatientId}`}
                          aria-label="فتح ملف المريض"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" /> ملف
                          المريض
                        </Link>
                      </Button>
                      {canDelete ? (
                        delConfirm === f.kfFollowupId ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                deleteMut.mutate({
                                  kfFollowupId: f.kfFollowupId,
                                })
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
                            onClick={() => setDelConfirm(f.kfFollowupId)}
                            aria-label="حذف المتابعة"
                            title="حذف المتابعة"
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
                  <TableHead className="text-start">تاريخ المتابعة</TableHead>
                  <TableHead className="text-start">كود المريض</TableHead>
                  <TableHead className="text-start">اسم المريض</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                  <TableHead className="text-start">الملاحظات</TableHead>
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
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-destructive"
                    >
                      <div
                        role="alert"
                        className="flex flex-col items-center gap-3"
                      >
                        <span>تعذر تحميل جدول المتابعات.</span>
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
                ) : followups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      لا توجد مواعيد متابعة تطابق معايير البحث المحددة.
                    </TableCell>
                  </TableRow>
                ) : (
                  followups.map((f: any) => (
                    <TableRow
                      key={f.kfFollowupId}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="font-semibold">
                        {new Date(f.followupDate).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {"KF-" + String(f.kfPatientId).padStart(4, "0")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {f.patientName || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            f.status === "completed"
                              ? "bg-success hover:bg-success/90 text-success-foreground"
                              : f.status === "missed"
                                ? "bg-warning hover:bg-warning/90 text-warning-foreground"
                                : "bg-primary hover:bg-primary/95 text-primary-foreground"
                          }
                        >
                          {(FOLLOWUP_STATUS_AR as Record<string, string>)[
                            f.status ?? "scheduled"
                          ] || f.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate"
                        title={f.notes ?? ""}
                      >
                        {f.notes || "—"}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="cursor-pointer"
                        >
                          <Link
                            href={`/kf/patients/${f.kfPatientId}`}
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
                        {delConfirm === f.kfFollowupId ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                deleteMut.mutate({
                                  kfFollowupId: f.kfFollowupId,
                                })
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
                            onClick={() => setDelConfirm(f.kfFollowupId)}
                            aria-label="حذف المتابعة"
                            title="حذف المتابعة"
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
