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
import {
  BRAND_FOOTER_EN,
  BRAND_NAME_AR,
  BRAND_TAGLINE_AR,
} from "@/lib/brand";
import {
  NATIVE_LAST_USERNAME_KEY,
  hydrateDurableValue,
  saveDurableValue,
} from "@/lib/nativeStorage";

const SERVICES = [
  { icon: Zap,        ar: "تصحيح الإبصار" },
  { icon: Eye,        ar: "المياه البيضاء" },
  { icon: Scan,       ar: "أشعة القرنية"   },
  { icon: Microscope, ar: "زراعة العدسات"  },
] as const;

const STATS = [
  { value: "+10K", label: "مريض"  },
  { value: "15+",  label: "طبيب"  },
  { value: "24/7", label: "خدمة"  },
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

  useEffect(
    () => subscribeNetworkStatus((s) => setIsOnline(s.connected)),
    [],
  );

  useEffect(() => {
    void hydrateDurableValue(NATIVE_LAST_USERNAME_KEY, "last_username").then(
      (stored) => { if (stored) setUsername(stored); },
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
      if (!res.ok) { setError(data?.error || "فشل تسجيل الدخول"); return; }
      if (typeof window !== "undefined") {
        const persist = Capacitor.isNativePlatform() ? true : rememberMe;
        window.localStorage.setItem("remember_me", persist ? "1" : "0");
        window.localStorage.setItem("last_username", username.trim());
        void saveDurableValue(NATIVE_LAST_USERNAME_KEY, username.trim(), "last_username");
        const store = persist ? window.localStorage : window.sessionStorage;
        const clear = persist ? window.sessionStorage : window.localStorage;
        clear.removeItem("user"); clear.removeItem("token");
        store.removeItem("user"); store.removeItem("token");
        if (data?.user)  store.setItem("user",  JSON.stringify(data.user));
        if (data?.token) store.setItem("token", String(data.token));
      }
      setLocation("/dashboard");
    } catch (err) {
      setError(
        !navigator.onLine
          ? "لا يوجد اتصال بالإنترنت. يرجى التحقق من الشبكة."
          : err instanceof Error ? err.message : "فشل تسجيل الدخول",
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
          <p className="text-sm font-medium text-primary-foreground/50">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between bg-[#F4F8FB] text-foreground font-sans selection:bg-secondary/20 selection:text-secondary-foreground"
      dir="rtl"
    >
      {/* Top brand gradient bar */}
      <div className="h-2 w-full bg-gradient-to-r from-[#003D82] via-[#FF6B35] to-[#003D82]" />

      {/* Main content container */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">

        {/* Brand header above card */}
        <div className="w-full max-w-[480px] mb-8 flex flex-row items-center justify-center gap-3.5 px-2">
          <BrandLogo className="size-24 object-contain select-none shrink-0" />
          <div className="text-right flex flex-col justify-center gap-2">
            <h1 className="text-3xl font-extrabold text-[#0F3E7C] leading-none m-0">
              مركز عيون الشروق
            </h1>
            <p className="text-[14px] font-bold text-[#FC9918] leading-none m-0">
              لامراض القرنيه و تصحيح الابصار
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-[#dbe7f4] bg-white p-6 shadow-[0_20px_50px_rgba(28,64,104,0.05)] sm:p-8">

          {/* Card heading */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <LogIn className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                تسجيل دخول آمن
              </p>
              <h2 className="text-xl font-bold text-foreground leading-tight">
                دخول النظام
              </h2>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground" htmlFor="username">
                  اسم المستخدم
                </label>
              </div>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 text-center font-medium border-[#d7e2ee] focus-visible:ring-primary/10 rounded-full pl-10"
                  disabled={submitting}
                  required
                  autoComplete="username"
                />
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground" htmlFor="password">
                  كلمة المرور
                </label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 font-medium border-[#d7e2ee] focus-visible:ring-primary/10 rounded-full px-10 text-center"
                  disabled={submitting}
                  required
                  autoComplete="current-password"
                />
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <button
                  type="button"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 transition-colors hover:text-muted-foreground cursor-pointer"
                  tabIndex={-1}
                >
                  <Eye className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs font-bold text-primary hover:underline"
              >
                نسيت كلمة المرور؟
              </a>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">تذكرني</span>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  disabled={submitting}
                />
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="h-12 w-full text-base font-bold bg-[#FF9E00] text-white hover:bg-[#FF9E00]/90 transition-colors rounded-full shadow-xs cursor-pointer"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    تسجيل الدخول <LogIn className="size-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Portal links */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border/50" />
              <span className="text-[10px] font-bold text-muted-foreground/60">بوابات أخرى</span>
              <div className="flex-1 border-t border-border/50" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/my/login">
                <div className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-[#F4F8FB] text-[11px] font-bold text-foreground transition-colors hover:border-primary/25 hover:bg-[#e2edf7]">
                  <UserRound className="size-3.5 text-muted-foreground" /> دخول المريض
                </div>
              </Link>
              <Link href="/doctor-portal/login">
                <div className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-[#F4F8FB] text-[11px] font-bold text-foreground transition-colors hover:border-primary/25 hover:bg-[#e2edf7]">
                  <Stethoscope className="size-3.5 text-muted-foreground" /> دخول الطبيب
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 border-t border-[#dbe7f4] bg-white flex flex-col sm:flex-row items-center justify-between px-6 gap-2 text-xs text-muted-foreground">
        <div className={`flex items-center gap-1.5 font-bold ${isOnline ? "text-primary/50" : "text-warning-text"}`}>
          {!isOnline && <WifiOff className="size-3.5" />}
          {isOnline ? "متصل بالنظام" : `غير متصل (${offlineCacheSummary.count})`}
        </div>
        <p className="text-[11px] text-muted-foreground/50">© {new Date().getFullYear()} مركز عيون الشروق. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
