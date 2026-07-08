import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  CalendarPlus2,
  Clock3,
  Eye,
  Hospital,
  Loader2,
  MapPin,
  MessageCircle,
  Microscope,
  Phone,
  Scan,
  ShieldCheck,
  Smartphone,
  UserCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { usePatientAuth } from "@/hooks/usePatientAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SERVICES = [
  { icon: Zap, ar: "تصحيح الإبصار" },
  { icon: Eye, ar: "المياه البيضاء" },
  { icon: Scan, ar: "أشعة القرنية" },
  { icon: Microscope, ar: "زراعة العدسات" },
] as const;

const InfoLine = ({
  icon: Icon,
  value,
  dir = "rtl",
  align = "right",
}: {
  icon: LucideIcon;
  value: string;
  dir?: "rtl" | "ltr";
  align?: "right" | "left";
}) => (
  <div
    dir={align === "left" ? "ltr" : "rtl"}
    className={cn(
      "flex items-start gap-1.5 text-[11px] font-bold leading-5 text-[#0f2050]",
      align === "left" ? "justify-start text-left" : "justify-start text-right",
    )}
  >
    <Icon className="mt-0.5 size-3.5 shrink-0 text-[#1f3f82]" />
    <span
      dir={dir}
      className="min-w-0 [unicode-bidi:isolate]"
    >
      {value}
    </span>
  </div>
);

