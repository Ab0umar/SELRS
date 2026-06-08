import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { useDoctorAuth } from "@/hooks/useDoctorAuth";
import { toast } from "sonner";

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
      className="min-h-screen flex flex-col justify-between bg-[#F4F8FB] text-foreground font-sans selection:bg-secondary/20 selection:text-secondary-foreground"
      dir="rtl"
    >
      {/* Top gradient bar */}
      <div className="h-2 w-full bg-gradient-to-r from-primary via-secondary to-primary/80" />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">

        {/* Brand header above card */}
        <div className="w-full max-w-[480px] mb-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3.5 bg-white border border-[#dbe7f4] rounded-2xl shadow-[0_8px_24px_rgba(28,64,104,0.03)]">
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
        <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-[#dbe7f4] bg-white p-6 shadow-[0_20px_50px_rgba(28,64,104,0.05)] sm:p-8">

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
                  <div className="flex items-center gap-2">
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
  );
}
