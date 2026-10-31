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
import { LoginShell, useLoginPalette } from "@/components/auth/LoginShell";
import { getApiUrl } from "@/const";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  getOfflineCacheSummary,
  subscribeNetworkStatus,
} from "@/lib/appRuntime";
import { BRAND_NAME_AR, BRAND_TAGLINE_AR } from "@/lib/brand";
import { isAiMobileApp } from "@/lib/ai-mobile";
import {
  NATIVE_LAST_USERNAME_KEY,
  hydrateDurableValue,
  saveDurableValue,
} from "@/lib/nativeStorage";

export default function Home() {
  const { loading, user, error: sessionError, refresh } = useAuth();
  const { p, fieldRef, fieldClass } = useLoginPalette();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState(() =>
    typeof window !== "undefined"
      ? (window.localStorage.getItem("last_username") ?? "")
      : "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Accounting database year; "auto" follows the calendar year (switches by itself on 1 January).
  const [mssqlYear, setMssqlYear] = useState("auto");
  const [yearOptions, setYearOptions] = useState<{
    current: number;
    years: number[];
  } | null>(null);
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
    setLocation(isAiMobileApp() ? "/ai" : "/home");
  }, [loading, user, setLocation]);

  useEffect(() => subscribeNetworkStatus((s) => setIsOnline(s.connected)), []);

  useEffect(() => {
    let cancelled = false;
    void fetch(getApiUrl("/api/auth/mssql-years"))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.years)) return;
        setYearOptions({ current: Number(data.current), years: data.years.map(Number) });
      })
      .catch(() => {
        // Offline or MSSQL unreachable: keep the automatic year only.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        body: JSON.stringify({ username, password, rememberMe, year: mssqlYear }),
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
      setLocation(isAiMobileApp() ? "/ai" : "/home");
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
    <LoginShell
      title={isAiMobileApp() ? "SELRS AI" : BRAND_NAME_AR}
      subtitle={isAiMobileApp() ? "أدوات الذكاء الاصطناعي" : BRAND_TAGLINE_AR}
    >
      <section className={cn("rounded-3xl p-5 sm:p-6", p.panel)}>
        <h2 className={cn("m-0 mb-4 text-xl font-extrabold", p.heading)}>
          تسجيل الدخول
        </h2>
        <form onSubmit={handleLogin} className="space-y-4" aria-busy={submitting}>
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
          <div className="space-y-1.5">
            <label className={cn("block text-xs font-bold", p.label)} htmlFor="username">اسم المستخدم</label>
            <Input
              ref={fieldRef}
              id="username"
              type="text"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={fieldClass}
              disabled={submitting}
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div className="space-y-1.5">
            <label className={cn("block text-xs font-bold", p.label)} htmlFor="password">كلمة المرور</label>
            <div className="relative">
              <Input
                ref={fieldRef}
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(fieldClass, "ps-3 pe-12")}
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
                className={cn("absolute end-1 top-2", p.muted)}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </Button>
            </div>
          </div>
          {yearOptions && yearOptions.years.length > 1 ? (
            <div className="space-y-1.5">
              <label className={cn("block text-xs font-bold", p.label)} htmlFor="mssql-year">السنة</label>
              <select
                ref={fieldRef}
                id="mssql-year"
                value={mssqlYear}
                onChange={(e) => setMssqlYear(e.target.value)}
                className={cn(fieldClass, "w-full border px-3 text-sm")}
                disabled={submitting}
              >
                <option value="auto">تلقائي (سنة {yearOptions.current})</option>
                {yearOptions.years
                  .filter((year) => year !== yearOptions.current)
                  .map((year) => (
                    <option key={year} value={String(year)}>
                      {year} (قراءة فقط لغير الأدمن)
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-5 rounded border-border accent-[#f2873a]"
              disabled={submitting}
            />
            <span>تذكرني</span>
          </label>
          <Button
            type="submit"
            className={cn("h-12 w-full cursor-pointer rounded-xl text-base font-bold shadow-md", p.cta)}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            {submitting ? "جارٍ التحقق..." : "دخول إلى النظام"}
          </Button>
        </form>

        {!isAiMobileApp() && (
          <nav className={cn("mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row", p.list, "border-x-0 border-b-0 bg-transparent")} aria-label="بوابات المركز">
            <Link href="/my/login" className={cn("inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium", p.accent)}>
              <UserRound className="size-4" aria-hidden />دخول المريض
            </Link>
            <Link href="/doctor-portal/login" className={cn("inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium", p.accent)}>
              <Stethoscope className="size-4" aria-hidden />دخول الطبيب
            </Link>
          </nav>
        )}
      </section>
    </LoginShell>
  );
}
