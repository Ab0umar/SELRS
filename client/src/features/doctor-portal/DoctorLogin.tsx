import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginShell, useLoginPalette } from "@/components/auth/LoginShell";
import { trpc } from "@/lib/trpc";
import { useDoctorAuth } from "@/hooks/useDoctorAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DoctorLogin() {
  const [, navigate] = useLocation();
  const { login, isLoggedIn } = useDoctorAuth();
  const { p, fieldRef, fieldClass } = useLoginPalette();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.doctorPortal.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.doctor);
      navigate("/doctor-portal/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoggedIn) return <Redirect to="/doctor-portal/dashboard" />;

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
    <LoginShell
      title="مركز عيون الشروق"
      subtitle="لأمراض القرنية وتصحيح الإبصار"
      headerLink={{ href: "/login", label: "دخول النظام" }}
    >
      <section className={cn("rounded-3xl p-5 sm:p-6", p.panel)}>
        <span className={cn("mb-2 inline-flex items-center gap-1.5 text-xs font-bold", p.accent)}>
          <span className="size-1.5 rounded-full bg-secondary" />
          تسجيل دخول آمن
        </span>
        <h2 className={cn("m-0 text-xl font-extrabold", p.heading)}>
          دخول الطبيب
        </h2>
        <p className={cn("mb-4 mt-1 text-xs leading-relaxed", p.muted)}>
          أدخل بيانات الطبيب المعتمدة للوصول إلى لوحة بوابة الأطباء.
        </p>

        <div className={cn("mb-4 flex items-center gap-3 rounded-xl p-3", p.list)}>
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              p.tileIcon,
            )}
          >
            <Stethoscope className="size-5" />
          </span>
          <p className={cn("m-0 text-xs leading-5", p.muted)}>
            هذه البوابة مخصصة للأطباء الخارجيين المعتمدين لمراجعة ملفات مرضاهم.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              className={cn("block text-xs font-bold", p.label)}
              htmlFor="doctor-username"
            >
              اسم المستخدم
            </label>
            <div className="relative">
              <Input
                ref={fieldRef}
                id="doctor-username"
                type="text"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className={cn(fieldClass, "ps-12 text-start")}
                disabled={loginMutation.isPending}
              />
              <UserRound className={cn("pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2", p.muted)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              className={cn("block text-xs font-bold", p.label)}
              htmlFor="doctor-password"
            >
              كلمة المرور
            </label>
            <div className="relative">
              <Input
                ref={fieldRef}
                id="doctor-password"
                type={showPassword ? "text" : "password"}
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={cn(fieldClass, "ps-12 pe-12 text-start")}
                disabled={loginMutation.isPending}
              />
              <LockKeyhole className={cn("pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2", p.muted)} />
              <Button
                variant="bare"
                type="button"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                onClick={() => setShowPassword((v) => !v)}
                className={cn("absolute end-4 top-1/2 -translate-y-1/2 cursor-pointer transition-colors", p.muted)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className={cn(
              "h-12 w-full cursor-pointer rounded-xl text-base font-bold shadow-md transition-all",
              p.cta,
            )}
            disabled={!canSubmit}
          >
            {loginMutation.isPending ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                <span>جارٍ التحقق…</span>
              </div>
            ) : (
              "دخول إلى بوابة الأطباء"
            )}
          </Button>

          <p className={cn("m-0 flex items-start gap-1.5 text-xs leading-5", p.muted)}>
            <ShieldCheck className={cn("mt-0.5 size-4 shrink-0", p.accent)} />
            <span>استخدم بيانات الاعتماد الممنوحة لك من إدارة المركز فقط.</span>
          </p>
        </form>
      </section>
    </LoginShell>
  );
}
