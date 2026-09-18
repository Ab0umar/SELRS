import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Cpu, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type EmployeeRow = {
  empCode: string;
  name: string;
  department: string;
  role: string;
};

export function BiometricAttendanceMonitor() {
  const utils = trpc.useUtils();
  const deviceStatusQuery = trpc.attendance.deviceStatus.useQuery(undefined, {
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const employeesQuery = trpc.attendance.employeesList.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const syncMutation = trpc.attendance.syncNow.useMutation({
    onSuccess: async (result) => {
      if (!result.success)
        return toast.error(result.error || "تعذرت مزامنة جهاز البصمة.");
      toast.success(`اكتملت المزامنة: ${result.rowsInserted ?? 0} بصمة جديدة.`);
      await Promise.all([
        deviceStatusQuery.refetch(),
        employeesQuery.refetch(),
        utils.attendance.deviceStatus.invalidate(),
      ]);
    },
    onError: (error) =>
      toast.error(error.message || "تعذرت مزامنة جهاز البصمة."),
  });
  const employees = useMemo<EmployeeRow[]>(() => {
    const list = (employeesQuery.data as { employees?: unknown } | undefined)
      ?.employees;
    if (!Array.isArray(list)) return [];
    return list.slice(0, 8).map((employee: any) => ({
      empCode: String(employee.empCd ?? "—"),
      name: employee.fullName || "غير مسمى",
      department: employee.department || "غير محدد",
      role: employee.jobTitle || "غير محدد",
    }));
  }, [employeesQuery.data]);
  const device = deviceStatusQuery.data;
  const isOnline = Boolean(device?.connected);
  const employeeTotal =
    (employeesQuery.data as { total?: number } | undefined)?.total ??
    employees.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Clock className="h-4 w-4 text-blue-500" aria-hidden="true" />
            مراقبة ومزامنة البصمة الحيوية
          </h2>
          <p className="text-xs text-muted-foreground">
            حالة الجهاز والموظفين تأتي من خدمة الحضور؛ لا تُعرض بيانات تجريبية.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="h-8 text-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {syncMutation.isPending ? "جاري سحب البصمات…" : "بدء مزامنة فورية"}
        </Button>
      </div>
      <Card className="bg-muted/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg border ${isOnline ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-500" : "border-muted-foreground/30 bg-muted text-muted-foreground"}`}
            >
              <Cpu className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  جهاز <bdi dir="ltr">ZK Teco K40</bdi>{" "}
                  {device?.ip && device?.port
                    ? `(${device.ip}:${device.port})`
                    : "(غير مُعد)"}
                </span>
                <Badge
                  variant="outline"
                  className={
                    isOnline
                      ? "border-emerald-500/30 text-emerald-600"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }
                >
                  {isOnline ? "متصل بالشبكة" : "غير متصل"}
                </Badge>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                إجمالي حركات البصمة المسجلة: {device?.punchCount ?? 0} حركة
              </p>
            </div>
          </div>
          <div className="text-center text-xs">
            <span className="block text-[10px] text-muted-foreground">
              موظفو المركز
            </span>
            <span className="font-mono font-bold text-foreground">
              {employeeTotal} موظف
            </span>
          </div>
        </div>
        {deviceStatusQuery.isError && (
          <p
            className="mt-3 border-t border-border pt-3 text-xs text-destructive"
            role="alert"
          >
            تعذر قراءة حالة جهاز البصمة. راجع اتصال الجهاز أو إعداداته.
          </p>
        )}
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table className="text-xs">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>كود</TableHead>
                <TableHead>اسم الموظف</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الوظيفة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.empCode}>
                  <TableCell className="font-mono">
                    #{employee.empCode}
                  </TableCell>
                  <TableCell dir="auto" className="font-medium">
                    {employee.name}
                  </TableCell>
                  <TableCell dir="auto">{employee.department}</TableCell>
                  <TableCell dir="auto">{employee.role}</TableCell>
                </TableRow>
              ))}
              {!employeesQuery.isLoading && employees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    لا توجد بيانات موظفين متاحة.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
