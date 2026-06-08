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
    <div dir="rtl" className="flex min-h-dvh flex-col bg-background">

      {/* ── Navy top section ── */}
      <div className="relative overflow-hidden bg-primary px-6 pb-7 pt-10 sm:pt-12">
        <div className="pointer-events-none absolute -left-12 -top-12 h-52 w-52 rounded-full bg-secondary/15 blur-[70px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5 blur-[60px]" aria-hidden />

        {/* Logo + clinic name */}
        <div className="relative flex items-center gap-4">
          <div className="flex-shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/20">
            <BrandLogo className="h-14 w-14" />
          </div>
          <div>
            <h1 className="text-[1.75rem] font-black leading-none tracking-tight text-primary-foreground">
              {BRAND_NAME_AR}
            </h1>
            <p className="mt-1.5 text-[13px] font-bold text-secondary">{BRAND_TAGLINE_AR}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-5 flex items-stretch rounded-xl bg-white/8 ring-1 ring-white/10">
          {STATS.map(({ value, label }, i) => (
            <div key={label} className="flex flex-1 items-center">
              {i > 0 && <div className="h-8 w-px flex-shrink-0 bg-white/15" />}
              <div className="flex flex-1 flex-col items-center py-2.5">
                <p className="text-base font-black text-primary-foreground">{value}</p>
                <p className="text-[10px] font-medium text-primary-foreground/55">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Service pills */}
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {SERVICES.map(({ icon: Icon, ar }) => (
            <div
              key={ar}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10.5px] font-semibold text-primary-foreground/85 ring-1 ring-white/15"
            >
              <Icon className="h-2.5 w-2.5 text-secondary" />
              {ar}
            </div>
          ))}
        </div>
      </div>

      {/* ── White form section — fills remaining height ── */}
      <div className="flex flex-1 flex-col px-6 py-5">
        <div className="flex flex-1 flex-col gap-4">

          <div>
            <h2 className="text-lg font-black text-foreground">تسجيل الدخول</h2>
            <p className="text-xs text-muted-foreground">أدخل بياناتك للوصول إلى النظام</p>
          </div>

          {error ? (
            <Alert className="border-destructive/20 bg-destructive/8 py-2 text-destructive-text">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : null}
          {!isOnline ? (
            <Alert className="border-warning/25 bg-warning/10 py-2 text-warning-text">
              <AlertDescription className="text-xs">
                وضع عدم الاتصال — {offlineCacheSummary.count} ملف مخزن
              </AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="username" className="text-xs font-semibold text-foreground">اسم المستخدم</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="username" type="text" placeholder="أدخل اسم المستخدم"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  className="h-9 rounded-lg border-border bg-muted/40 pr-9 text-left text-sm placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                  dir="ltr" disabled={submitting} required autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold text-foreground">كلمة المرور</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="password" type={showPassword ? "text" : "password"} placeholder="أدخل كلمة المرور"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-9 rounded-lg border-border bg-muted/40 px-9 text-left text-sm placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                  dir="ltr" disabled={submitting} required autoComplete="current-password"
                />
                <button
                  type="button" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                  tabIndex={-1}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary" disabled={submitting} />
                <span className="text-xs text-muted-foreground">تذكرني</span>
              </label>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-xs font-medium text-primary hover:underline">
                نسيت كلمة المرور؟
              </a>
            </div>

            <Button
              type="submit"
              className="h-10 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "جاري تسجيل الدخول..." : (
                <span className="flex items-center justify-center gap-2">تسجيل الدخول <LogIn className="h-4 w-4" /></span>
              )}
            </Button>
          </form>

          {/* Portal links */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border/50" />
              <span className="text-[10px] font-semibold text-muted-foreground/60">بوابات أخرى</span>
              <div className="flex-1 border-t border-border/50" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/my/login">
                <div className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-muted">
                  <UserRound className="h-3 w-3 text-muted-foreground" /> دخول المريض
                </div>
              </Link>
              <Link href="/doctor-portal/login">
                <div className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-muted">
                  <Stethoscope className="h-3 w-3 text-muted-foreground" /> دخول الطبيب
                </div>
              </Link>
            </div>
          </div>

        </div>

        {/* Footer — pushed to bottom */}
        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${
            isOnline ? "text-primary/50" : "text-warning-text"
          }`}>
            {!isOnline && <WifiOff className="h-3 w-3" />}
            {isOnline ? "متصل بالنظام" : `غير متصل (${offlineCacheSummary.count})`}
          </div>
          <p className="text-[9px] text-muted-foreground/40">{BRAND_FOOTER_EN}</p>
        </div>
      </div>

    </div>
  );
}
