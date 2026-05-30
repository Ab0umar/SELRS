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
  const [activeTab, setActiveTab] = useState<"center" | "clinic">("center");
  const [editingCd, setEditingCd] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<{
    fullName: string;
    department: string;
    salaryType: string;
    attendanceCommissionRate: string;
    active: boolean;
  }>({
    fullName: "",
    department: "",
    salaryType: "",
    attendanceCommissionRate: "",
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
      attendanceCommissionRate: emp.attendanceCommissionRate != null ? String(Math.round(Number(emp.attendanceCommissionRate) * 100)) : "",
      active: emp.active,
    });
  };

  const allEmployees = employeesQuery.data?.employees ?? [];
  
  // Filter by location
  const centerEmployees = allEmployees.filter(
    (emp: any) => emp.department === "مركز" || emp.department === "center"
  );
  
  const clinicEmployees = allEmployees.filter(
    (emp: any) => emp.department === "عيادة" || emp.department === "clinic"
  );

  const displayEmployees = activeTab === "center" ? centerEmployees : clinicEmployees;

  const filteredEmployees = displayEmployees.filter(
    (emp: any) =>
      emp.empCd.toLowerCase().includes(search.toLowerCase()) ||
      emp.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const EmployeeTable = ({ employees, isLoading, isError }: any) => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="py-8 text-center text-destructive">
          خطأ في تحميل الموظفين.
        </div>
      );
    }

    if (employees.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          لا توجد موظفين في هذا القسم
        </div>
      );
    }

    return (
      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-center font-semibold text-foreground w-16">
                الكود
              </th>
              <th className="px-4 py-3 text-right font-semibold text-foreground min-w-max">
                الاسم
              </th>
              <th className="px-4 py-3 text-center font-semibold text-foreground w-16">
                القسم
              </th>
              <th className="px-4 py-3 text-center font-semibold text-foreground w-16">
                النوع
              </th>
              <th className="px-4 py-3 text-center font-semibold text-foreground w-16">
                الحالة
              </th>
              <th className="px-4 py-3 text-center font-semibold text-foreground w-20">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => {
              const isEditing = editingCd === emp.empCd;
              const isClinic = emp.department === "عيادة";
              
              return (
                <tr
                  key={emp.empCd}
                  className={`border-b ${
                    isEditing ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  {/* Code Column (First in RTL) */}
                  <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
                    {emp.empCd}
                  </td>

                  {/* Name Column */}
                  <td className="px-4 py-3 text-right min-w-max">
                    {isEditing ? (
                      <>
                        <label htmlFor={`attendance-employee-name-${emp.empCd}`} className="sr-only">
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
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        />
                      </>
                    ) : (
                      <Link href={`/attendance/employees/${emp.empCd}`}>
                        <a className="text-primary hover:underline font-medium">
                          {emp.fullName}
                        </a>
                      </Link>
                    )}
                  </td>

                  {/* Department Column */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <>
                        <label htmlFor={`attendance-employee-department-${emp.empCd}`} className="sr-only">
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
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="">— غير محدد —</option>
                          <option value="مركز">مركز</option>
                          <option value="عيادة">عيادة</option>
                        </select>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {emp.department || "—"}
                      </span>
                    )}
                  </td>

                  {/* Type Column (Clinic Only) */}
                  <td className="px-4 py-3 text-center">
                    {isEditing && isClinic ? (
                      <>
                        <label htmlFor={`attendance-employee-stype-${emp.empCd}`} className="sr-only">
                          النوع
                        </label>
                        <select
                          id={`attendance-employee-stype-${emp.empCd}`}
                          value={editRow.salaryType}
                          onChange={(e) => setEditRow({ ...editRow, salaryType: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="">— النوع —</option>
                          <option value="استشاري">استشاري</option>
                          <option value="أخصائي">أخصائي</option>
                          <option value="الاثنين">الاثنين</option>
                        </select>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {isClinic ? (editRow.salaryType || emp.salaryType || "—") : "—"}
                      </span>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <>
                        <label htmlFor={`attendance-employee-active-${emp.empCd}`} className="sr-only">
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
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="1">نشط</option>
                          <option value="0">غير نشط</option>
                        </select>
                      </>
                    ) : (
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          emp.active
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {emp.active ? "نشط" : "غير نشط"}
                      </span>
                    )}
                  </td>

                  {/* Actions Column (Last in RTL) */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
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
                              attendanceCommissionRate: editRow.attendanceCommissionRate !== "" ? parseFloat(editRow.attendanceCommissionRate) / 100 : null,
                              active: editRow.active,
                            })
                          }
                          aria-label={`حفظ تعديلات ${emp.fullName}`}
                          className="h-8 w-8 p-0"
                        >
                          <Check size={15} className="text-success" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCd(null)}
                          aria-label={`إلغاء تعديل ${emp.fullName}`}
                          className="h-8 w-8 p-0"
                        >
                          <X size={15} className="text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(emp)}
                          aria-label={`تعديل ${emp.fullName}`}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil size={15} className="text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`هل تريد حذف ${emp.fullName}؟`)) {
                              deleteMutation.mutate({ empCd: emp.empCd });
                            }
                          }}
                          aria-label={`حذف ${emp.fullName}`}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 size={15} className="text-red-600" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الموظفون</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "center" ? "موظفو المركز" : "موظفو العيادة"}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          عدد الموظفين: <span className="font-semibold text-foreground">{displayEmployees.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex gap-1 border-b border-border bg-background/95 px-1 pt-1">
        <button
          onClick={() => setActiveTab("center")}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "center"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          المركز ({centerEmployees.length})
        </button>
        <button
          onClick={() => setActiveTab("clinic")}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "clinic"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          العيادة ({clinicEmployees.length})
        </button>
      </div>

      {/* Search */}
      <Card>
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "center" ? "موظفو المركز" : "موظفو العيادة"} ({displayEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeTable
            employees={filteredEmployees}
            isLoading={employeesQuery.isLoading}
            isError={employeesQuery.isError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
