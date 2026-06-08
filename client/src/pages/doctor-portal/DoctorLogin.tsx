import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { useDoctorAuth } from "@/hooks/useDoctorAuth";
import { toast } from "sonner";


const eyeSpecialties = [
  "علاج أمراض القرنية",
  "تصحيح الإبصار (الليزك)",
  "إزالة المياه البيضاء (Cataract)",
  "زراعة عدسات (IOL / ICL)",
  "علاج حول العين (Squint)",
  "عمليات الفيمتو ليزك (Femto)",
  "فحص قاع العين والشبكية (Fundus)",
  "تجهيز النظارات الطبية (Glasses)",
  "العدسات اللاصقة (Lenses)",
  "تصوير البنتاكام (Pentacam)",
];

export default function DoctorLogin() {
  const [, navigate] = useLocation();
  const { login, isLoggedIn } = useDoctorAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (isLoggedIn) {
    navigate("/doctor-portal/dashboard");
    return null;
  }

  const loginMutation = trpc.doctorPortal.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.doctor);
      navigate("/doctor-portal/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    loginMutation.mutate({ username: username.trim(), password });
  };

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loginMutation.isPending;

  return (
    <div
      className="min-h-screen flex flex-col lg:grid lg:grid-cols-[1fr_480px] bg-[#F4F8FB] text-foreground font-sans selection:bg-secondary/20 selection:text-secondary-foreground"
      dir="rtl"
    >
      {/* ── Left column (Desktop Branding Panel) ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-gradient-to-br from-[#E2EDF7] to-[#F4F8FB] border-l border-[#dbe7f4] relative overflow-hidden">
        {/* Grid pattern background overlay */}
        <div
          className="absolute inset-0 opacity-35 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(to right, #d2e1f2 1px, transparent 1px), linear-gradient(to bottom, #d2e1f2 1px, transparent 1px)",
            backgroundSize: "3.5rem 3.5rem"
          }}
        />
        {/* Soft atmospheric gradient highlights */}
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-gradient-to-tr from-secondary/8 via-primary/4 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-12 -right-12 size-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative flex items-center gap-3">
          <div className="p-2 bg-white border border-[#dbe7f4] rounded-2xl shadow-xs">
            <BrandLogo className="size-10 object-contain" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#003D82] leading-tight">مركز عيون الشروق</h2>
            <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
              رعاية طبية متخصصة ومتميزة للعين
            </p>
          </div>
        </div>

        {/* Mid section: Slogan & eye specialties */}
        <div className="relative my-auto py-8 space-y-8 max-w-lg">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase">
              بوابة الأطباء والاستشاريين
            </span>
            <h3 className="text-3xl font-black text-foreground leading-snug">
              رؤية أوضح، <br />
              لحياة أفضل وأجمل.
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              بوابتك الطبية الخاصة لمتابعة ملفات وسجلات مرضاك المحالين، واستعراض نتائج الفحوصات والتقارير الطبية بدقة وسهولة.
            </p>
          </div>

          {/* Clean stats row (no 24/7) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/60 backdrop-blur-md border border-[#e2edf7] rounded-2xl p-4 shadow-xs">
              <p className="text-2xl font-black text-[#003D82]">+10K</p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">عملية ناجحة بالمركز</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-[#e2edf7] rounded-2xl p-4 shadow-xs">
              <p className="text-2xl font-black text-[#003D82]">15+</p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">استشاري وأخصائي عيون</p>
            </div>
          </div>

          {/* Specialties tag cloud */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#003D82] uppercase tracking-wider">تخصصاتنا الطبية الدقيقة:</h4>
            <div className="flex flex-wrap gap-1.5">
              {eyeSpecialties.map((item) => (
                <span
                  key={item}
                  className="bg-white border border-[#e2edf7] px-3 py-1 rounded-xl text-[10px] font-semibold text-foreground shadow-xs transition-all hover:border-primary/20"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative text-[10px] text-muted-foreground/50 font-medium">
          تخضع جميع الفحوصات لمعايير الجودة الطبية العالمية الصارمة.
        </div>
      </div>

      {/* ── Right column (Login Area) ── */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Top brand gradient bar (Mobile Only) */}
        <div className="lg:hidden h-2 w-full bg-gradient-to-r from-[#003D82] via-[#FF6B35] to-[#003D82]" />

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-16">
          {/* Brand header (Mobile Only) */}
          <div className="lg:hidden w-full max-w-[480px] mb-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3.5 bg-white border border-[#dbe7f4] rounded-2xl shadow-xs">
              <BrandLogo className="size-12 object-contain" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#003D82] sm:text-3xl">
                مركز عيون الشروق
              </h1>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                بوابة الأطباء الخارجيين
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-[#dbe7f4] bg-white p-6 shadow-[0_20px_50px_rgba(28,64,104,0.04)] sm:p-8">

            {/* Card heading */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Stethoscope className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  تسجيل دخول آمن
                </p>
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  دخول الطبيب
                </h2>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    اسم المستخدم
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    الحساب الممنوح من الإدارة
                  </span>
                </div>
                <Input
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  dir="ltr"
                  className="h-12 text-left font-medium tracking-wide border-[#d7e2ee] focus-visible:ring-primary/10 rounded-xl"
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    كلمة المرور
                  </label>
                </div>
                <Input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-12 font-medium border-[#d7e2ee] focus-visible:ring-primary/10 rounded-xl"
                  disabled={loginMutation.isPending}
                  onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit(e as any)}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="h-12 w-full text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors rounded-xl shadow-xs cursor-pointer"
                  disabled={!canSubmit}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center gap-2 justify-center">
                      <Loader2 className="size-5 animate-spin" />
                      <span>جارٍ التحقق...</span>
                    </div>
                  ) : (
                    "دخول إلى بوابة الأطباء"
                  )}
                </Button>
              </div>

              {/* Security notice */}
              <div className="rounded-xl border border-[#e2edf7] bg-[#F4F8FB]/60 p-3.5 text-xs text-muted-foreground space-y-1 leading-5">
                <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>تنبيه أمان البيانات</span>
                </div>
                <p>
                  استخدم بيانات الاعتماد الممنوحة لك من إدارة المركز فقط.
                </p>
                <p>
                  هذه البوابة مخصصة للأطباء الخارجيين المعتمدين لمراجعة ملفات مرضاهم.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-4 border-t border-[#dbe7f4] bg-white text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} مركز عيون الشروق. جميع الحقوق محفوظة.</p>
        </footer>
      </div>
    </div>
  );
}
