import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit2 } from 'lucide-react';

interface ShiftForm {
  name: string;
  startTime: string;
  endTime: string;
  graceLateMin: number;
  graceEarlyMin: number;
  breakMinutes: number;
}

export default function ShiftManagement() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ShiftForm>({
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    graceLateMin: 15,
    graceEarlyMin: 15,
    breakMinutes: 60,
  });

  const listShiftsQuery = trpc.attendance.listShifts.useQuery();

  useEffect(() => {
    if (listShiftsQuery.data) {
      setShifts(listShiftsQuery.data);
    }
  }, [listShiftsQuery.data]);

  const createShiftMutation = trpc.attendance.createShift.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setForm({
        name: '',
        startTime: '08:00',
        endTime: '17:00',
        graceLateMin: 15,
        graceEarlyMin: 15,
        breakMinutes: 60,
      });
      listShiftsQuery.refetch();
    },
  });

  const updateShiftMutation = trpc.attendance.updateShift.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setShowForm(false);
      listShiftsQuery.refetch();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateShiftMutation.mutate({ id: editingId, ...form });
    } else {
      createShiftMutation.mutate(form);
    }
  };

  const handleEdit = (shift: any) => {
    setEditingId(shift.id);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceLateMin: shift.graceLateMin,
      graceEarlyMin: shift.graceEarlyMin,
      breakMinutes: shift.breakMinutes,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shift Management</h1>
        <Button
          onClick={() => {
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="gap-2"
        >
          <Plus size={16} /> Add Shift
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Shift' : 'New Shift'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Shift Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Morning Shift"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Time (HH:mm)</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Time (HH:mm)</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Grace Late (min)</label>
                  <input
                    type="number"
                    value={form.graceLateMin}
                    onChange={(e) => setForm({ ...form, graceLateMin: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Grace Early (min)</label>
                  <input
                    type="number"
                    value={form.graceEarlyMin}
                    onChange={(e) => setForm({ ...form, graceEarlyMin: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Break (min)</label>
                  <input
                    type="number"
                    value={form.breakMinutes}
                    onChange={(e) => setForm({ ...form, breakMinutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createShiftMutation.isPending || updateShiftMutation.isPending}>
                  {editingId ? 'Update' : 'Create'} Shift
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {shifts.map((shift) => (
          <Card key={shift.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{shift.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>Time: {shift.startTime} - {shift.endTime}</div>
                    <div>Break: {shift.breakMinutes} min</div>
                    <div>Grace Late: {shift.graceLateMin} min</div>
                    <div>Grace Early: {shift.graceEarlyMin} min</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(shift)}
                  >
                    <Edit2 size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
