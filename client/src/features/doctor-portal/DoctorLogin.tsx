import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import {
  Eye,
  Loader2,
  LockKeyhole,
  Microscope,
  Scan,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { useDoctorAuth } from "@/hooks/useDoctorAuth";
import { toast } from "sonner";

const SERVICES = [
  { icon: Zap, ar: "تصحيح الإبصار" },
  { icon: Eye, ar: "المياه البيضاء" },
  { icon: Scan, ar: "أشعة القرنية" },
  { icon: Microscope, ar: "زراعة العدسات" },
] as const;

export default function DoctorLogin() {
  const [, navigate] = useLocation();
  const { login, isLoggedIn } = useDoctorAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (isLoggedIn) return <Redirect to="/doctor-portal/dashboard" />;

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

  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    !loginMutation.isPending;

  return (
    <div
      className="h-dvh w-full overflow-hidden flex flex-col lg:flex-row bg-white text-foreground font-sans selection:bg-[#2a4f9a]/10 selection:text-[#1f3f82]"
      dir="rtl"
    >
      <div className="relative overflow-hidden w-full h-[34dvh] min-h-[220px] max-h-[285px] lg:h-auto lg:max-h-none lg:w-[56%] flex flex-col bg-gradient-to-br from-[#15296a] via-[#0f2050] to-[#0c1840] py-5 px-5 sm:p-8 lg:p-14 justify-between shrink-0">
        <div
          className="absolute top-[-120px] left-[-80px] w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(211, 156, 42, 0.18), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-140px] right-[-100px] w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(37, 99, 235, 0.30), transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-1 flex-row items-center justify-center gap-5 lg:gap-7">
          <BrandLogo className="size-32 lg:size-44 object-contain select-none shrink-0" />
          <div className="flex flex-col items-start text-right">
            <span className="whitespace-nowrap text-[32px] sm:text-[42px] lg:text-[56px] font-extrabold text-white leading-none">
              مركز عيون الشروق
            </span>
            <span className="text-base lg:text-2xl font-bold text-[#FC9918] mt-2">
              لامراض القرنيه و تصحيح الابصار
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-auto hidden lg:grid grid-cols-4 gap-2.5">
          {SERVICES.map(({ icon: Icon, ar: label }) => (
            <div
              key={label}
              className="flex h-20 flex-col items-center justify-center gap-2 text-center"
            >
              <span className="flex items-center justify-center text-[#e8b54a] shrink-0">
                <Icon className="size-7" />
              </span>
              <span className="text-white/85 text-sm font-bold leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-4 grid lg:hidden grid-cols-4 gap-1.5">
          {SERVICES.map(({ icon: Icon, ar: label }) => (
            <div
              key={label}
              className="flex h-16 flex-col items-center justify-center gap-1.5 text-center"
            >
              <span className="text-[#e8b54a]">
                <Icon className="size-5" />
              </span>
              <span className="text-white/85 text-[9px] sm:text-[10px] font-bold leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white rounded-t-[22px] lg:rounded-none -mt-5 lg:mt-0 p-5 sm:p-10 lg:p-20 flex flex-col justify-between relative z-10 shadow-[0_-8px_30px_rgba(15,32,80,0.06)] lg:shadow-none">
        <div className="lg:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-slate-200" />

        <div className="w-full max-w-[420px] mx-auto my-auto flex flex-col justify-center">
          <span className="inline-flex items-center gap-1.5 self-start text-[10px] sm:text-xs font-bold tracking-wider uppercase text-[#2a4f9a] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d39c2a]" />
            تسجيل دخول آمن
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2050] tracking-tight m-0">
            دخول الطبيب
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-4 sm:mb-8 leading-relaxed">
            أدخل بيانات الطبيب المعتمدة للوصول إلى لوحة بوابة الأطباء.
          </p>

          <div className="mb-4 sm:mb-6 flex items-center gap-3 rounded-xl border border-[#e6edf5] bg-slate-50 p-3 sm:p-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#d39c2a]/15 text-[#d39c2a]">
              <Stethoscope className="size-5" />
            </span>
            <p className="m-0 text-xs leading-5 text-slate-500">
              هذه البوابة مخصصة للأطباء الخارجيين المعتمدين لمراجعة ملفات
              مرضاهم.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
            <div className="space-y-1.5">
              <label
                className="block text-xs sm:text-sm font-bold text-slate-700"
                htmlFor="doctor-username"
              >
                اسم المستخدم
              </label>
              <div className="relative">
                <Input
                  id="doctor-username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="h-12 border-[#e6edf5] bg-slate-50 rounded-xl pr-12 focus-visible:ring-primary/10 text-right font-medium"
                  disabled={loginMutation.isPending}
                />
                <UserRound className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-xs sm:text-sm font-bold text-slate-700"
                htmlFor="doctor-password"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <Input
                  id="doctor-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-12 border-[#e6edf5] bg-slate-50 rounded-xl pr-12 pl-12 focus-visible:ring-primary/10 text-right font-medium"
                  disabled={loginMutation.isPending}
                  onKeyDown={(e) =>
                    e.key === "Enter" && canSubmit && handleSubmit(e as any)
                  }
                />
                <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2a4f9a] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  <Eye className="size-5" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="h-12 w-full text-base font-bold bg-[#1f3f82] text-white hover:bg-[#1f3f82]/90 transition-all rounded-xl shadow-lg shadow-[#1f3f82]/20 cursor-pointer"
                disabled={!canSubmit}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    <span>جارٍ التحقق...</span>
                  </div>
                ) : (
                  "دخول إلى بوابة الأطباء"
                )}
              </Button>
            </div>

            <div className="hidden sm:block rounded-xl border border-[#e6edf5] bg-slate-50 p-3.5 text-xs text-slate-500 space-y-1 leading-5">
              <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                <ShieldCheck className="size-4 shrink-0" />
                <span>تنبيه أمان البيانات</span>
              </div>
              <p>استخدم بيانات الاعتماد الممنوحة لك من إدارة المركز فقط.</p>
              <p>
                هذه البوابة مخصصة للأطباء الخارجيين المعتمدين لمراجعة ملفات
                مرضاهم.
              </p>
            </div>
          </form>
        </div>

        <footer className="mt-4 pt-4 sm:mt-8 sm:pt-6 border-t border-[#e6edf5] flex flex-row items-center justify-between text-[11px] sm:text-xs text-slate-400 w-full">
          <Link
            href="/login"
            className="font-bold text-[#2a4f9a] hover:underline"
          >
            دخول النظام
          </Link>
          <p className="m-0 text-slate-400/80">
            © {new Date().getFullYear()} مركز عيون الشروق
          </p>
        </footer>
      </div>
    </div>
  );
}
