import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface AssignmentForm {
  empCd: string;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  weekdayMask?: number;
}

interface Employee {
  empCd: string;
  fullName: string;
  department: string | null;
  active: boolean;
}

export default function ShiftAssignments() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [form, setForm] = useState<AssignmentForm>({
    empCd: '',
    shiftId: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  const listAssignmentsQuery = trpc.attendance.listAssignments.useQuery();
  const listEmployeesQuery = trpc.attendance.employeesList.useQuery();
  const listShiftsQuery = trpc.attendance.listShifts.useQuery();

  useEffect(() => {
    if (listAssignmentsQuery.data) {
      setAssignments(listAssignmentsQuery.data);
    }
  }, [listAssignmentsQuery.data]);

  useEffect(() => {
    if (listEmployeesQuery.data?.employees) {
      setEmployees(listEmployeesQuery.data.employees);
    }
  }, [listEmployeesQuery.data]);

  useEffect(() => {
    if (listShiftsQuery.data) {
      setShifts(listShiftsQuery.data);
    }
  }, [listShiftsQuery.data]);

  const assignShiftMutation = trpc.attendance.assignShift.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setForm({
        empCd: '',
        shiftId: 0,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
      listAssignmentsQuery.refetch();
    },
  });

  const deleteAssignmentMutation = trpc.attendance.deleteAssignment.useMutation({
    onSuccess: () => listAssignmentsQuery.refetch(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    assignShiftMutation.mutate({
      ...form,
      shiftId: parseInt(form.shiftId.toString()),
      weekdayMask: form.weekdayMask || 127,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shift Assignments</h1>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={16} /> Assign Shift
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Shift to Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Employee</label>
                <select
                  value={form.empCd}
                  onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.empCd} value={emp.empCd}>
                      {emp.fullName} ({emp.empCd})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Shift</label>
                <select
                  value={form.shiftId}
                  onChange={(e) => setForm({ ...form, shiftId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select Shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Effective From</label>
                  <input
                    type="date"
                    value={form.effectiveFrom}
                    onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={form.effectiveTo || ''}
                    onChange={(e) => setForm({ ...form, effectiveTo: e.target.value || undefined })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={assignShiftMutation.isPending}>
                  Assign Shift
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium px-4 py-2 bg-gray-100 rounded-md">
          <div className="col-span-2">Employee Code</div>
          <div className="col-span-3">Employee Name</div>
          <div className="col-span-2">Shift</div>
          <div className="col-span-2">From Date</div>
          <div className="col-span-2">To Date</div>
          <div className="col-span-1">Action</div>
        </div>

        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="grid grid-cols-12 gap-4 text-sm px-4 py-3 border rounded-md hover:bg-gray-50"
          >
            <div className="col-span-2 font-mono">{assignment.empCd}</div>
            <div className="col-span-3">{assignment.empName}</div>
            <div className="col-span-2">{assignment.shiftName}</div>
            <div className="col-span-2">{assignment.effectiveFrom}</div>
            <div className="col-span-2">{assignment.effectiveTo || '-'}</div>
            <div className="col-span-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAssignmentMutation.mutate({ id: assignment.id })}
              >
                <Trash2 size={16} className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
