import { useState } from "react";

const KF_DOCTORS = ["د. محمد السعدني", "د. سعيد مجدي"] as const;
import { Link, useLocation } from "wouter";
import { ROUTES } from "../../../../shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronLeft,
  Printer,
  Save,
} from "lucide-react";

const initialForm = {
  fullName: "",
  age: "",
  gender: "" as "male" | "female" | "",
  phone: "",
  address: "",
  doctorName: "",
  medicalHistory: "",
};

export default function KfHome() {
  const [, setLocation] = useLocation();

  // Compact new-patient form state
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createMutation = trpc.kf.createPatient.useMutation();

  // Queries
  const { data: patientsData, isLoading: loadingPatients } = trpc.kf.listPatients.useQuery({
    page: 1,
    pageSize: 5,
  });
  const { data: operationsData, isLoading: loadingOperations } = trpc.kf.listOperations.useQuery({});
  const { data: followupsData } = trpc.kf.listFollowups.useQuery({});

  const recentPatients = patientsData?.patients ?? [];
  const activeOperations = operationsData?.filter((op: any) => op.status === "scheduled") ?? [];

  const handleChange = (key: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const c = { ...prev }; delete c[key]; return c; });
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
        address: form.address.trim() || null,
        doctorName: form.doctorName.trim() || null,
        medicalHistory: form.medicalHistory.trim() || null,
        dateOfBirth: null,
        nationalId: null,
        alternatePhone: null,
        occupation: null,
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

  const navLinks = [
    { href: ROUTES.kfPatients, label: "دليل المرضى", icon: Users },
    { href: ROUTES.kfOperations, label: "جدول العمليات", icon: ClipboardList },
    { href: ROUTES.kfFollowups, label: "سجل المتابعات", icon: CalendarRange },
  ];

  return (
    <section dir="rtl" className="space-y-6">
      {/* Top half/half: new patient form + nav links */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start print:hidden">
        {/* New patient form */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="h-4 w-4" />
              تسجيل مريض جديد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="kh-name" className="text-xs">الاسم بالكامل *</Label>
                <Input
                  id="kh-name"
                  placeholder="محمد أحمد علي"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="kh-age" className="text-xs">السن</Label>
                  <Input
                    id="kh-age"
                    type="number"
                    min="0"
                    placeholder="45"
                    value={form.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">النوع</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v: "male" | "female") => handleChange("gender", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="kh-phone" className="text-xs">الموبايل</Label>
                <Input
                  id="kh-phone"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="kh-address" className="text-xs">العنوان</Label>
                <Input
                  id="kh-address"
                  placeholder="المحافظة / المدينة"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الدكتور</Label>
                <Select
                  value={form.doctorName}
                  onValueChange={(v) => handleChange("doctorName", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطبيب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {KF_DOCTORS.map((dr) => (
                      <SelectItem key={dr} value={dr}>{dr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="kh-history" className="text-xs">التاريخ المرضي</Label>
                <Textarea
                  id="kh-history"
                  rows={2}
                  placeholder="ملاحظات مرضية..."
                  value={form.medicalHistory}
                  onChange={(e) => handleChange("medicalHistory", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" disabled={createMutation.isPending} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  {createMutation.isPending ? "جاري الحفظ..." : "تسجيل"}
                </Button>
                <Link href={ROUTES.kfPatientsNew} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                  ملف كامل
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Nav links stacked */}
        <div className="flex flex-col gap-2 lg:w-1/2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Button key={href} variant="secondary" asChild size="lg" className="w-full flex justify-between group">
              <Link href={href}>
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </span>
                <ChevronLeft className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Grid: Recent Entries */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Patients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between print:hidden">
            <div>
              <CardTitle className="text-lg">المرضى المضافون مؤخراً</CardTitle>
              <CardDescription>آخر 5 مرضى تم تسجيل ملفاتهم</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()} disabled={loadingPatients || recentPatients.length === 0}>
                <Printer className="h-3.5 w-3.5" />
                طباعة
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.kfPatients}>عرض الكل</Link>
              </Button>
            </div>
          </CardHeader>
          <div className="hidden print:block px-6 py-3 border-b text-center">
            <div className="font-bold text-base">مركز ساعدني لجراحة وتقويم الإبصار — وحدة كفرالشيخ</div>
            <div className="text-sm">المرضى المضافون مؤخراً — {new Date().toLocaleDateString("ar-EG")}</div>
          </div>
          <CardContent className="space-y-4">
            {loadingPatients ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))
            ) : recentPatients.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">لا يوجد مرضى مسجلين حتى الآن.</div>
            ) : (
              recentPatients.map((patient: any) => (
                <div key={patient.kfId} className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:bg-muted/30 px-2 rounded-lg transition-colors">
                  <div>
                    <h4 className="font-semibold text-sm">{patient.fullName}</h4>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span>كود: {patient.kfCode}</span>
                      <span>•</span>
                      <span>هاتف: {patient.phone || "غير مسجل"}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/kf/patients/${patient.kfId}`}>الملف</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Operations */}
        <Card className="print:hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">العمليات القادمة</CardTitle>
              <CardDescription>قائمة العمليات المجدولة قريباً</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ROUTES.kfOperations}>عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingOperations ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-12" />
                </div>
              ))
            ) : activeOperations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">لا توجد عمليات مقررة قريباً.</div>
            ) : (
              activeOperations.slice(0, 5).map((op: any) => (
                <div key={op.kfOpId} className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:bg-muted/30 px-2 rounded-lg transition-colors">
                  <div>
                    <h4 className="font-semibold text-sm">
                      {op.opType} ({op.eye === "both" ? "العينين" : op.eye === "right" ? "العين اليمنى" : "العين اليسرى"})
                    </h4>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span>المريض: {op.patientName || `معرف ${op.kfPatientId}`}</span>
                      <span>•</span>
                      <span>التاريخ: {new Date(op.opDate).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/kf/patients/${op.kfPatientId}`}>عرض</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
