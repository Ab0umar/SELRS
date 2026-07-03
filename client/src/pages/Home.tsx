import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import {
  Eye,
  LockKeyhole,
  LogIn,
  Microscope,
  Scan,
  Stethoscope,
  UserRound,
  WifiOff,
  Zap,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
import { getApiUrl } from "@/const";
import { useAuth } from "@/hooks/useAuth";
import {
  getOfflineCacheSummary,
  subscribeNetworkStatus,
} from "@/lib/appRuntime";
import { BRAND_FOOTER_EN, BRAND_NAME_AR, BRAND_TAGLINE_AR } from "@/lib/brand";
import {
  NATIVE_LAST_USERNAME_KEY,
  hydrateDurableValue,
  saveDurableValue,
} from "@/lib/nativeStorage";

const SERVICES = [
  { icon: Zap, ar: "تصحيح الإبصار" },
  { icon: Eye, ar: "المياه البيضاء" },
  { icon: Scan, ar: "أشعة القرنية" },
  { icon: Microscope, ar: "زراعة العدسات" },
] as const;

const STATS = [
  { value: "+10K", label: "مريض" },
  { value: "15+", label: "طبيب" },
  { value: "24/7", label: "خدمة" },
] as const;

export default function Home() {
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState(() =>
    typeof window !== "undefined"
      ? (window.localStorage.getItem("last_username") ?? "")
      : "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem("remember_me") !== "0"
      : true,
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const offlineCacheSummary = getOfflineCacheSummary();

  useEffect(() => {
    if (loading || !user) return;
    const role = String((user as any)?.role ?? "").toLowerCase();
    setLocation(role === "accountant" ? "/accounting" : "/dashboard");
  }, [loading, user, setLocation]);

  useEffect(() => subscribeNetworkStatus((s) => setIsOnline(s.connected)), []);

  useEffect(() => {
    void hydrateDurableValue(NATIVE_LAST_USERNAME_KEY, "last_username").then(
      (stored) => {
        if (stored) setUsername(stored);
      },
    );
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "فشل تسجيل الدخول");
        return;
      }
      if (typeof window !== "undefined") {
        const persist = Capacitor.isNativePlatform() ? true : rememberMe;
        window.localStorage.setItem("remember_me", persist ? "1" : "0");
        window.localStorage.setItem("last_username", username.trim());
        void saveDurableValue(
          NATIVE_LAST_USERNAME_KEY,
          username.trim(),
          "last_username",
        );
        const store = persist ? window.localStorage : window.sessionStorage;
        const clear = persist ? window.sessionStorage : window.localStorage;
        clear.removeItem("user");
        clear.removeItem("token");
        store.removeItem("user");
        store.removeItem("token");
        if (data?.user) store.setItem("user", JSON.stringify(data.user));
        if (data?.token) store.setItem("token", String(data.token));
      }
      setLocation("/dashboard");
    } catch (err) {
      setError(
        !navigator.onLine
          ? "لا يوجد اتصال بالإنترنت. يرجى التحقق من الشبكة."
          : err instanceof Error
            ? err.message
            : "فشل تسجيل الدخول",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground/70" />
          <p className="text-sm font-medium text-primary-foreground/50">
            جاري التحميل...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-dvh w-full overflow-hidden flex flex-col lg:flex-row bg-white text-foreground font-sans selection:bg-[#2a4f9a]/10 selection:text-[#1f3f82]"
      dir="rtl"
    >
      {/* Brand panel (Right side on desktop, top banner on mobile) */}
      <div className="relative overflow-hidden w-full h-[34dvh] min-h-[220px] max-h-[285px] lg:h-auto lg:max-h-none lg:w-[56%] flex flex-col bg-gradient-to-br from-[#15296a] via-[#0f2050] to-[#0c1840] py-5 px-5 sm:p-8 lg:p-14 justify-between shrink-0">
        {/* soft glow blobs */}
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

        {/* Lockup (Logo + Title + Tagline) */}
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

        {/* Services Grid (Desktop 2x2, Mobile 1x4 horizontal chips) */}
        {/* Desktop 2x2 Grid */}
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

        {/* Mobile horizontal chips */}
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

      {/* Form Column (Left side on desktop, bottom sheet sliding up on mobile) */}
      <div className="flex-1 overflow-hidden bg-white rounded-t-[22px] lg:rounded-none -mt-5 lg:mt-0 p-5 sm:p-10 lg:p-20 flex flex-col justify-between relative z-10 shadow-[0_-8px_30px_rgba(15,32,80,0.06)] lg:shadow-none">
        {/* Top bar (for beautiful visual connection on mobile/desktop) */}
        <div className="lg:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-slate-200" />

        <div className="w-full max-w-[420px] mx-auto my-auto flex flex-col justify-center">
          <span className="inline-flex items-center gap-1.5 self-start text-[10px] sm:text-xs font-bold tracking-wider uppercase text-[#2a4f9a] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d39c2a]" />
            تسجيل دخول آمن
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2050] tracking-tight m-0">
            دخول النظام
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-4 sm:mb-8 leading-relaxed">
            أدخل بياناتك للوصول إلى نظام إدارة المرضى والفحوصات.
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-5">
            {error ? (
              <Alert className="border-destructive/20 bg-destructive/5 text-destructive font-medium text-xs py-2 rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {!isOnline ? (
              <Alert className="border-warning/25 bg-warning/10 py-2 text-warning-text rounded-xl">
                <AlertDescription className="text-xs font-medium">
                  وضع عدم الاتصال — {offlineCacheSummary.count} ملف مخزن
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <label
                className="block text-xs sm:text-sm font-bold text-slate-700"
                htmlFor="username"
              >
                اسم المستخدم
              </label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 border-[#e6edf5] bg-slate-50 rounded-xl pr-12 focus-visible:ring-primary/10 text-right font-medium"
                  disabled={submitting}
                  required
                  autoComplete="username"
                />
                <UserRound className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-xs sm:text-sm font-bold text-slate-700"
                htmlFor="password"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-[#e6edf5] bg-slate-50 rounded-xl pr-12 pl-12 focus-visible:ring-primary/10 text-right font-medium"
                  disabled={submitting}
                  required
                  autoComplete="current-password"
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1f3f82] accent-[#1f3f82] cursor-pointer"
                  disabled={submitting}
                />
                <span>تذكرني</span>
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs sm:text-sm font-bold text-[#2a4f9a] hover:underline"
              >
                نسيت كلمة المرور؟
              </a>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="bg-primary text-sm font-bold text-primary-foreground"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    دخول إلى النظام <LogIn className="size-5" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Portals divider */}
          <div className="flex items-center gap-3.5 my-4 sm:my-8">
            <div className="flex-1 h-px bg-[#e6edf5]" />
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              بوابات أخرى
            </span>
            <div className="flex-1 h-px bg-[#e6edf5]" />
          </div>

          {/* Portals Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Link href="/my/login">
              <div className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-[#e6edf5] bg-white px-3 py-4 sm:py-5 text-center cursor-pointer transition-all hover:border-[#d39c2a] hover:bg-[#fff8ec] hover:shadow-md">
                <span className="flex size-11 sm:size-12 items-center justify-center rounded-full bg-[#fec24e]/25 text-[#d39c2a] transition-colors group-hover:bg-[#d39c2a] group-hover:text-white">
                  <UserRound className="size-5 sm:size-6" />
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#0f2050]">
                  بوابة المريض
                </span>
              </div>
            </Link>
            <Link href="/doctor-portal/login">
              <div className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-[#e6edf5] bg-white px-3 py-4 sm:py-5 text-center cursor-pointer transition-all hover:border-[#1f3f82] hover:bg-[#eef2fb] hover:shadow-md">
                <span className="flex size-11 sm:size-12 items-center justify-center rounded-full bg-[#1f3f82]/10 text-[#1f3f82] transition-colors group-hover:bg-[#1f3f82] group-hover:text-white">
                  <Stethoscope className="size-5 sm:size-6" />
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#0f2050]">
                  بوابة الطبيب
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-4 pt-4 sm:mt-8 sm:pt-6 border-t border-[#e6edf5] flex flex-row items-center justify-between text-[11px] sm:text-xs text-slate-400 w-full">
          <div
            className={`flex items-center gap-1.5 font-bold ${isOnline ? "text-[#0f766e]" : "text-warning-text"}`}
          >
            {!isOnline && <WifiOff className="size-3.5" />}
            {isOnline
              ? "متصل بالنظام"
              : `غير متصل (${offlineCacheSummary.count})`}
          </div>
          <p className="m-0 text-slate-400/80">
            © {new Date().getFullYear()} مركز عيون الشروق
          </p>
        </footer>
      </div>
    </div>
  );
}
