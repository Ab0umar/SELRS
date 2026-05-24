import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function EmployeesList() {
  const [search, setSearch] = useState("");
  const [editingCd, setEditingCd] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<{
    fullName: string;
    department: string;
    salaryType: string;
    active: boolean;
  }>({
    fullName: "",
    department: "",
    salaryType: "",
    active: true,
  });

  const employeesQuery = (trpc as any).attendance.employeesList.useQuery();

  const updateMutation = trpc.attendance.updateEmployee.useMutation({
    onSuccess: () => {
      setEditingCd(null);
      employeesQuery.refetch();
      toast.success("تم التعديل");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteMutation = trpc.attendance.deleteEmployee.useMutation({
    onSuccess: () => {
      employeesQuery.refetch();
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const startEdit = (emp: any) => {
    setEditingCd(emp.empCd);
    setEditRow({
      fullName: emp.fullName,
      department: emp.department ?? "",
      salaryType: emp.salaryType ?? "",
      active: emp.active,
    });
  };

  const filteredEmployees =
    employeesQuery.data?.employees?.filter(
      (emp: any) =>
        emp.empCd.toLowerCase().includes(search.toLowerCase()) ||
        emp.fullName.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">الموظفون</h1>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label htmlFor="attendance-employee-search" className="sr-only">
              بحث الموظفين
            </label>
            <Search
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="attendance-employee-search"
              placeholder="بحث بالكود أو الاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0"
            />
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {filteredEmployees.length} نتيجة
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الموظفون ({employeesQuery.data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {employeesQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : employeesQuery.isError ? (
            <div className="py-8 text-center text-destructive">
              خطأ في تحميل الموظفين.
            </div>
          ) : filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[48rem] w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الكود
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الاسم
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      القسم
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      النوع
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الحالة
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp: any) => {
                    const isEditing = editingCd === emp.empCd;
                    return (
                      <tr
                        key={emp.empCd}
                        className={`border-b ${
                          isEditing ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="py-2 px-4 font-mono text-xs font-semibold">
                          {emp.empCd}
                        </td>
                        {isEditing ? (
                          <>
                            <td className="py-2 px-2">
                              <label
                                htmlFor={`attendance-employee-name-${emp.empCd}`}
                                className="sr-only"
                              >
                                الاسم
                              </label>
                              <input
                                id={`attendance-employee-name-${emp.empCd}`}
                                value={editRow.fullName}
                                onChange={(e) =>
                                  setEditRow({
                                    ...editRow,
                                    fullName: e.target.value,
                                  })
                                }
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <label
                                htmlFor={`attendance-employee-department-${emp.empCd}`}
                                className="sr-only"
                              >
                                القسم
                              </label>
                              <select
                                id={`attendance-employee-department-${emp.empCd}`}
                                value={editRow.department}
                                onChange={(e) =>
                                  setEditRow({
                                    ...editRow,
                                    department: e.target.value,
                                  })
                                }
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              >
                                <option value="">— غير محدد —</option>
                                <option value="مركز">مركز</option>
                                <option value="عيادة">عيادة</option>
                              </select>
                            </td>
                            {editRow.department === "عيادة" && (
                              <td className="py-2 px-2">
                                <label htmlFor={`attendance-employee-stype-${emp.empCd}`} className="sr-only">النوع</label>
                                <select
                                  id={`attendance-employee-stype-${emp.empCd}`}
                                  value={editRow.salaryType}
                                  onChange={(e) => setEditRow({ ...editRow, salaryType: e.target.value })}
                                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                >
                                  <option value="">— النوع —</option>
                                  <option value="استشاري">استشاري</option>
                                  <option value="أخصائي">أخصائي</option>
                                </select>
                              </td>
                            )}
                            <td className="py-2 px-2">
                              <label
                                htmlFor={`attendance-employee-active-${emp.empCd}`}
                                className="sr-only"
                              >
                                الحالة
                              </label>
                              <select
                                id={`attendance-employee-active-${emp.empCd}`}
                                value={editRow.active ? "1" : "0"}
                                onChange={(e) =>
                                  setEditRow({
                                    ...editRow,
                                    active: e.target.value === "1",
                                  })
                                }
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              >
                                <option value="1">نشط</option>
                                <option value="0">غير نشط</option>
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={updateMutation.isPending}
                                  onClick={() =>
                                    updateMutation.mutate({
                                      empCd: emp.empCd,
                                      fullName: editRow.fullName,
                                      department: editRow.department || undefined,
                                      salaryType: editRow.salaryType || undefined,
                                      active: editRow.active,
                                    })
                                  }
                                  aria-label={`حفظ تعديلات ${emp.fullName}`}
                                  className="h-10 w-10 p-0"
                                >
                                  <Check size={15} className="text-success" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingCd(null)}
                                  aria-label={`إلغاء تعديل ${emp.fullName}`}
                                  className="h-10 w-10 p-0"
                                >
                                  <X
                                    size={15}
                                    className="text-muted-foreground"
                                  />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4">
                              <Link href={`/attendance/employees/${emp.empCd}`}>
                                <a className="text-primary hover:underline">
                                  {emp.fullName}
                                </a>
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {emp.department || "—"}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {emp.salaryType || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`rounded px-2 py-1 text-xs font-semibold ${
                                  emp.active
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {emp.active ? "نشط" : "غير نشط"}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(emp)}
                                  aria-label={`تعديل ${emp.fullName}`}
                                  className="h-10 w-10 p-0"
                                >
                                  <Pencil size={15} className="text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`حذف ${emp.fullName}؟`)) {
                                      deleteMutation.mutate({
                                        empCd: emp.empCd,
                                      });
                                    }
                                  }}
                                  aria-label={`حذف ${emp.fullName}`}
                                  className="h-10 w-10 p-0"
                                >
                                  <Trash2
                                    size={15}
                                    className="text-destructive"
                                  />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {search ? "لا يوجد موظفون بهذا البحث." : "لا يوجد موظفون."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
