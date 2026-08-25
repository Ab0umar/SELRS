import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Clock,
  Coffee,
  Hourglass,
  Sparkles,
  Calculator,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

interface ShiftForm {
  name: string;
  branch: "operations" | "center";
  deviceId: string;
  startTime: string;
  endTime: string;
  graceLateMin: number;
  graceEarlyMin: number;
  allowOT: boolean;
  allowOTIn: boolean;
  allowOTOut: boolean;
  otMinMinutes: number;
  otMinInMinutes: number;
  otMinOutMinutes: number;
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
  branch: "center",
  deviceId: "",
  startTime: "08:00",
  endTime: "17:00",
  graceLateMin: 15,
  graceEarlyMin: 15,
  allowOT: false,
  allowOTIn: false,
  allowOTOut: false,
  otMinMinutes: 0,
  otMinInMinutes: 0,
  otMinOutMinutes: 0,
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
      branch: s.branch ?? "center",
      deviceId: s.deviceId ?? "",
      startTime: s.startTime,
      endTime: s.endTime,
      graceLateMin: s.graceLateMin,
      graceEarlyMin: s.graceEarlyMin,
      allowOT: s.allowOT ?? false,
      allowOTIn: s.allowOTIn ?? s.allowOT ?? false,
      allowOTOut: s.allowOTOut ?? s.allowOT ?? false,
      otMinMinutes: s.otMinMinutes ?? 0,
      otMinInMinutes: s.otMinInMinutes ?? s.otMinMinutes ?? 0,
      otMinOutMinutes: s.otMinOutMinutes ?? s.otMinMinutes ?? 0,
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
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">تعريف الورديات وقواعد العمل اليومي</h2>
          <p className="text-xs text-muted-foreground">تحديد مواعيد الورديات الثابتة والمرنة، فترات الاستراحة، وقواعد الأجر الإضافي للمركز</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(BLANK);
            setShowForm(!showForm);
          }}
          className="gap-2 rounded-xl cursor-pointer"
        >
          <Plus size={16} /> إضافة وردية جديدة
        </Button>
      </div>

      {/* Drawer slide-over for Shift editing */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end print:hidden animate-in fade-in duration-200" role="dialog" aria-modal="true">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
          {/* Drawer container */}
          <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pl-10 sm:pl-16">
            <div className="pointer-events-auto w-screen max-w-md transform bg-card shadow-2xl transition-transform duration-300 ease-in-out border-r border-border flex flex-col h-full animate-in slide-in-from-left">
              
              {/* Header */}
              <div className="border-b border-border/50 px-6 py-4 flex items-center justify-between bg-muted/10">
                <h3 className="text-sm font-bold text-foreground">
                  {editingId ? `تعديل الوردية: ${form.name}` : "تعريف وردية جديدة"}
                </h3>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/5 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-primary border-b border-border pb-1">البيانات الأساسية</h4>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-foreground">اسم الوردية</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="مثال: الوردية الصباحية (مركز)"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-foreground">الفرع</label>
                      <select
                        value={form.branch}
                        onChange={(e) => setForm({ ...form, branch: e.target.value as ShiftForm["branch"] })}
                        className={inputClass}
                        required
                      >
                        <option value="operations">العمليات</option>
                        <option value="center">المركز</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-foreground">معرّف جهاز البصمة</label>
                      <input
                        type="text"
                        value={form.deviceId}
                        onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                        placeholder="مثل zk_192.168.1.10"
                        className={inputClass}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-foreground">نوع الشفت للأجر</label>
                      <select
                        value={form.shiftSize}
                        onChange={(e) => setForm({ ...form, shiftSize: e.target.value as any })}
                        className={inputClass}
                      >
                        <option value="auto">تلقائي (حسب المدة)</option>
                        <option value="big">شفت كامل دائماً</option>
                        <option value="small">نصف شفت دائماً</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-foreground">الاستراحة (دقيقة)</label>
                      <input
                        type="number"
                        value={form.breakMinutes}
                        min={0}
                        onChange={(e) => setForm({ ...form, breakMinutes: parseInt(e.target.value) || 0 })}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {form.shiftSize === "auto" && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <label className="block text-xs font-semibold text-foreground">حد الشفت القصير (دقيقة)</label>
                      <input
                        type="number"
                        value={form.autoSmallThresholdMin}
                        min={0}
                        onChange={(e) => setForm({ ...form, autoSmallThresholdMin: parseInt(e.target.value) || 0 })}
                        className={inputClass}
                      />
                      <span className="text-[10px] text-muted-foreground block">
                        أي شفت تقل مدته عن هذا الحد يُحتسب تلقائياً كشفت صغير (الافتراضي 270 دقيقة = 4.5 ساعة).
                      </span>
                    </div>
                  )}

                  {/* Status Toggles */}
                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isFlexible}
                        onChange={(e) => setForm({ ...form, isFlexible: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">تفعيل الوردية المرنة</span>
                        <span className="text-[10px] text-muted-foreground">تحديد نافذة زمنية مرنة للحضور والانصراف بدلاً من أوقات ثابتة</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.requirePunch}
                        onChange={(e) => setForm({ ...form, requirePunch: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">إلزامية البصمة</span>
                        <span className="text-[10px] text-muted-foreground">يعتبر غائباً تلقائياً في حال عدم تسجيل بصمة حضور وانصراف</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Clock Configuration */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-primary border-b border-border pb-1">مواعيد التوقيت وقواعد التأخير</h4>
                  
                  {form.isFlexible ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-3">
                        <span className="text-[11px] font-bold text-foreground block">نافذة حضور الموظفين</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] text-muted-foreground">أبكر حضور</label>
                            <input
                              type="time"
                              value={form.flexInFrom}
                              onChange={(e) => setForm({ ...form, flexInFrom: e.target.value })}
                              className={inputClass}
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] text-muted-foreground">آخر موعد دخول</label>
                            <input
                              type="time"
                              value={form.flexInTo}
                              onChange={(e) => setForm({ ...form, flexInTo: e.target.value })}
                              className={inputClass}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-3">
                        <span className="text-[11px] font-bold text-foreground block">نافذة انصراف الموظفين</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] text-muted-foreground">أبكر انصراف مسموح</label>
                            <input
                              type="time"
                              value={form.flexOutFrom}
                              onChange={(e) => setForm({ ...form, flexOutFrom: e.target.value })}
                              className={inputClass}
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] text-muted-foreground">أقصى موعد خروج</label>
                            <input
                              type="time"
                              value={form.flexOutTo}
                              onChange={(e) => setForm({ ...form, flexOutTo: e.target.value })}
                              className={inputClass}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-foreground">وقت الحضور الفعلي</label>
                          <input
                            type="time"
                            value={form.startTime}
                            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                            className={inputClass}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-foreground">وقت الانصراف الفعلي</label>
                          <input
                            type="time"
                            value={form.endTime}
                            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                            className={inputClass}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-foreground">سماح التأخير (دقيقة)</label>
                          <input
                            type="number"
                            value={form.graceLateMin}
                            min={0}
                            onChange={(e) => setForm({ ...form, graceLateMin: parseInt(e.target.value) || 0 })}
                            className={inputClass}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-foreground">سماح الخروج المبكر (دقيقة)</label>
                          <input
                            type="number"
                            value={form.graceEarlyMin}
                            min={0}
                            onChange={(e) => setForm({ ...form, graceEarlyMin: parseInt(e.target.value) || 0 })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overtime settings */}
                  <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.allowOTIn}
                        onChange={(e) => setForm({ ...form, allowOTIn: e.target.checked, allowOT: e.target.checked || form.allowOTOut })}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-xs font-bold text-foreground">احتساب إضافي الحضور</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.allowOTOut}
                        onChange={(e) => setForm({ ...form, allowOTOut: e.target.checked, allowOT: form.allowOTIn || e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-xs font-bold text-foreground">احتساب إضافي الانصراف</span>
                    </label>
                    </div>

                    {(form.allowOTIn || form.allowOTOut) && (
                      <div className="grid gap-3 pt-2 animate-in fade-in duration-200 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-muted-foreground">الحد الأدنى لإضافي الحضور</label>
                          <input
                            type="number"
                            value={form.otMinInMinutes}
                            min={0}
                            onChange={(e) => setForm({ ...form, otMinInMinutes: parseInt(e.target.value) || 0 })}
                            className={inputClass}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] text-muted-foreground">الحد الأدنى لإضافي الانصراف</label>
                          <input
                            type="number"
                            value={form.otMinOutMinutes}
                            min={0}
                            onChange={(e) => setForm({ ...form, otMinOutMinutes: parseInt(e.target.value) || 0 })}
                            className={inputClass}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] text-muted-foreground">الحد الأقصى لإجمالي الاثنين</label>
                          <input
                            type="number"
                            value={form.otMaxMinutes}
                            min={0}
                            onChange={(e) => setForm({ ...form, otMaxMinutes: parseInt(e.target.value) || 0 })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer Button Actions */}
                <div className="flex gap-2 pt-4 border-t border-border/40 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl cursor-pointer"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMut.isPending || updateMut.isPending}
                    className="rounded-xl cursor-pointer"
                  >
                    {editingId ? "حفظ التعديلات" : "إضافة الوردية"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Shifts Grid Cards View */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4.5 w-4.5 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">قائمة الورديات النشطة بالمركز</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {shifts.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow duration-200 relative overflow-hidden group"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2.5">
                  <div>
                    <h4 className="text-sm font-black text-foreground">{s.name}</h4>
                    <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">رمز الوردية: #{s.id}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      s.isFlexible 
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                        : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                    }`}>
                      {s.isFlexible ? "مرنة" : "ثابتة"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      (s.requirePunch ?? true)
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}>
                      {(s.requirePunch ?? true) ? "يجب البصمة" : "حضور تلقائي"}
                    </span>
                  </div>
                </div>

                {/* Details List */}
                <div className="space-y-2 text-xs">
                  {/* Clock time */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                    <span className="font-semibold text-foreground/80">نافذة الدوام:</span>
                    <span className="font-bold text-foreground font-mono">
                      {s.isFlexible ? `${s.flexInFrom} - ${s.flexInTo} ← ${s.flexOutFrom} - ${s.flexOutTo}` : `${s.startTime} إلى ${s.endTime}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Settings2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                    <span className="font-semibold text-foreground/80">الفرع والجهاز:</span>
                    <span className="font-bold text-foreground">
                      {s.branch === "operations" ? "العمليات" : s.branch === "center" ? "المركز" : "غير محدد"}
                      {s.deviceId ? ` · ${s.deviceId}` : ""}
                    </span>
                  </div>

                  {/* Break time */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coffee className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                    <span className="font-semibold text-foreground/80">مدة الاستراحة:</span>
                    <span className="font-bold text-foreground font-mono">{s.breakMinutes} دقيقة</span>
                  </div>

                  {/* Grace rules (only for fixed) */}
                  {!s.isFlexible && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hourglass className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                      <span className="font-semibold text-foreground/80">سماح التأخير:</span>
                      <span className="font-bold text-foreground font-mono">{s.graceLateMin} د / {s.graceEarlyMin} د</span>
                    </div>
                  )}

                  {/* Overtime rules */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                    <span className="font-semibold text-foreground/80">الوقت الإضافي:</span>
                    <span className="font-bold text-foreground font-mono">
                      {s.allowOTIn || s.allowOTOut
                        ? `${s.allowOTIn ? `حضور من ${s.otMinInMinutes}د` : ""}${s.allowOTIn && s.allowOTOut ? " + " : ""}${s.allowOTOut ? `انصراف من ${s.otMinOutMinutes}د` : ""} (الإجمالي: ${s.otMaxMinutes > 0 ? `${s.otMaxMinutes}د` : "بلا حد"})`
                        : "معطل"}
                    </span>
                  </div>

                  {/* Cost Size class */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calculator className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                    <span className="font-semibold text-foreground/80">تصنيف شفت الأجر:</span>
                    <span className="font-bold text-foreground">
                      {s.shiftSize === "auto" ? `تلقائي (حد القصير: ${s.autoSmallThresholdMin} دقيقة)` : s.shiftSize === "big" ? "شفت كامل دائماً" : "نصف شفت دائماً"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(s)}
                  className="rounded-xl gap-1.5 opacity-90 hover:opacity-100 cursor-pointer"
                >
                  <Pencil size={12} /> تعديل الوردية
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
      
    </div>
  );
}
