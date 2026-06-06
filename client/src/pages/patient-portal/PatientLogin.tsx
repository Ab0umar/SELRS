import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarPlus2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { usePatientAuth } from "@/hooks/usePatientAuth";
import { toast } from "sonner";
import { PortalPanel } from "./portal-ui";
import { cn } from "@/lib/utils";

export default function PatientLogin() {
  const [, navigate] = useLocation();
  const { login, isLoggedIn } = usePatientAuth();
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

  return (
    <div className="min-h-screen bg-[#F6FAFD] text-foreground" dir="rtl">
      <div className="mx-auto min-h-screen w-full max-w-none px-0 py-0">
        <div className="overflow-hidden rounded-none border-0 bg-white shadow-none sm:rounded-[2rem] sm:border sm:border-[#dce9f5] sm:shadow-[0_20px_60px_rgba(28,64,104,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,#002A63_0%,#0F4E93_38%,#DDEAF7_79%,#F8FAFC_100%)] px-4 pb-24 pt-5 text-white sm:px-6 sm:pb-28 lg:px-10 lg:pb-32">
            <div className="mx-auto flex max-w-2xl items-center justify-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#0b3d78]/22 px-5 py-3 text-center text-white shadow-[0_14px_30px_rgba(0,0,0,0.12)] backdrop-blur-[2px]">
              <BrandLogo className="size-10 shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.16)] sm:size-12" />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold leading-none sm:text-3xl">مركز عيون الشروق</h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">SELRS</p>
              </div>
            </div>
          </div>

          <div className="-mt-20 px-4 pb-5 sm:px-6 sm:pb-6 lg:-mt-24 lg:px-10">
            <div className="mx-auto grid max-w-3xl gap-4">
              <PortalPanel className="p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-secondary">تسجيل الدخول</p>
                    <h2 className="text-xl font-semibold text-foreground">أدخل رقم الموبايل وكود المريض</h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      استخدم نفس الرقم المسجل لدى الاستقبال. كود المريض يربطك بملفك مباشرة.
                    </p>
                  </div>
                  <div className="hidden rounded-xl bg-secondary/15 p-2 text-secondary lg:flex">
                    <ShieldCheck className="size-5" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 text-right sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground">رقم الموبايل</label>
                    <Input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      dir="rtl"
                      className="text-right"
                      autoComplete="tel"
                    />
                  </div>

                  <div className="space-y-1.5 text-right sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground">كود المريض</label>
                    <Input
                      type="text"
                      placeholder="مثال: 0093"
                      value={patientCode}
                      onChange={(e) => setPatientCode(e.target.value)}
                      dir="rtl"
                      className="text-right"
                    />
                  </div>

                  <Button
                    className={cn("h-11 w-full sm:col-span-2", "bg-primary text-primary-foreground hover:bg-primary/90")}
                    onClick={() => loginMutation.mutate({ phone, patientCode })}
                    disabled={phone.length < 8 || !patientCode || loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "جاري التحقق..." : "دخول إلى بوابة المرضى"}
                  </Button>

                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <Link href="/my/book-guest">
                      <Button variant="outline" className="h-11 w-full gap-2 border-secondary/35 bg-secondary/5 text-secondary hover:bg-secondary/10 hover:text-secondary">
                        <CalendarPlus2 className="size-4" />
                        حجز موعد كزائر
                      </Button>
                    </Link>

                    <p className="text-center text-xs leading-5 text-muted-foreground">
                      <span>البيانات غير مسجلة؟ </span>
                      <span className="font-medium text-secondary">تواصل مع الاستقبال لتحديث بياناتك.</span>
                    </p>
                  </div>
                </div>
              </PortalPanel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
