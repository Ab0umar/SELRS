import { useParams, useRoute } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Link } from 'wouter';

export default function EmployeeDetail() {
  const [, params] = useRoute('/attendance/employees/:empCd');
  const empCd = params?.empCd || '';

  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });

  const employeeQuery = (trpc as any).attendance.employeesList.useQuery();
  const dailyQuery = (trpc as any).attendance.dailyByEmployee.useQuery(
    { empCd, ...dateRange },
    { enabled: !!empCd }
  );

  const employee = employeeQuery.data?.employees?.find((e: any) => e.empCd === empCd);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'leave':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'holiday':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!empCd || !employee) {
    return (
      <div className="p-6">
        <Link href="/attendance/employees">
          <a className="flex items-center gap-2 text-blue-600 hover:underline mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </a>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Employee not found or loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link href="/attendance/employees">
        <a className="flex items-center gap-2 text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </a>
      </Link>

      <h1 className="text-3xl font-bold mb-2">{employee.fullName}</h1>
      <p className="text-gray-600 mb-6">Employee Code: {employee.empCd}</p>

      {/* Employee Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Full Name</p>
            <p className="font-semibold">{employee.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Employee Code</p>
            <p className="font-mono font-semibold">{employee.empCd}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Department</p>
            <p className="font-semibold">{employee.department || 'Not Assigned'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${employee.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {employee.active ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">From Date</label>
              <Input
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">To Date</label>
              <Input
                type="date"
                value={dateRange.toDate}
                onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
              />
            </div>
            <Button variant="outline" onClick={() => dailyQuery.refetch()}>
              <Calendar className="w-4 h-4 mr-2" />
              Load
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card>
        <CardContent className="pt-6">
          {dailyQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dailyQuery.isError ? (
            <div className="text-center py-8 text-red-600">
              Error loading attendance history
            </div>
          ) : dailyQuery.data && dailyQuery.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">First In</th>
                    <th className="text-left py-3 px-4 font-semibold">Last Out</th>
                    <th className="text-right py-3 px-4 font-semibold">Worked (min)</th>
                    <th className="text-right py-3 px-4 font-semibold">Late (min)</th>
                    <th className="text-right py-3 px-4 font-semibold">Early (min)</th>
                    <th className="text-right py-3 px-4 font-semibold">OT (min)</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyQuery.data.map((record: any) => (
                    <tr key={record.workDate} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono">{record.workDate}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {record.firstIn ? new Date(record.firstIn).toLocaleTimeString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {record.lastOut ? new Date(record.lastOut).toLocaleTimeString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">{record.workedMinutes ?? 0}</td>
                      <td className="py-3 px-4 text-right">
                        {record.lateMinutes > 0 ? (
                          <span className="text-red-600 font-semibold">{record.lateMinutes}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {record.earlyLeaveMin > 0 ? (
                          <span className="text-orange-600 font-semibold">{record.earlyLeaveMin}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {record.overtimeMinutes > 0 ? (
                          <span className="text-blue-600 font-semibold">{record.overtimeMinutes}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No attendance records found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
