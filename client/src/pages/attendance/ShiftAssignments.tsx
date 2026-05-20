import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AssignmentForm {
  empCd: string;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  weekdayMask?: number;
}

interface BulkForm {
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  weekdayMask: number;
  selectedEmps: string[];
}

const today = new Date().toISOString().split('T')[0];

export default function ShiftAssignments() {
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState<AssignmentForm>({ empCd: '', shiftId: 0, effectiveFrom: today });
  const [bulk, setBulk] = useState<BulkForm>({ shiftId: 0, effectiveFrom: today, weekdayMask: 62, selectedEmps: [] });

  const listAssignmentsQuery = trpc.attendance.listAssignments.useQuery();
  const listEmployeesQuery = trpc.attendance.employeesList.useQuery();
  const listShiftsQuery = trpc.attendance.listShifts.useQuery();

  const employees: any[] = (listEmployeesQuery.data?.employees ?? []) as any;
  const shifts: any[] = (listShiftsQuery.data ?? []) as any;
  const assignments: any[] = (listAssignmentsQuery.data ?? []) as any;

  const assignShiftMutation = trpc.attendance.assignShift.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setForm({ empCd: '', shiftId: 0, effectiveFrom: today });
      listAssignmentsQuery.refetch();
      toast.success('تم تعيين الوردية');
    },
    onError: (e) => toast.error('خطأ: ' + e.message),
  });

  const bulkAssignMutation = trpc.attendance.bulkAssignShift.useMutation({
    onSuccess: (res) => {
      setShowBulk(false);
      setBulk({ shiftId: 0, effectiveFrom: today, weekdayMask: 62, selectedEmps: [] });
      listAssignmentsQuery.refetch();
      toast.success(`تم تعيين الوردية لـ ${res.inserted} موظف`);
    },
    onError: (e) => toast.error('خطأ: ' + e.message),
  });

  const deleteAssignmentMutation = trpc.attendance.deleteAssignment.useMutation({
    onSuccess: () => { listAssignmentsQuery.refetch(); toast.success('تم الحذف'); },
    onError: (e) => toast.error('خطأ: ' + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignShiftMutation.mutate({ ...form, shiftId: parseInt(form.shiftId.toString()), weekdayMask: form.weekdayMask || 127 });
  };

  const toggleEmp = (empCd: string) => {
    setBulk((prev) => ({
      ...prev,
      selectedEmps: prev.selectedEmps.includes(empCd)
        ? prev.selectedEmps.filter((e) => e !== empCd)
        : [...prev.selectedEmps, empCd],
    }));
  };

  const selectAll = () => setBulk((prev) => ({ ...prev, selectedEmps: employees.map((e) => e.empCd) }));
  const clearAll = () => setBulk((prev) => ({ ...prev, selectedEmps: [] }));

  const WEEKDAYS = [
    { bit: 0, label: 'أح' },
    { bit: 1, label: 'إث' },
    { bit: 2, label: 'ث' },
    { bit: 3, label: 'أر' },
    { bit: 4, label: 'خ' },
    { bit: 5, label: 'ج' },
    { bit: 6, label: 'س' },
  ];

  const toggleWeekday = (bit: number, forBulk = false) => {
    const mask = forBulk ? bulk.weekdayMask : (form.weekdayMask ?? 127);
    const newMask = mask ^ (1 << bit);
    if (forBulk) setBulk((prev) => ({ ...prev, weekdayMask: newMask }));
    else setForm((prev) => ({ ...prev, weekdayMask: newMask }));
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">تعيين الورديات</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowBulk(!showBulk); setShowForm(false); }} className="gap-2">
            <Users size={16} /> تعيين جماعي
          </Button>
          <Button onClick={() => { setShowForm(!showForm); setShowBulk(false); }} className="gap-2">
            <Plus size={16} /> تعيين فردي
          </Button>
        </div>
      </div>

      {/* Single assign form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>تعيين وردية لموظف</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الموظف</label>
                  <select value={form.empCd} onChange={(e) => setForm({ ...form, empCd: e.target.value })} className="w-full px-3 py-2 border rounded-md" required>
                    <option value="">اختر موظف</option>
                    {employees.map((emp) => <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الوردية</label>
                  <select value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" required>
                    <option value="">اختر وردية</option>
                    {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">من تاريخ</label>
                  <input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">حتى تاريخ (اختياري)</label>
                  <input type="date" value={form.effectiveTo || ''} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value || undefined })} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">أيام العمل</label>
                <div className="flex gap-2">
                  {WEEKDAYS.map(({ bit, label }) => (
                    <button key={bit} type="button" onClick={() => toggleWeekday(bit)} className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors ${(form.weekdayMask ?? 127) & (1 << bit) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={assignShiftMutation.isPending}>حفظ</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bulk assign form */}
      {showBulk && (
        <Card>
          <CardHeader><CardTitle>تعيين وردية جماعي</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الوردية</label>
                <select value={bulk.shiftId} onChange={(e) => setBulk({ ...bulk, shiftId: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md">
                  <option value="">اختر وردية</option>
                  {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">من تاريخ</label>
                <input type="date" value={bulk.effectiveFrom} onChange={(e) => setBulk({ ...bulk, effectiveFrom: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">أيام العمل</label>
              <div className="flex gap-2">
                {WEEKDAYS.map(({ bit, label }) => (
                  <button key={bit} type="button" onClick={() => toggleWeekday(bit, true)} className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors ${bulk.weekdayMask & (1 << bit) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">أح=أحد، إث=إثنين، ث=ثلاثاء، أر=أربعاء، خ=خميس، ج=جمعة، س=سبت. افتراضي: إث-ج</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">اختر الموظفين ({bulk.selectedEmps.length} مختار)</label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAll}>تحديد الكل</Button>
                  <Button size="sm" variant="outline" onClick={clearAll}>إلغاء الكل</Button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                {employees.map((emp) => (
                  <label key={emp.empCd} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={bulk.selectedEmps.includes(emp.empCd)} onChange={() => toggleEmp(emp.empCd)} />
                    <span className="font-mono text-xs text-gray-500">{emp.empCd}</span>
                    <span className="text-sm">{emp.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => bulkAssignMutation.mutate({ empCds: bulk.selectedEmps, shiftId: bulk.shiftId, effectiveFrom: bulk.effectiveFrom, weekdayMask: bulk.weekdayMask })} disabled={!bulk.shiftId || !bulk.selectedEmps.length || bulkAssignMutation.isPending}>
                {bulkAssignMutation.isPending ? 'جاري التعيين...' : `تعيين ${bulk.selectedEmps.length} موظف`}
              </Button>
              <Button variant="outline" onClick={() => setShowBulk(false)}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments list */}
      <Card>
        <CardHeader><CardTitle>التعيينات الحالية ({assignments.length})</CardTitle></CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد تعيينات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right py-3 px-4">الكود</th>
                    <th className="text-right py-3 px-4">الاسم</th>
                    <th className="text-right py-3 px-4">الوردية</th>
                    <th className="text-right py-3 px-4">من</th>
                    <th className="text-right py-3 px-4">حتى</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a: any) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-mono text-xs">{a.empCd}</td>
                      <td className="py-2 px-4">{a.empName}</td>
                      <td className="py-2 px-4">{a.shiftName}</td>
                      <td className="py-2 px-4">{a.effectiveFrom}</td>
                      <td className="py-2 px-4">{a.effectiveTo ?? '—'}</td>
                      <td className="py-2 px-4">
                        <Button variant="ghost" size="sm" onClick={() => deleteAssignmentMutation.mutate({ id: a.id })}>
                          <Trash2 size={15} className="text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
