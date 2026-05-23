import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const BLANK: ShiftForm = {
  name: "",
  startTime: "08:00",
  endTime: "17:00",
  graceLateMin: 15,
  graceEarlyMin: 15,
  allowOT: false,
  breakMinutes: 60,
  requirePunch: true,
};

interface ShiftForm {
  name: string;
  startTime: string;
  endTime: string;
  graceLateMin: number;
  graceEarlyMin: number;
  allowOT: boolean;
  breakMinutes: number;
  requirePunch: boolean;
}

export default function ShiftManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ShiftForm>(BLANK);

  const listShiftsQuery = trpc.attendance.listShifts.useQuery();
  const shifts: any[] = listShiftsQuery.data ?? [];

  const createMut = trpc.attendance.createShift.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setForm(BLANK);
      listShiftsQuery.refetch();
      toast.success("تم إنشاء الوردية");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const updateMut = trpc.attendance.updateShift.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setEditingId(null);
      setForm(BLANK);
      listShiftsQuery.refetch();
      toast.success("تم التعديل");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
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
      allowOT: s.allowOT ?? false,
      breakMinutes: s.breakMinutes,
      requirePunch: s.requirePunch ?? true,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            إعداد الورديات
          </p>
          <h2 className="text-2xl font-bold text-foreground">الورديات</h2>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(BLANK);
            setShowForm(!showForm);
          }}
          className="gap-2"
        >
          <Plus size={16} /> وردية جديدة
        </Button>
      </div>

      {showForm && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold text-foreground">
              {editingId ? "تعديل الوردية" : "وردية جديدة"}
            </h3>
          </div>
          <div className="space-y-5 px-4 py-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  اسم الوردية
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثل: وردية الصباح"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    وقت الحضور
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    وقت الانصراف
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3">
                <input
                  type="checkbox"
                  id="requirePunch"
                  checked={form.requirePunch}
                  onChange={(e) =>
                    setForm({ ...form, requirePunch: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <label
                  htmlFor="requirePunch"
                  className="text-sm font-medium cursor-pointer text-foreground"
                >
                  يجب تسجيل البصمة (حضور وانصراف)
                </label>
                <span className="mr-auto text-xs text-muted-foreground">
                  {form.requirePunch
                    ? "بدون بصمة = غائب"
                    : "بدون بصمة = حاضر تلقائي"}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    سماح التأخير (دقيقة)
                  </label>
                  <input
                    type="number"
                    value={form.graceLateMin}
                    min={0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        graceLateMin: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    سماح المغادرة (دقيقة)
                  </label>
                  <input
                    type="number"
                    value={form.graceEarlyMin}
                    min={0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        graceEarlyMin: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    وقت إضافي
                  </label>
                  <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.allowOT}
                      onChange={(e) => setForm({ ...form, allowOT: e.target.checked })}
                      className="h-4 w-4 accent-primary"
                    />
                    تفعيل الإضافي
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    استراحة (دقيقة)
                  </label>
                  <input
                    type="number"
                    value={form.breakMinutes}
                    min={0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        breakMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                >
                  {editingId ? "حفظ التعديل" : "إنشاء"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold text-foreground">
            قائمة الورديات
          </h3>
        </div>
        <div className="space-y-3 px-4 py-4">
          {shifts.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-border bg-muted/10 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-foreground">
                    {s.name}
                  </h4>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      {s.startTime} ← → {s.endTime}
                    </div>
                    <div>استراحة: {s.breakMinutes} د</div>
                    <div>سماح حضور: {s.graceLateMin} د</div>
                    <div>سماح انصراف: {s.graceEarlyMin} د</div>
                    <div>وقت إضافي: {(s.allowOT ?? false) ? "مفعّل" : "معطّل"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                        (s.requirePunch ?? true)
                          ? "border-warning/30 bg-warning/10 text-foreground"
                          : "border-success/30 bg-success/10 text-success"
                      }`}
                    >
                      {(s.requirePunch ?? true) ? "يجب البصمة" : "حاضر تلقائي"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(s)}
                >
                  <Pencil size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
