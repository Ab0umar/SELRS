import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  CalendarPlus2,
  Clock3,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginShell, useLoginPalette } from "@/components/auth/LoginShell";
import { trpc } from "@/lib/trpc";
import { usePatientAuth } from "@/hooks/usePatientAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SERVICES = [
  "تصحيح الإبصار",
  "المياه البيضاء",
  "أشعة القرنية",
  "زراعة العدسات",
] as const;

const QUICK_LINKS = [
  { icon: Phone, title: "اتصل بنا", sub: "0403320833", href: "tel:0403320833" },
  {
    icon: MessageCircle,
    title: "واتساب",
    sub: "01285800309",
    href: "https://wa.me/201285800309",
  },
] as const;

const GUEST_POINTS = [
  "حجز فوري لجميع التخصصات المتاحة",
  "تأكيد الموعد عبر الهاتف من قبل الاستقبال",
  "إمكانية إنشاء ملف طبي فوري عند الحضور للمركز",
] as const;

export default function PatientLogin() {
  const [, navigate] = useLocation();
  const { login, isLoggedIn } = usePatientAuth();
  const { p, fieldRef, fieldClass } = useLoginPalette();
  const [activeTab, setActiveTab] = useState<"login" | "guest">("login");
  const [phone, setPhone] = useState("");
  const [patientCode, setPatientCode] = useState("");

  const loginMutation = trpc.patientPortal.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.patient);
      navigate("/my/file");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoggedIn) {
    navigate("/my/file");
    return null;
  }

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

  const tabClass = (active: boolean) =>
    cn(
      "flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors",
      active ? p.tabOn : p.tabOff,
    );

  const tile = cn("flex items-center gap-2.5 rounded-2xl p-3 no-underline", p.tile);
  const tileIcon = cn(
    "flex size-9 shrink-0 items-center justify-center rounded-xl",
    p.tileIcon,
  );

  return (
    <LoginShell
      title="مركز عيون الشروق"
      subtitle="لأمراض القرنية وتصحيح الإبصار"
      headerLink={{ href: "/login", label: "دخول النظام" }}
      footer={
        <p className={cn("m-0 flex items-center gap-1.5 font-bold", p.footStrong)}>
          <Clock3 className={cn("size-3.5 shrink-0", p.accent)} />
          يوميا من 10ص لـ 7م عدا الجمعه - الاطباء من 12ظ لـ 6م
        </p>
      }
    >
      <section className={cn("rounded-3xl p-5 sm:p-6", p.panel)}>
        <h2 className={cn("m-0 text-xl font-extrabold", p.heading)}>
          دخول المريض
        </h2>
        <p className={cn("mb-4 mt-1 text-xs leading-relaxed", p.muted)}>
          أدخل رقم الهاتف وكود المريض للوصول إلى ملفك الطبي أو احجز كزائر جديد.
        </p>

        <div className={cn("mb-4 grid grid-cols-2 rounded-xl p-1.5", p.seg)}>
          <Button
            variant="bare"
            type="button"
            onClick={() => setActiveTab("login")}
            className={tabClass(activeTab === "login")}
          >
            <UserCheck className="size-4" />
            <span>تسجيل الدخول</span>
          </Button>
          <Button
            variant="bare"
            type="button"
            onClick={() => setActiveTab("guest")}
            className={tabClass(activeTab === "guest")}
          >
            <UserPlus className="size-4" />
            <span>زائر جديد</span>
          </Button>
        </div>

        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className={cn("block text-xs font-bold", p.label)}>
                رقم الموبايل
              </label>
              <Input
                ref={fieldRef}
                aria-label="01XXXXXXXXX"
                type="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className={cn(fieldClass, "text-left")}
                autoComplete="tel"
                disabled={loginMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label className={cn("block text-xs font-bold", p.label)}>
                كود المريض
              </label>
              <Input
                ref={fieldRef}
                aria-label="مثال: 0093"
                type="text"
                placeholder="مثال: 0093"
                value={patientCode}
                onChange={(e) => setPatientCode(e.target.value)}
                dir="rtl"
                className={cn(fieldClass, "text-start")}
                disabled={loginMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              className={cn(
                "h-12 w-full cursor-pointer rounded-xl text-base font-bold shadow-md transition-all",
                p.cta,
              )}
              disabled={
                phone.length < 8 || !patientCode || loginMutation.isPending
              }
            >
              {loginMutation.isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="size-5 animate-spin" />
                  <span>جاري التحقق…</span>
                </div>
              ) : (
                "دخول إلى بوابة المرضى"
              )}
            </Button>

            <p className={cn("m-0 flex items-start gap-1.5 text-xs leading-5", p.muted)}>
              <ShieldCheck className={cn("mt-0.5 size-4 shrink-0", p.accent)} />
              <span>
                استخدم نفس رقم الهاتف الذي قدمته للاستقبال أول مرة. كود المريض
                يربطك بملفك وسجل الفحوصات والعمليات.
              </span>
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <h3 className={cn("m-0 text-base font-bold", p.heading)}>
                حجز موعد كحالة جديدة
              </h3>
              <p className={cn("m-0 text-xs leading-5", p.muted)}>
                إذا لم يسبق لك زيارة المركز أو لا تملك كود مريض مسجل، يمكنك طلب
                حجز موعد مباشرة كزائر.
              </p>
            </div>

            <ul
              className={cn(
                "m-0 list-none space-y-2 rounded-xl p-3 text-xs font-semibold leading-5",
                p.list,
              )}
            >
              {GUEST_POINTS.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-[13px] font-bold">
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Link href="/my/book-guest" className="block w-full">
              <Button
                className={cn(
                  "h-12 w-full cursor-pointer gap-2 rounded-xl text-base font-bold shadow-md",
                  p.cta,
                )}
              >
                <CalendarPlus2 className="size-5" />
                <span>البدء في حجز موعد كزائر</span>
              </Button>
            </Link>

            <p className={cn("m-0 text-center text-xs leading-5", p.muted)}>
              هل زرت المركز مسبقاً؟{" "}
              <span className={cn("font-medium", p.accent)}>
                تواصل مع الاستقبال للحصول على كود المريض.
              </span>
            </p>
          </div>
        )}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {QUICK_LINKS.map(({ icon: Icon, title, sub, href }) => (
          <a
            key={title}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className={tile}
          >
            <span className={tileIcon}>
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[13px] font-bold">{title}</span>
              <span dir="ltr" className={cn("block text-start text-[11px]", p.muted)}>
                {sub}
              </span>
            </span>
          </a>
        ))}
        <div className={cn(tile, "col-span-2 items-start")}>
          <span className={tileIcon}>
            <MapPin className="size-4" />
          </span>
          <span className="min-w-0 text-[13px] font-bold leading-5">
            بطرس مع الحلو اعلي توكيل ال جي - مركز أ.د محمد السعدني غرابه
            <span className={cn("block text-xs font-normal", p.muted)}>
              علي بيك الكبير - داخل مستشفي الشروق - الدور الثاني
            </span>
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {SERVICES.map((label) => (
          <span
            key={label}
            className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", p.chip)}
          >
            {label}
          </span>
        ))}
      </div>
    </LoginShell>
  );
}
