import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const WEEKDAYS = [
  { bit: 0, label: 'أح', full: 'الأحد' },
  { bit: 1, label: 'إث', full: 'الإثنين' },
  { bit: 2, label: 'ث',  full: 'الثلاثاء' },
  { bit: 3, label: 'أر', full: 'الأربعاء' },
  { bit: 4, label: 'خ',  full: 'الخميس' },
  { bit: 5, label: 'ج',  full: 'الجمعة' },
  { bit: 6, label: 'س',  full: 'السبت' },
];

const BLANK: ShiftForm = {
  name: '',
  startTime: '08:00',
  endTime: '17:00',
  graceLateMin: 15,
  graceEarlyMin: 15,
  breakMinutes: 60,
  weekdayMask: 31, // Sun-Thu (Egypt default)
};

interface ShiftForm {
  name: string;
  startTime: string;
  endTime: string;
  graceLateMin: number;
  graceEarlyMin: number;
  breakMinutes: number;
  weekdayMask: number;
}

function WeekdayPicker({ mask, onChange }: { mask: number; onChange: (m: number) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {WEEKDAYS.map(({ bit, label }) => {
        const active = !!(mask & (1 << bit));
        return (
          <button
            key={bit}
            type="button"
            title={WEEKDAYS[bit].full}
            onClick={() => onChange(mask ^ (1 << bit))}
            className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors ${
              active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function maskLabel(mask: number): string {
  return WEEKDAYS.filter(({ bit }) => mask & (1 << bit)).map(({ label }) => label).join(' ');
}

export default function ShiftManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ShiftForm>(BLANK);

  const listShiftsQuery = trpc.attendance.listShifts.useQuery();
  const shifts: any[] = listShiftsQuery.data ?? [];

  const createMut = trpc.attendance.createShift.useMutation({
    onSuccess: () => { setShowForm(false); setForm(BLANK); listShiftsQuery.refetch(); toast.success('تم إنشاء الوردية'); },
    onError: (e) => toast.error('خطأ: ' + e.message),
  });

  const updateMut = trpc.attendance.updateShift.useMutation({
    onSuccess: () => { setShowForm(false); setEditingId(null); setForm(BLANK); listShiftsQuery.refetch(); toast.success('تم التعديل'); },
    onError: (e) => toast.error('خطأ: ' + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMut.mutate({ id: editingId, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      graceLateMin: s.graceLateMin,
      graceEarlyMin: s.graceEarlyMin,
      breakMinutes: s.breakMinutes,
      weekdayMask: s.weekdayMask ?? 31,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الورديات</h1>
        <Button onClick={() => { setEditingId(null); setForm(BLANK); setShowForm(!showForm); }} className="gap-2">
          <Plus size={16} /> وردية جديدة
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingId ? 'تعديل الوردية' : 'وردية جديدة'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم الوردية</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثل: وردية الصباح" className="w-full px-3 py-2 border rounded-md" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">وقت الحضور</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">وقت الانصراف</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">أيام العمل</label>
                <WeekdayPicker mask={form.weekdayMask} onChange={(m) => setForm({ ...form, weekdayMask: m })} />
                <p className="text-xs text-gray-500 mt-1">الافتراضي: أح-خ (الأحد إلى الخميس)</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">سماح التأخير (دقيقة)</label>
                  <input type="number" value={form.graceLateMin} min={0}
                    onChange={(e) => setForm({ ...form, graceLateMin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">سماح المغادرة (دقيقة)</label>
                  <input type="number" value={form.graceEarlyMin} min={0}
                    onChange={(e) => setForm({ ...form, graceEarlyMin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">استراحة (دقيقة)</label>
                  <input type="number" value={form.breakMinutes} min={0}
                    onChange={(e) => setForm({ ...form, breakMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editingId ? 'حفظ التعديل' : 'إنشاء'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>إلغاء</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {shifts.map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{s.name}</h3>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <div>{s.startTime} ← → {s.endTime}</div>
                    <div className="flex gap-4">
                      <span>استراحة: {s.breakMinutes} د</span>
                      <span>سماح حضور: {s.graceLateMin} د</span>
                      <span>سماح انصراف: {s.graceEarlyMin} د</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {WEEKDAYS.map(({ bit, label }) => (
                        <span key={bit} className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          (s.weekdayMask ?? 31) & (1 << bit)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}>{label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(s)}>
                  <Pencil size={15} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
