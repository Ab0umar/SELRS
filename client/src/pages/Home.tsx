import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import {
  Eye,
  EyeOff,
  Stethoscope,
  UserRound,
  WifiOff,
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
import { BRAND_NAME_AR, BRAND_TAGLINE_AR } from "@/lib/brand";
import {
  NATIVE_LAST_USERNAME_KEY,
  hydrateDurableValue,
  saveDurableValue,
} from "@/lib/nativeStorage";

export default function Home() {
  const { loading, user, error: sessionError, refresh } = useAuth();
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
  const sessionData = (sessionError as { data?: { code?: string; httpStatus?: number } } | null)?.data;
  const sessionCheckFailed =
    !!sessionError &&
    sessionData?.code !== "UNAUTHORIZED" &&
    sessionData?.httpStatus !== 401;

  useEffect(() => {
    if (loading || !user) return;
    setLocation("/home");
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
      const session = await refresh();
      if (!session.data) {
        setError("تم تسجيل الدخول، لكن تعذر تأكيد الجلسة. حاول مرة أخرى.");
        return;
      }
      setLocation("/home");
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
      <div className="flex min-h-dvh items-center justify-center bg-background text-foreground" role="status">
        <Loader2 className="me-3 size-5 animate-spin" aria-hidden />
        <p className="text-sm">جارٍ التحقق من الجلسة...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground" dir="rtl">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <BrandLogo className="size-14 shrink-0 object-contain" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-2xl">{BRAND_NAME_AR}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{BRAND_TAGLINE_AR}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8 sm:px-6 sm:py-12">
        <h2 className="mb-6 text-2xl font-bold">تسجيل الدخول</h2>
        <form onSubmit={handleLogin} className="space-y-5" aria-busy={submitting}>
          {error ? (
            <Alert className="border-destructive bg-destructive/5 text-destructive-text">
              <AlertDescription className="text-destructive-text">{error}</AlertDescription>
            </Alert>
          ) : null}
          {sessionCheckFailed ? (
            <Alert className="border-warning bg-warning/10 text-warning-text">
              <AlertDescription>
                تعذر التحقق من الجلسة السابقة. يمكنك تسجيل الدخول من جديد.
              </AlertDescription>
            </Alert>
          ) : null}
          {!isOnline ? (
            <Alert className="border-warning bg-warning/10 text-warning-text">
              <WifiOff className="size-4" aria-hidden />
              <AlertDescription>وضع عدم الاتصال: {offlineCacheSummary.count} ملف مخزن</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="username">اسم المستخدم</label>
            <Input
              id="username"
              type="text"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 bg-card"
              disabled={submitting}
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="password">كلمة المرور</label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-card ps-3 pe-12"
                disabled={submitting}
                required
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
                disabled={submitting}
                className="absolute end-1 top-1 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </Button>
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-5 accent-primary rounded border-border"
              disabled={submitting}
            />
            <span>تذكرني</span>
          </label>
          <Button type="submit" variant="secondary" className="h-12 w-full font-semibold" disabled={submitting}>
            {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            {submitting ? "جارٍ التحقق..." : "دخول إلى النظام"}
          </Button>
        </form>

        <nav className="mt-8 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row" aria-label="بوابات المركز">
          <Link href="/my/login" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-primary hover:bg-muted">
            <UserRound className="size-4" aria-hidden />دخول المريض
          </Link>
          <Link href="/doctor-portal/login" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-primary hover:bg-muted">
            <Stethoscope className="size-4" aria-hidden />دخول الطبيب
          </Link>
        </nav>
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {BRAND_NAME_AR}
      </footer>
    </div>
  );
}
