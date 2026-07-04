import { useState } from "react";

const KF_DOCTORS = ["د. محمد السعدني", "د. سعيد مجدي"] as const;
import { Link, useLocation } from "wouter";
import { ROUTES } from "../../../../shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  ClipboardList,
  CalendarRange,
  CalendarPlus,
  ChevronLeft,
  Printer,
  Save,
  Activity,
  ArrowLeft,
  Clock,
  Wallet,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KfAddBookingDialog } from "@/features/kf/KfAddBookingDialog";
import { KfOperationBookingDialog } from "@/features/kf/KfOperationBookingDialog";

const initialForm = {
  fullName: "",
  dateOfBirth: "",
  age: "",
  gender: "" as "male" | "female" | "",
  phone: "",
  occupation: "",
  doctorName: "",
  medicalHistory: "",
};

export default function KfHome() {
  const [, setLocation] = useLocation();
  const [leftTab, setLeftTab] = useState<"patient" | "ledger">("patient");
  const [rightTab, setRightTab] = useState<"bookings" | "operations">("bookings");
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [operationDialogOpen, setOperationDialogOpen] = useState(false);

  // Compact new-patient form state
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createMutation = trpc.kf.createPatient.useMutation();

  // Ledger form state
  const initialLedgerForm = {
    entryDate: new Date().toISOString().split("T")[0],
    type: "income" as "income" | "expense",
    amount: "",
    notes: "",
  };
  const [ledgerForm, setLedgerForm] = useState(initialLedgerForm);
  const ledgerMutation = trpc.kf.addLedgerEntry.useMutation();

  // Queries
  const { data: operationsData, isLoading: loadingOperations } = trpc.kf.listOperations.useQuery({});
  const { data: followupsData } = trpc.kf.listFollowups.useQuery({});
  const bookingsQuery = (trpc as any).patientPortal.listBookings.useQuery(
    { branch: "kfs", limit: 50 },
    { staleTime: 30_000 },
  );

  const activeOperations = operationsData?.filter((op: any) => op.status === "scheduled") ?? [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingBookings = ((bookingsQuery.data ?? []) as any[])
    .filter(
      (b) =>
        (b.status === "pending" || b.status === "confirmed") &&
        new Date(b.requestedDate).getTime() >= todayStart.getTime(),
    )
    .slice()
    .sort(
      (a, b) =>
        new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime(),
    );

  const handleChange = (key: keyof typeof initialForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      
      // Auto-sync Age and Date of Birth
      if (key === "dateOfBirth" && value) {
        const dob = new Date(value);
        if (!isNaN(dob.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            calculatedAge--;
          }
          next.age = calculatedAge >= 0 ? calculatedAge.toString() : "";
        }
      } else if (key === "age" && value) {
        const ageNum = parseInt(value, 10);
        if (!isNaN(ageNum) && ageNum >= 0) {
          const today = new Date();
          const dobYear = today.getFullYear() - ageNum;
          // Default to Jan 1st of the calculated year
          next.dateOfBirth = `${dobYear}-01-01`;
        } else {
          next.dateOfBirth = "";
        }
      } else if (key === "age" && !value) {
        next.dateOfBirth = "";
      } else if (key === "dateOfBirth" && !value) {
        next.age = "";
      }

      return next;
    });

    if (errors[key]) {
      setErrors((prev) => { 
        const c = { ...prev }; 
        delete c[key];
        if (key === "age") delete c.dateOfBirth;
        if (key === "dateOfBirth") delete c.age;
        return c; 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim()) newErrors.fullName = "الاسم مطلوب";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    try {
      const result = await createMutation.mutateAsync({
        fullName: form.fullName.trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        phone: form.phone.trim() || null,
        address: null,
        doctorName: form.doctorName.trim() || null,
        medicalHistory: form.medicalHistory.trim() || null,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null,
        nationalId: null,
        alternatePhone: null,
        occupation: form.occupation.trim() || null,
        allergies: null,
        notes: null,
        selrsPatientCode: null,
      });
      toast.success(`تم تسجيل المريض بكود ${result.kfCode}`);
      setForm(initialForm);
      setLocation(`/kf/patients/${result.kfId}`);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    }
  };

  const handleLedgerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerForm.amount) return toast.error("يرجى إدخال المبلغ");
    try {
      await ledgerMutation.mutateAsync({
        entryDate: ledgerForm.entryDate,
        income: ledgerForm.type === "income" ? Number(ledgerForm.amount) : 0,
        expense: ledgerForm.type === "expense" ? Number(ledgerForm.amount) : 0,
        notes: ledgerForm.notes,
      });
      toast.success("تم تسجيل القيد بنجاح");
      setLedgerForm(initialLedgerForm);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    }
  };

  return (
    <section dir="rtl" className="space-y-12 pb-12">
      {/* ── Main Layout: Split Form and Feeds ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
        
        {/* Left Column: Quick Registration (tabbed: patient / ledger) */}
        <div className="xl:col-span-9 flex flex-col print:hidden">
          <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLeftTab("patient")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                  leftTab === "patient"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                <UserPlus className="h-4 w-4" />
                تسجيل مريض جديد
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("ledger")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                  leftTab === "ledger"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                <Wallet className="h-4 w-4" />
                تسجيل قيد جديد
              </button>
            </div>
          </div>

          {leftTab === "patient" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: الاسم الرباعي | تاريخ الميلاد | السن */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="kh-name" className="text-sm font-semibold text-slate-900 dark:text-slate-200">الاسم الرباعي <span className="text-rose-500">*</span></Label>
                <Input
                  id="kh-name"
                  placeholder="مثال: محمد أحمد علي محمود"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className={cn(
                    "h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800",
                    errors.fullName && "border-rose-500"
                  )}
                />
                {errors.fullName && <p className="text-xs font-medium text-rose-500 mt-1">{errors.fullName}</p>}
              </div>
              <div className="space-y-2 col-span-1">
                <Label htmlFor="kh-dob" className="text-sm font-semibold text-slate-900 dark:text-slate-200">تاريخ الميلاد</Label>
                <Input
                  id="kh-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label htmlFor="kh-age" className="text-sm font-semibold text-slate-900 dark:text-slate-200">السن</Label>
                <Input
                  id="kh-age"
                  type="number"
                  min="0"
                  placeholder="45"
                  value={form.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            {/* Row 2: النوع | رقم الهاتف | الوظيفه */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2 col-span-1">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">النوع</Label>
                <Select value={form.gender} onValueChange={(v: "male" | "female") => handleChange("gender", v)}>
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="kh-phone" className="text-sm font-semibold text-slate-900 dark:text-slate-200">رقم الهاتف</Label>
                <Input
                  id="kh-phone"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label htmlFor="kh-job" className="text-sm font-semibold text-slate-900 dark:text-slate-200">الوظيفة</Label>
                <Input
                  id="kh-job"
                  placeholder="مثال: مدرس"
                  value={form.occupation}
                  onChange={(e) => handleChange("occupation", e.target.value)}
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            {/* Row 3: الطبيب | ملاحظات \ تاريخ مرضي */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2 col-span-1">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">الطبيب</Label>
                <Select value={form.doctorName} onValueChange={(v) => handleChange("doctorName", v)}>
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="تحديد الطبيب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {KF_DOCTORS.map((dr) => (
                      <SelectItem key={dr} value={dr}>{dr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 col-span-3">
                <Label htmlFor="kh-history" className="text-sm font-semibold text-slate-900 dark:text-slate-200">ملاحظات \ تاريخ مرضي</Label>
                <Textarea
                  id="kh-history"
                  rows={2}
                  placeholder="سجل أي ملاحظات هامة هنا..."
                  value={form.medicalHistory}
                  onChange={(e) => handleChange("medicalHistory", e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none text-base"
                />
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between">
              <Button 
                type="submit" 
                disabled={createMutation.isPending} 
                className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-base"
              >
                <Save className="h-5 w-5 ml-2.5" />
                {createMutation.isPending ? "جاري الحفظ..." : "حفظ المريض"}
              </Button>
              <Link href={ROUTES.kfPatientsNew} className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-1.5">
                فتح الملف الشامل
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </form>
          ) : (
          <form onSubmit={handleLedgerSubmit} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-1">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">النوع</Label>
                <Select value={ledgerForm.type} onValueChange={(v: "income" | "expense") => setLedgerForm(prev => ({...prev, type: v}))}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income" className="text-emerald-600 font-bold">إيراد</SelectItem>
                    <SelectItem value="expense" className="text-rose-600 font-bold">مصروف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">المبلغ</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={ledgerForm.amount}
                  onChange={(e) => setLedgerForm(prev => ({...prev, amount: e.target.value}))}
                  className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-lg"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">التاريخ</Label>
                <Input
                  type="date"
                  value={ledgerForm.entryDate}
                  onChange={(e) => setLedgerForm(prev => ({...prev, entryDate: e.target.value}))}
                  className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">البيان \ الملاحظات</Label>
                <Input
                  placeholder="بيان القيد..."
                  value={ledgerForm.notes}
                  onChange={(e) => setLedgerForm(prev => ({...prev, notes: e.target.value}))}
                  className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <Button
                type="submit"
                disabled={ledgerMutation.isPending}
                className="h-11 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white font-bold rounded-xl"
              >
                <Plus className="h-5 w-5 ml-1.5" />
                {ledgerMutation.isPending ? "..." : "إضافة القيد"}
              </Button>
            </div>
            <div className="pt-1 text-right">
              <Link href={ROUTES.kfAccounting} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                دفتر الحسابات &larr;
              </Link>
            </div>
          </form>
          )}
        </div>

        {/* Right Column: Feeds & Lists (tabbed: bookings / operations) */}
        <div className="xl:col-span-3 flex flex-col print:hidden">
          <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRightTab("bookings")}
                className={cn(
                  "flex items-center gap-2 px-3 py-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                  rightTab === "bookings"
                    ? "border-amber-500 text-amber-600 dark:text-amber-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                <CalendarPlus className="h-4 w-4" />
                المواعيد
              </button>
              <button
                type="button"
                onClick={() => setRightTab("operations")}
                className={cn(
                  "flex items-center gap-2 px-3 py-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                  rightTab === "operations"
                    ? "border-rose-500 text-rose-600 dark:text-rose-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                <Activity className="h-4 w-4" />
                العمليات
              </button>
            </div>
          </div>

          {rightTab === "bookings" ? (
          <div>
            <div className="flex flex-col gap-3 mb-4">
              <Button
                type="button"
                size="sm"
                onClick={() => setBookingDialogOpen(true)}
                className="h-9 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg"
              >
                <Plus className="h-4 w-4 ml-1.5" />
                إضافة موعد
              </Button>
              <Link href={ROUTES.kfBookings} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-center">
                كل الحجوزات &larr;
              </Link>
            </div>

            {bookingsQuery.isLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-5 w-full rounded-md" />
                    <Skeleton className="h-4 w-2/3 rounded-md" />
                  </div>
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarPlus className="h-10 w-10 text-slate-300 mb-3" />
                <h4 className="text-sm text-slate-900 dark:text-white font-bold mb-1">لا توجد مواعيد قادمة</h4>
                <p className="text-xs text-slate-500">لا توجد حجوزات بانتظار التأكيد حالياً.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingBookings.slice(0, 5).map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 py-4">
                    <div className="w-2 h-10 rounded-full bg-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {b.patientName ?? b.guestName ?? "—"}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {b.typeLabel ?? b.bookingType}
                        </span>
                        <span>•</span>
                        <span>{new Date(b.requestedDate).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : (
          <div>
            <div className="flex flex-col gap-3 mb-4">
              <Button
                type="button"
                size="sm"
                onClick={() => setOperationDialogOpen(true)}
                className="h-9 w-full bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg"
              >
                <Plus className="h-4 w-4 ml-1.5" />
                حجز عملية
              </Button>
              <Link href={ROUTES.kfOperations} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-center">
                الجدول الكامل &larr;
              </Link>
            </div>

            {loadingOperations ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-5 w-full rounded-md" />
                    <Skeleton className="h-4 w-2/3 rounded-md" />
                  </div>
                ))}
              </div>
            ) : activeOperations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-10 w-10 text-slate-300 mb-3" />
                <h4 className="text-sm text-slate-900 dark:text-white font-bold mb-1">لا توجد عمليات</h4>
                <p className="text-xs text-slate-500">جميع المواعيد مكتملة حالياً.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeOperations.slice(0, 5).map((op: any) => (
                  <div key={op.kfOpId} className="flex items-center gap-3 py-4 group">
                    <div className="w-2 h-10 rounded-full bg-rose-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {op.opType}
                        <span className="text-xs font-normal text-slate-500 mr-1.5">
                          ({op.eye === "both" ? "العينين" : op.eye === "right" ? "اليمنى" : "اليسرى"})
                        </span>
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {op.patientName || `مريض ${op.kfPatientId}`}
                        </span>
                        <span>•</span>
                        <span>{new Date(op.opDate).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                    <Link
                      href={`/kf/patients/${op.kfPatientId}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      تفاصيل
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      <KfAddBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
      />
      <KfOperationBookingDialog
        open={operationDialogOpen}
        onOpenChange={setOperationDialogOpen}
      />
    </section>
  );
}
