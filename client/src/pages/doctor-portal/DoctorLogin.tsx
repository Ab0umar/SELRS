import { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-[#F6FAFD] text-foreground" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="overflow-hidden rounded-[2rem] border border-[#dce9f5] bg-white shadow-[0_20px_60px_rgba(28,64,104,0.08)]">
          <div className="bg-[linear-gradient(180deg,#002A63_0%,#0F4E93_100%)] px-6 py-8 text-center text-white">
            <div className="flex items-center justify-center gap-3">
              <BrandLogo className="size-12 shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.16)]" />
              <div>
                <h1 className="text-xl font-semibold leading-none">مركز عيون الشروق</h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">بوابة الأطباء الخارجيين</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary">تسجيل دخول آمن</p>
                <h2 className="text-xl font-semibold text-foreground">دخول الطبيب</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">اسم المستخدم</label>
                <Input
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate({ username, password })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">كلمة المرور</label>
                <Input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate({ username, password })}
                />
              </div>

              <Button
                className="w-full"
                disabled={loginMutation.isPending || !username || !password}
                onClick={() => loginMutation.mutate({ username, password })}
              >
                {loginMutation.isPending ? "جارٍ الدخول..." : "دخول"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
