import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getApiUrl } from "@/const";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, LockKeyhole, LogIn, UserRound, WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_NAME_AR, BRAND_TAGLINE_AR } from "@/lib/brand";
import {
  getOfflineCacheSummary,
  subscribeNetworkStatus } from "@/lib/appRuntime";
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
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const offlineCacheSummary = getOfflineCacheSummary();

  useEffect(() => {
    if (loading || !user) return;
    // If user is already authenticated, redirect to dashboard
    setLocation("/dashboard");
  }, [loading, user, setLocation]);

  useEffect(() => {
    return subscribeNetworkStatus((status) => setIsOnline(status.connected));
  }, []);

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
        setError(data?.error || "Failed to sign in");
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
        setError("No internet connection. Reconnect, then try again.");
      } else {
        setError(error instanceof Error ? error.message : "Failed to sign in");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="selrs-login-bg relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[48vh] bg-[radial-gradient(circle_at_62%_20%,rgba(0,61,130,0.10),transparent_30%),radial-gradient(circle_at_12%_30%,rgba(255,149,0,0.15),transparent_28%),linear-gradient(180deg,var(--background)_0%,color-mix(in_oklch,var(--muted)_55%,var(--background))_100%)] dark:bg-[radial-gradient(circle_at_62%_20%,rgba(0,61,130,0.22),transparent_32%),radial-gradient(circle_at_12%_30%,rgba(255,149,0,0.14),transparent_30%),linear-gradient(180deg,var(--background)_0%,color-mix(in_oklch,var(--muted)_35%,var(--background))_100%)]" />
        <div className="absolute left-[-5rem] top-24 h-48 w-48 rounded-full bg-secondary/25 blur-3xl dark:bg-secondary/15" />
        <div className="absolute right-[-5rem] top-36 h-56 w-56 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30" />
        <Eye className="absolute left-1/2 top-20 h-44 w-44 -translate-x-1/2 text-primary/[0.045] dark:text-primary/[0.08]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-between pt-[max(env(safe-area-inset-top),1rem)] lg:grid lg:grid-cols-[1fr_28rem] lg:items-center lg:gap-8 lg:px-8 lg:py-10">
        <header className="px-5 pb-8 lg:px-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_14px_40px_rgba(0,61,130,0.12)] dark:border-border dark:shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
                <BrandLogo className="h-full w-full" imgClassName="p-1" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black leading-tight text-primary sm:text-3xl">{BRAND_NAME_AR}</h1>
                <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">{BRAND_TAGLINE_AR}</p>
              </div>
            </div>
            <div className="rounded-full border border-primary/20 bg-card/90 px-3 py-1.5 text-sm font-black tracking-[0.18em] text-primary shadow-sm dark:border-border">
              SELRS
            </div>
          </div>

          <div className="mt-8 hidden max-w-xl lg:block">
            <h2 className="text-4xl font-black leading-tight text-foreground">تسجيل دخول أسرع وأوضح للعيادة</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              واجهة مناسبة للموبايل والويب مع حالة اتصال واضحة وتجربة دخول بسيطة.
            </p>
          </div>
        </header>

        <Card className="relative mx-0 rounded-t-[2rem] rounded-b-none border-x-0 border-b-0 border-t border-border/80 bg-card/95 text-card-foreground shadow-[0_-18px_60px_rgba(15,23,42,0.14)] backdrop-blur dark:shadow-[0_-18px_60px_rgba(0,0,0,0.45)] lg:mx-0 lg:rounded-[2rem] lg:border lg:border-border lg:shadow-[0_24px_70px_rgba(15,23,42,0.14)] dark:lg:shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-x-10 top-0 h-1 rounded-b-full bg-gradient-to-r from-primary via-primary to-secondary" />
          <CardContent className="px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-8 sm:px-7 sm:pb-7">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-black tracking-tight text-primary">تسجيل الدخول</h2>
              <p className="mt-2 text-sm font-medium text-muted-foreground">أدخل بياناتك للمتابعة إلى النظام</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-right">
              {!isOnline ? (
                <Alert className="border-amber-200 bg-amber-50/90 text-amber-950">
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    الجهاز غير متصل بالإنترنت. بيانات الإعدادات المخزنة محليًا المتاحة الآن: {offlineCacheSummary.count}.
                  </AlertDescription>
                </Alert>
              ) : null}
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-bold text-foreground">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="اسم المستخدم أو البريد الإلكتروني"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-14 rounded-2xl border-border bg-background pr-12 text-left text-base shadow-sm"
                    dir="ltr"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-bold text-foreground">
                  كلمة المرور
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 rounded-2xl border-border bg-background pr-12 text-left text-base shadow-sm"
                    dir="ltr"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-3 dark:bg-muted/30">
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">تذكرني</div>
                  <div className="text-xs text-muted-foreground">{rememberMe ? "سيتم حفظ الجلسة" : "جلسة مؤقتة"}</div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                    disabled={submitting}
                  />
                  <span className="h-8 w-14 rounded-full bg-muted-foreground/25 transition-colors peer-checked:bg-primary" />
                  <span className="absolute left-1 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6" />
                </label>
              </div>

              <Button
                type="submit"
                className="h-14 w-full rounded-2xl bg-gradient-to-l from-primary to-[#0067d6] text-base font-black text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-95"
                disabled={submitting}
              >
                {submitting ? (
                  "جاري تسجيل الدخول..."
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    دخول إلى النظام
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

