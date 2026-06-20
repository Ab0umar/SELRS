import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface ShiftForm {
  name: string;
  startTime: string;
  endTime: string;
  graceLateMin: number;
  graceEarlyMin: number;
  allowOT: boolean;
  otMinMinutes: number;
  otMaxMinutes: number;
  breakMinutes: number;
  requirePunch: boolean;
  isFlexible: boolean;
  flexInFrom: string;
  flexInTo: string;
  flexOutFrom: string;
  flexOutTo: string;
  shiftSize: "big" | "small" | "auto";
  autoSmallThresholdMin: number;
}

const BLANK: ShiftForm = {
  name: "",
  startTime: "08:00",
  endTime: "17:00",
  graceLateMin: 15,
  graceEarlyMin: 15,
  allowOT: false,
  otMinMinutes: 0,
  otMaxMinutes: 0,
  breakMinutes: 60,
  requirePunch: true,
  isFlexible: false,
  flexInFrom: "08:00",
  flexInTo: "09:00",
  flexOutFrom: "16:00",
  flexOutTo: "17:00",
  shiftSize: "auto",
  autoSmallThresholdMin: 270,
};

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
    const payload = {
      ...form,
      flexInFrom: form.isFlexible ? form.flexInFrom || null : null,
      flexInTo: form.isFlexible ? form.flexInTo || null : null,
      flexOutFrom: form.isFlexible ? form.flexOutFrom || null : null,
      flexOutTo: form.isFlexible ? form.flexOutTo || null : null,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
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
      otMinMinutes: s.otMinMinutes ?? 0,
      otMaxMinutes: s.otMaxMinutes ?? 0,
      breakMinutes: s.breakMinutes,
      requirePunch: s.requirePunch ?? true,
      isFlexible: s.isFlexible ?? false,
      flexInFrom: s.flexInFrom ?? "08:00",
      flexInTo: s.flexInTo ?? "09:00",
      flexOutFrom: s.flexOutFrom ?? "16:00",
      flexOutTo: s.flexOutTo ?? "17:00",
      shiftSize: s.shiftSize ?? "auto",
      autoSmallThresholdMin: s.autoSmallThresholdMin ?? 270,
    });
    setShowForm(true);
  };

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20";

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
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  اسم الوردية
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثل: وردية الصباح"
                  className={inputClass}
                  required
                />
              </div>

              {/* Flexible toggle */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3">
                <input
                  type="checkbox"
                  id="isFlexible"
                  checked={form.isFlexible}
                  onChange={(e) =>
                    setForm({ ...form, isFlexible: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <label
                  htmlFor="isFlexible"
                  className="text-sm font-medium cursor-pointer text-foreground"
                >
                  وردية مرنة (نافذة حضور وانصراف)
                </label>
                <span className="mr-auto text-xs text-muted-foreground">
                  {form.isFlexible
                    ? "يُحسب التأخير بعد نهاية نافذة الحضور"
                    : "وقت ثابت للحضور والانصراف"}
                </span>
              </div>

              {/* Times */}
              {form.isFlexible ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    نافذة الحضور
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        من (أبكر وقت حضور)
                      </label>
                      <input
                        type="time"
                        value={form.flexInFrom}
                        onChange={(e) =>
                          setForm({ ...form, flexInFrom: e.target.value })
                        }
                        className={inputClass}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        إلى (آخر وقت بدون تأخير)
                      </label>
                      <input
                        type="time"
                        value={form.flexInTo}
                        onChange={(e) =>
                          setForm({ ...form, flexInTo: e.target.value })
                        }
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    نافذة الانصراف
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        من (أبكر انصراف بدون خصم)
                      </label>
                      <input
                        type="time"
                        value={form.flexOutFrom}
                        onChange={(e) =>
                          setForm({ ...form, flexOutFrom: e.target.value })
                        }
                        className={inputClass}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        إلى (آخر وقت انصراف)
                      </label>
                      <input
                        type="time"
                        value={form.flexOutTo}
                        onChange={(e) =>
                          setForm({ ...form, flexOutTo: e.target.value })
                        }
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
                      className={inputClass}
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
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Require punch */}
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

              {/* Grace / OT / Break — hidden for flexible (windows replace grace) */}
              {!form.isFlexible && (
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
                      className={inputClass}
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
                      className={inputClass}
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
                        onChange={(e) =>
                          setForm({ ...form, allowOT: e.target.checked })
                        }
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
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* OT thresholds — shown only when allowOT is enabled */}
              {form.allowOT && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      الحد الأدنى للإضافي (دقيقة)
                    </label>
                    <p className="text-xs text-muted-foreground">لا يُحسب الإضافي إلا إذا تجاوز هذا الحد — 0 يعني أي دقيقة تُحسب</p>
                    <input
                      type="number"
                      value={form.otMinMinutes}
                      min={0}
                      onChange={(e) =>
                        setForm({ ...form, otMinMinutes: parseInt(e.target.value) || 0 })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      الحد الأقصى للإضافي (دقيقة)
                    </label>
                    <p className="text-xs text-muted-foreground">أقصى ساعات إضافي تُحسب في اليوم — 0 يعني بلا حد</p>
                    <input
                      type="number"
                      value={form.otMaxMinutes}
                      min={0}
                      onChange={(e) =>
                        setForm({ ...form, otMaxMinutes: parseInt(e.target.value) || 0 })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {form.isFlexible && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      وقت إضافي
                    </label>
                    <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.allowOT}
                        onChange={(e) =>
                          setForm({ ...form, allowOT: e.target.checked })
                        }
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
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* Shift size classification */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">نوع الشفت (للأجر)</label>
                  <select
                    value={form.shiftSize}
                    onChange={(e) => setForm({ ...form, shiftSize: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="auto">أوتو (حسب المدة)</option>
                    <option value="big">شفت كبير دائماً</option>
                    <option value="small">شفت صغير دائماً</option>
                  </select>
                </div>
                {form.shiftSize === "auto" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">حد الشفت الصغير (دقيقة)</label>
                    <p className="text-xs text-muted-foreground">شفت أقل من هذه المدة = صغير — الافتراضي 270 د (4.5 ساعة)</p>
                    <input
                      type="number"
                      value={form.autoSmallThresholdMin}
                      min={0}
                      onChange={(e) => setForm({ ...form, autoSmallThresholdMin: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                )}
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
                    {s.isFlexible ? (
                      <>
                        <div>حضور: {s.flexInFrom} ← {s.flexInTo}</div>
                        <div>انصراف: {s.flexOutFrom} ← {s.flexOutTo}</div>
                      </>
                    ) : (
                      <div>{s.startTime} ← → {s.endTime}</div>
                    )}
                    <div>استراحة: {s.breakMinutes} د</div>
                    {!s.isFlexible && (
                      <>
                        <div>سماح حضور: {s.graceLateMin} د</div>
                        <div>سماح انصراف: {s.graceEarlyMin} د</div>
                      </>
                    )}
                    <div>
                      وقت إضافي: {(s.allowOT ?? false) ? "مفعّل" : "معطّل"}
                      {s.allowOT && (s.otMinMinutes > 0 || s.otMaxMinutes > 0) && (
                        <span className="mr-1 text-muted-foreground">
                          ({s.otMinMinutes > 0 ? `من ${s.otMinMinutes}د` : ""}
                          {s.otMinMinutes > 0 && s.otMaxMinutes > 0 ? " " : ""}
                          {s.otMaxMinutes > 0 ? `حتى ${s.otMaxMinutes}د` : ""})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.isFlexible && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        مرنة
                      </span>
                    )}
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
