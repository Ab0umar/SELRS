import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { Activity, LockKeyhole, LogIn, UserRound, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";
import { getApiUrl } from "@/const";
import { useAuth } from "@/hooks/useAuth";
import { getOfflineCacheSummary, subscribeNetworkStatus } from "@/lib/appRuntime";
import { BRAND_NAME_AR } from "@/lib/brand";
import { NATIVE_LAST_USERNAME_KEY, hydrateDurableValue, saveDurableValue } from "@/lib/nativeStorage";

export default function Home() {
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("last_username") ?? "";
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("remember_me") !== "0";
  });
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

  useEffect(() => subscribeNetworkStatus((status) => setIsOnline(status.connected)), []);

  useEffect(() => {
    void hydrateDurableValue(NATIVE_LAST_USERNAME_KEY, "last_username").then((stored) => {
      if (stored) setUsername(stored);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, rememberMe }),
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "فشل تسجيل الدخول");
        return;
      }

      if (typeof window !== "undefined") {
        const usePersistentStorage = Capacitor.isNativePlatform() ? true : rememberMe;
        window.localStorage.setItem("remember_me", usePersistentStorage ? "1" : "0");
        window.localStorage.setItem("last_username", username.trim());
        void saveDurableValue(NATIVE_LAST_USERNAME_KEY, username.trim(), "last_username");
        const store = usePersistentStorage ? window.localStorage : window.sessionStorage;
        const clear = usePersistentStorage ? window.sessionStorage : window.localStorage;
        clear.removeItem("user");
        clear.removeItem("token");
        store.removeItem("user");
        store.removeItem("token");
        if (data?.user) {
          store.setItem("user", JSON.stringify(data.user));
        }
        if (data?.token) {
          store.setItem("token", String(data.token));
        }
      }

      setLocation("/dashboard");
    } catch (error) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setError("لا يوجد اتصال بالإنترنت. يرجى التحقق من الشبكة.");
      } else {
        setError(error instanceof Error ? error.message : "فشل تسجيل الدخول");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4 text-center text-muted-foreground">
        <div className="space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="relative min-h-dvh overflow-hidden bg-muted text-muted-foreground selection:bg-primary/10"
    >

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="w-full max-w-[26rem]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
                SELRS
              </p>
              <h1 className="mt-1 text-sm font-medium tracking-wide text-muted-foreground">
                بوابة الطاقم الطبي
              </h1>
            </div>

            <div
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                isOnline
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/50 bg-warning/10 text-warning"
              }`}
            >
              {!isOnline ? <WifiOff className="h-3.5 w-3.5" /> : null}
              {isOnline ? "متصل" : `غير متصل (${offlineCacheSummary.count})`}
            </div>
          </div>

          <Card className="overflow-hidden rounded-[1.6rem] border border-border bg-background shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardContent className="space-y-5 px-6 py-7 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-border bg-primary/10">
                  <BrandLogo className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {BRAND_NAME_AR}
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                    تسجيل الدخول
                  </h2>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {error ? (
                  <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive">
                    <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                  </Alert>
                ) : null}

                {!isOnline ? (
                  <Alert className="border-warning/50 bg-warning/10 text-warning">
                    <AlertDescription className="text-sm font-medium">
                      أنت تعمل في وضع عدم الاتصال، سيتم حفظ آخر اسم مستخدم فقط ({offlineCacheSummary.count} ملف مخزن)
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    اسم المستخدم
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="اسم المستخدم"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-14 rounded-[1rem] border-border bg-muted/80 pr-12 text-left text-[15px] font-medium shadow-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
                      dir="ltr"
                      disabled={submitting}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 rounded-[1rem] border-border bg-muted/80 pr-12 text-left text-[15px] font-medium shadow-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
                      dir="ltr"
                      disabled={submitting}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[1rem] border border-border bg-muted/70 px-4 py-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">تذكرني</div>
                    <div className="text-[11px] text-muted-foreground">
                      {rememberMe ? "يبقى الدخول محفوظًا على هذا الجهاز" : "جلسة مؤقتة"}
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                      disabled={submitting}
                    />
                    <div className="h-7 w-12 rounded-full bg-border transition-colors peer-checked:bg-primary" />
                    <div className="absolute left-1 h-5 w-5 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-[1rem] bg-primary text-[15px] font-bold text-primary-foreground shadow-[0_14px_28px_rgba(0,31,71,0.14)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submitting}
                >
                  {submitting ? (
                    "جاري تسجيل الدخول..."
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      تسجيل الدخول
                      <LogIn className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span>{isOnline ? "متصل بالإنترنت" : `مخزن محليًا (${offlineCacheSummary.count})`}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
