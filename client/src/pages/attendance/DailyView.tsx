import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';

export default function DailyView() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const dailyQuery = (trpc as any).attendance.dailyByDate.useQuery(
    { date },
    { enabled: !!date }
  );

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Daily Attendance</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2 items-center">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance for {new Date(date + 'T00:00:00').toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dailyQuery.isError ? (
            <div className="text-center py-8 text-red-600">
              Error loading daily records. {(dailyQuery.error as any)?.message}
            </div>
          ) : dailyQuery.data && dailyQuery.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold">Employee</th>
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
                    <tr key={record.empCd} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono font-semibold">{record.empCd}</td>
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
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No attendance records for this date.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
