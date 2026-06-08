import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarPlus2, ShieldCheck, UserCheck, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { usePatientAuth } from "@/hooks/usePatientAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PatientLogin() {
  const [, navigate] = useLocation();
  const { login, isLoggedIn } = usePatientAuth();
  const [activeTab, setActiveTab] = useState<"login" | "guest">("login");
  const [phone, setPhone] = useState("");
  const [patientCode, setPatientCode] = useState("");

  if (isLoggedIn) {
    navigate("/my/file");
    return null;
  }

  const loginMutation = trpc.patientPortal.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.patient);
      navigate("/my/file");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 8) {
      toast.error("يرجى إدخال رقم موبايل صحيح");
      return;
    }
    if (!patientCode) {
      toast.error("يرجى إدخال كود المريض");
      return;
    }
    loginMutation.mutate({ phone, patientCode });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F4F8FB] text-foreground font-sans selection:bg-secondary/20 selection:text-secondary-foreground" dir="rtl">
      {/* Decorative top gradient bar */}
      <div className="h-2 w-full bg-gradient-to-r from-primary via-secondary to-primary/80" />

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
        
        {/* Header section with Clinic Branding */}
        <div className="w-full max-w-[480px] mb-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3.5 bg-white border border-[#dbe7f4] rounded-2xl shadow-[0_8px_24px_rgba(28,64,104,0.03)]">
            <BrandLogo className="size-12 object-contain" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#003D82] sm:text-3xl">مركز عيون الشروق</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
              بوابة الخدمات الإلكترونية للمرضى
            </p>
          </div>
        </div>

        {/* Card Container */}
        <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-[#dbe7f4] bg-white p-6 shadow-[0_20px_50px_rgba(28,64,104,0.05)] sm:p-8">
          
          {/* Tabs header */}
          <div className="grid grid-cols-2 p-1.5 bg-[#F4F8FB] rounded-xl border border-[#e2edf7] mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                activeTab === "login"
                  ? "bg-white text-primary shadow-xs border border-[#dbe7f4]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCheck className="size-4" />
              <span>تسجيل الدخول</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guest")}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                activeTab === "guest"
                  ? "bg-white text-primary shadow-xs border border-[#dbe7f4]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserPlus className="size-4" />
              <span>حالة جديدة / زائر</span>
            </button>
          </div>

          {/* Form / Content area */}
          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">رقم الموبايل</label>
                  <span className="text-[11px] text-muted-foreground">رقمك المسجل بالملف</span>
                </div>
                <Input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="h-12 text-left font-medium tracking-wide border-[#d7e2ee] focus-visible:ring-primary/10 rounded-xl"
                  autoComplete="tel"
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">كود المريض</label>
                  <span className="text-[11px] text-muted-foreground">كودك الخاص</span>
                </div>
                <Input
                  type="text"
                  placeholder="مثال: 0093"
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  dir="rtl"
                  className="h-12 text-right font-medium border-[#d7e2ee] focus-visible:ring-primary/10 rounded-xl"
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="h-12 w-full text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors rounded-xl shadow-xs cursor-pointer"
                  disabled={phone.length < 8 || !patientCode || loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-5 animate-spin" />
                      <span>جاري التحقق...</span>
                    </div>
                  ) : (
                    "دخول إلى بوابة المرضى"
                  )}
                </Button>
              </div>

              {/* Informative alert box */}
              <div className="rounded-xl border border-[#e2edf7] bg-[#F4F8FB]/60 p-3.5 text-xs text-muted-foreground space-y-1 leading-5">
                <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>تنبيه أمان البيانات</span>
                </div>
                <p>
                  استخدم نفس رقم الهاتف الذي قدمته لموظف الاستقبال عند التسجيل أول مرة.
                </p>
                <p>
                  كود المريض يربطك مباشرة بملفك وسجل الفحوصات والعمليات الخاص بك.
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2 text-center py-2">
                <h3 className="text-base font-bold text-foreground">حجز موعد كحالة جديدة</h3>
                <p className="text-sm text-muted-foreground leading-6">
                  إذا لم يسبق لك زيارة المركز أو لا تملك كود مريض مسجل، يمكنك طلب حجز موعد مباشرة كزائر لتسجيل ملفك الطبي الجديد.
                </p>
              </div>

              {/* Value checklist */}
              <div className="rounded-xl border border-[#dbe7f4] bg-white p-4 space-y-3.5 shadow-[inset_0_2px_4px_rgba(28,64,104,0.01)]">
                <div className="flex items-start gap-2.5 text-xs leading-5">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary font-bold text-[10px]">
                    ✓
                  </div>
                  <div className="font-semibold text-foreground">حجز فوري لجميع التخصصات المتاحة</div>
                </div>
                <div className="flex items-start gap-2.5 text-xs leading-5">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary font-bold text-[10px]">
                    ✓
                  </div>
                  <div className="font-semibold text-foreground">تأكيد الموعد عبر الهاتف من قبل الاستقبال</div>
                </div>
                <div className="flex items-start gap-2.5 text-xs leading-5">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary font-bold text-[10px]">
                    ✓
                  </div>
                  <div className="font-semibold text-foreground">إمكانية إنشاء ملف طبي فوري عند الحضور للمركز</div>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/my/book-guest" className="w-full">
                  <Button className="h-12 w-full text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-xl shadow-xs gap-2 cursor-pointer">
                    <CalendarPlus2 className="size-5" />
                    <span>البدء في حجز موعد كزائر</span>
                  </Button>
                </Link>
              </div>

              <p className="text-center text-xs leading-5 text-muted-foreground">
                <span>هل زرت المركز مسبقاً؟ </span>
                <span className="font-medium text-secondary">يرجى التواصل مع الاستقبال للحصول على كود المريض الخاص بك.</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modern, elegant Footer */}
      <footer className="py-4 border-t border-[#dbe7f4] bg-white text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} مركز عيون الشروق. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
