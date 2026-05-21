import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeesList() {
  const [search, setSearch] = useState('');
  const [editingCd, setEditingCd] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<{ fullName: string; department: string; active: boolean }>({ fullName: '', department: '', active: true });

  const employeesQuery = (trpc as any).attendance.employeesList.useQuery();

  const updateMutation = trpc.attendance.updateEmployee.useMutation({
    onSuccess: () => { setEditingCd(null); employeesQuery.refetch(); toast.success('تم التعديل'); },
    onError: (e: any) => toast.error('خطأ: ' + e.message),
  });

  const deleteMutation = trpc.attendance.deleteEmployee.useMutation({
    onSuccess: () => { employeesQuery.refetch(); toast.success('تم الحذف'); },
    onError: (e: any) => toast.error('خطأ: ' + e.message),
  });

  const startEdit = (emp: any) => {
    setEditingCd(emp.empCd);
    setEditRow({ fullName: emp.fullName, department: emp.department ?? '', active: emp.active });
  };

  const filteredEmployees = employeesQuery.data?.employees?.filter(
    (emp: any) =>
      emp.empCd.toLowerCase().includes(search.toLowerCase()) ||
      emp.fullName.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">الموظفون</h1>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex gap-2 items-center">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="بحث بالكود أو الاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">{filteredEmployees.length} نتيجة</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الموظفون ({employeesQuery.data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {employeesQuery.isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : employeesQuery.isError ? (
            <div className="text-center py-8 text-red-600">خطأ في تحميل الموظفين.</div>
          ) : filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold">الكود</th>
                    <th className="text-right py-3 px-4 font-semibold">الاسم</th>
                    <th className="text-right py-3 px-4 font-semibold">القسم</th>
                    <th className="text-right py-3 px-4 font-semibold">الحالة</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp: any) => {
                    const isEditing = editingCd === emp.empCd;
                    return (
                      <tr key={emp.empCd} className={`border-b ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-2 px-4 font-mono font-semibold text-xs">{emp.empCd}</td>
                        {isEditing ? (
                          <>
                            <td className="py-2 px-2">
                              <input value={editRow.fullName} onChange={(e) => setEditRow({ ...editRow, fullName: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-sm" />
                            </td>
                            <td className="py-2 px-2">
                              <input value={editRow.department} onChange={(e) => setEditRow({ ...editRow, department: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-sm" placeholder="القسم" />
                            </td>
                            <td className="py-2 px-2">
                              <select value={editRow.active ? '1' : '0'} onChange={(e) => setEditRow({ ...editRow, active: e.target.value === '1' })}
                                className="px-2 py-1 border rounded text-sm">
                                <option value="1">نشط</option>
                                <option value="0">غير نشط</option>
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" disabled={updateMutation.isPending}
                                  onClick={() => updateMutation.mutate({ empCd: emp.empCd, ...editRow, department: editRow.department || undefined })}>
                                  <Check size={15} className="text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingCd(null)}>
                                  <X size={15} className="text-gray-500" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4">
                              <Link href={`/attendance/employees/${emp.empCd}`}>
                                <a className="text-blue-600 hover:underline">{emp.fullName}</a>
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{emp.department || '—'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${emp.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                {emp.active ? 'نشط' : 'غير نشط'}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => startEdit(emp)}>
                                  <Pencil size={15} className="text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="sm"
                                  onClick={() => { if (confirm(`حذف ${emp.fullName}؟`)) deleteMutation.mutate({ empCd: emp.empCd }); }}>
                                  <Trash2 size={15} className="text-red-500" />
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
            <div className="text-center py-8 text-gray-500">
              {search ? 'لا يوجد موظفون بهذا البحث.' : 'لا يوجد موظفون.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