const InfoBlock = ({
  icon: Icon,
  value,
}: {
  icon: LucideIcon;
  value: string;
}) => (
  <div
    dir="rtl"
    className="flex items-start gap-1.5 text-right text-[11px] font-bold leading-5 text-[#0f2050]"
  >
    <Icon className="mt-0.5 size-3.5 shrink-0 text-[#1f3f82]" />
    <span dir="rtl" className="min-w-0 [unicode-bidi:isolate]">
      <span>{value}</span>
    </span>
  </div>
);

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

      <div className="flex-1 overflow-y-auto bg-white rounded-t-[22px] lg:rounded-none -mt-5 lg:mt-0 p-5 sm:p-10 lg:p-20 flex flex-col justify-between relative z-10 shadow-[0_-8px_30px_rgba(15,32,80,0.06)] lg:shadow-none">
        <div className="lg:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-slate-200" />

        <div className="w-full max-w-[420px] mx-auto my-auto flex flex-col justify-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2050] tracking-tight m-0">
            دخول المريض
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-4 sm:mb-8 leading-relaxed">
            أدخل رقم الهاتف وكود المريض للوصول إلى ملفك الطبي أو احجز كزائر
            جديد.
          </p>

          <div className="grid grid-cols-2 p-1.5 bg-slate-50 rounded-xl border border-[#e6edf5] mb-4 sm:mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors cursor-pointer",
                activeTab === "login"
                  ? "bg-white text-[#1f3f82] shadow-sm border border-[#e6edf5]"
                  : "text-slate-500 hover:text-[#0f2050]",
              )}
            >
              <UserCheck className="size-4" />
              <span>تسجيل الدخول</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guest")}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors cursor-pointer",
                activeTab === "guest"
                  ? "bg-white text-[#1f3f82] shadow-sm border border-[#e6edf5]"
                  : "text-slate-500 hover:text-[#0f2050]",
              )}
            >
              <UserPlus className="size-4" />
              <span>زائر جديد</span>
            </button>
          </div>

          {activeTab === "login" ? (
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-3 sm:space-y-5"
            >
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-700">
                  رقم الموبايل
                </label>
                <Input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="h-12 text-left font-medium tracking-wide border-[#e6edf5] bg-slate-50 focus-visible:ring-primary/10 rounded-xl"
                  autoComplete="tel"
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-700">
                  كود المريض
                </label>
                <Input
                  type="text"
                  placeholder="مثال: 0093"
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  dir="rtl"
                  className="h-12 text-right font-medium border-[#e6edf5] bg-slate-50 focus-visible:ring-primary/10 rounded-xl"
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="h-12 w-full text-base font-bold bg-[#1f3f82] text-white hover:bg-[#1f3f82]/90 transition-all rounded-xl shadow-lg shadow-[#1f3f82]/20 cursor-pointer"
                  disabled={
                    phone.length < 8 || !patientCode || loginMutation.isPending
                  }
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-5 animate-spin" />
                      <span>جاري التحقق...</span>
                    </div>
                  ) : (
                    "دخول إلى بوابة المرضى"
                  )}
                </Button>
              </div>

              <div className="hidden sm:block rounded-xl border border-[#e6edf5] bg-slate-50 p-3.5 text-xs text-slate-500 space-y-1 leading-5">
                <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>تنبيه أمان البيانات</span>
                </div>
                <p>
                  استخدم نفس رقم الهاتف الذي قدمته لموظف الاستقبال عند التسجيل
                  أول مرة.
                </p>
                <p>
                  كود المريض يربطك مباشرة بملفك وسجل الفحوصات والعمليات الخاص
                  بك.
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-3 sm:space-y-5">
              <div className="space-y-2 text-center py-1 sm:py-2">
                <h3 className="text-base font-bold text-[#0f2050]">
                  حجز موعد كحالة جديدة
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-5 sm:leading-6">
                  إذا لم يسبق لك زيارة المركز أو لا تملك كود مريض مسجل، يمكنك
                  طلب حجز موعد مباشرة كزائر لتسجيل ملفك الطبي الجديد.
                </p>
              </div>

              <div className="rounded-xl border border-[#e6edf5] bg-slate-50 p-3 sm:p-4 space-y-2 sm:space-y-3.5">
                <div className="flex items-start gap-2.5 text-xs leading-5">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#d39c2a]/15 text-[#d39c2a] font-bold text-[10px]">
                    ✓
                  </div>
                  <div className="font-semibold text-slate-700">
                    حجز فوري لجميع التخصصات المتاحة
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs leading-5">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#d39c2a]/15 text-[#d39c2a] font-bold text-[10px]">
                    ✓
                  </div>
                  <div className="font-semibold text-slate-700">
                    تأكيد الموعد عبر الهاتف من قبل الاستقبال
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs leading-5">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#d39c2a]/15 text-[#d39c2a] font-bold text-[10px]">
                    ✓
                  </div>
                  <div className="font-semibold text-slate-700">
                    إمكانية إنشاء ملف طبي فوري عند الحضور للمركز
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/my/book-guest" className="w-full">
                  <Button className="h-12 w-full text-base font-bold bg-[#1f3f82] text-white hover:bg-[#1f3f82]/90 transition-all rounded-xl shadow-lg shadow-[#1f3f82]/20 gap-2 cursor-pointer">
                    <CalendarPlus2 className="size-5" />
                    <span>البدء في حجز موعد كزائر</span>
                  </Button>
                </Link>
              </div>

              <p className="text-center text-xs leading-5 text-slate-500">
                <span>هل زرت المركز مسبقاً؟ </span>
                <span className="font-medium text-[#2a4f9a]">
                  يرجى التواصل مع الاستقبال للحصول على كود المريض الخاص بك.
                </span>
              </p>
            </div>
          )}

          <div className="mt-4 space-y-1.5 rounded-xl border border-[#e6edf5] bg-slate-50 p-3 sm:mt-5">
            <InfoLine
              icon={Phone}
              value="0403320833 - 0403288778"
              dir="ltr"
              align="left"
            />
            <InfoLine
              icon={Smartphone}
              value="01272303303 - 01027357352"
              dir="ltr"
              align="left"
            />
            <InfoLine
              icon={MessageCircle}
              value="01285800309"
              dir="ltr"
              align="left"
            />
            <InfoBlock
              icon={MapPin}
              value="بطرس مع الحلو اعلي توكيل ال جي - مركز أ.د محمد السعدني غرابه"
            />
            <InfoBlock
              icon={Hospital}
              value="علي بيك الكبير - داخل مستشفي الشروق - الدور الثاني"
            />
            <div
              dir="rtl"
              className="mt-2 flex items-center justify-center gap-1.5 border-t border-[#e6edf5] pt-2 text-center text-[11px] font-bold text-[#0f2050]"
            >
              <Clock3 className="size-3.5 shrink-0 text-[#1f3f82]" />
              <p className="m-0">
                يوميا من 10ص لـ 7م عدا الجمعه - الاطباء من 12ظ لـ 6م
              </p>
            </div>
          </div>
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
