import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

export default function EmployeesList() {
  const [search, setSearch] = useState('');

  const employeesQuery = (trpc as any).attendance.employeesList.useQuery();

  const filteredEmployees = employeesQuery.data?.employees?.filter(
    (emp: any) =>
      emp.empCd.toLowerCase().includes(search.toLowerCase()) ||
      emp.fullName.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Employees</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search by employee code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <div className="flex items-center text-sm text-gray-500">
              <Search className="w-4 h-4 mr-2" />
              {filteredEmployees.length} results
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Employees ({employeesQuery.data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {employeesQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : employeesQuery.isError ? (
            <div className="text-center py-8 text-red-600">
              Error loading employees. {(employeesQuery.error as any)?.message}
            </div>
          ) : filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold">الكود</th>
                    <th className="text-right py-3 px-4 font-semibold">الاسم</th>
                    <th className="text-right py-3 px-4 font-semibold">القسم</th>
                    <th className="text-right py-3 px-4 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp: any) => (
                    <tr key={emp.empCd} className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="py-3 px-4 font-mono font-semibold">{emp.empCd}</td>
                      <td className="py-3 px-4">
                        <Link href={`/attendance/employees/${emp.empCd}`}>
                          <a className="text-blue-600 hover:underline">{emp.fullName}</a>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{emp.department || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            emp.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {emp.active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {search ? 'No employees found matching your search.' : 'No employees yet.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
