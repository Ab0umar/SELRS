import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Download } from 'lucide-react';

export default function DailyView() {
  const today = new Date().toISOString().split('T')[0];
  const [dates, setDates] = useState({
    from: today,
    to: today,
  });
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLoadRange = async () => {
    if (!dates.from || !dates.to) return;

    setLoading(true);
    const fromDate = new Date(dates.from);
    const toDate = new Date(dates.to);
    let allRecords: any[] = [];

    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      try {
        const response = await (trpc as any).attendance.dailyByDate.fetch({ date: dateStr });
        allRecords = [...allRecords, ...response];
      } catch (e) {
        console.error(`Failed to load ${dateStr}:`, e);
      }
    }

    setRecords(allRecords);
    setLoading(false);
  };

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

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      present: 'حاضر',
      absent: 'غائب',
      leave: 'إجازة',
      partial: 'جزئي',
      holiday: 'عطلة',
      missing_checkout: 'لم يسجل الخروج',
    };
    return labels[status] || status;
  };

  const handleExportCSV = () => {
    if (!records || records.length === 0) return;

    const headers = ['كود الموظف', 'تاريخ العمل', 'الحضور', 'المغادرة', 'الحالة', 'التأخير', 'المغادرة المبكرة'];
    const csv = [
      headers.join(','),
      ...records.map((row) =>
        [
          row.empCd,
          row.workDate,
          row.firstIn ? new Date(row.firstIn).toLocaleTimeString('ar-EG') : '-',
          row.lastOut ? new Date(row.lastOut).toLocaleTimeString('ar-EG') : '-',
          getStatusLabel(row.status),
          row.lateMinutes || 0,
          row.earlyLeaveMin || 0,
        ]
          .map((v) => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-attendance-${dates.from}-to-${dates.to}.csv`);
    link.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">الحضور اليومي</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>اختيار الفترة الزمنية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-row-reverse">
            <Button
              onClick={handleLoadRange}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? 'جاري التحميل...' : 'تحميل الفترة'}
            </Button>
            <div>
              <label className="block text-sm font-medium mb-1">إلى</label>
              <input
                type="date"
                value={dates.to}
                onChange={(e) => setDates({ ...dates, to: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">من</label>
              <input
                type="date"
                value={dates.from}
                onChange={(e) => setDates({ ...dates, from: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <Calendar className="w-5 h-5 text-gray-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              الحضور من {dates.from} إلى {dates.to}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              تصدير
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : records && records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold">الحالة</th>
                    <th className="text-right py-3 px-4 font-semibold">الساعات الإضافية</th>
                    <th className="text-right py-3 px-4 font-semibold">المغادرة المبكرة</th>
                    <th className="text-right py-3 px-4 font-semibold">التأخير (دقيقة)</th>
                    <th className="text-right py-3 px-4 font-semibold">وقت المغادرة</th>
                    <th className="text-right py-3 px-4 font-semibold">وقت الحضور</th>
                    <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
                    <th className="text-right py-3 px-4 font-semibold">الموظف</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {getStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {record.overtimeMinutes > 0 ? (
                          <span className="text-blue-600 font-semibold">{record.overtimeMinutes}</span>
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
                        {record.lateMinutes > 0 ? (
                          <span className="text-red-600 font-semibold">{record.lateMinutes}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {record.lastOut ? new Date(record.lastOut).toLocaleTimeString('ar-EG') : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {record.firstIn ? new Date(record.firstIn).toLocaleTimeString('ar-EG') : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{record.workDate}</td>
                      <td className="py-3 px-4 font-mono font-semibold">{record.empCd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">لا توجد سجلات حضور</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
