import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getApiUrl } from "@/const";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, DatabaseZap, Eye, ShieldCheck, WifiOff } from "lucide-react";
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
    <div
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dbeafe_0%,rgba(219,234,254,0.35)_24%,transparent_50%),linear-gradient(135deg,#f8fbff_0%,#eef6ff_34%,#f8fafc_100%)]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-5rem] top-[-4rem] h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute bottom-[-3rem] left-[-4rem] h-64 w-64 rounded-full bg-amber-100/70 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_minmax(0,28rem)] lg:items-center">
          <section className="hidden rounded-[2rem] border border-white/70 bg-white/55 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-sm font-medium text-sky-700">
              <Eye className="h-4 w-4" />
              منصة مركز عيون الشروق
            </div>
            <div className="mt-6 max-w-xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-900">
                واجهة أسرع وأوضح لإدارة المرضى والفحوصات داخل SELRS
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                دخول آمن، حالة اتصال واضحة، وتجربة مناسبة للويب والتطبيق مع جاهزية أفضل للعمل اليومي داخل العيادة.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <div className="mt-3 text-sm font-semibold text-slate-900">تسجيل آمن</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">حفظ الجلسة بالشكل المناسب للجهاز والمتصفح.</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                <DatabaseZap className="h-5 w-5 text-amber-600" />
                <div className="mt-3 text-sm font-semibold text-slate-900">جاهزية أوفلاين</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">بيانات إعدادات محفوظة محليًا لتقليل التعطل أثناء الانقطاع.</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-sky-700" />
                <div className="mt-3 text-sm font-semibold text-slate-900">مؤشرات واضحة</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">إصدار البناء وحالة التطبيق ظاهرين بدون تشويش.</div>
              </div>
            </div>
          </section>

          <Card className="relative overflow-hidden border-white/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f766e_0%,#2563eb_48%,#d97706_100%)]" />
            <CardHeader className="space-y-4 pb-4 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border border-sky-100 bg-white shadow-sm">
                <img src="/logo.png" alt="SELRS logo" className="h-20 w-20 object-contain" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900">SELRS</CardTitle>
                <CardDescription className="text-base text-slate-600">تسجيل الدخول إلى نظام مركز عيون الشروق</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
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
                  <label htmlFor="username" className="block text-sm font-semibold text-slate-700">
                    اسم المستخدم
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="أدخل اسم المستخدم"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-white text-left shadow-sm"
                    dir="ltr"
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    كلمة المرور
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-white text-left shadow-sm"
                    dir="ltr"
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-800">تذكرني على هذا الجهاز</div>
                    <div className="text-xs text-slate-500">{rememberMe ? "سيتم حفظ الجلسة" : "سيتم إنهاء الجلسة عند إغلاق المتصفح"}</div>
                  </div>
                  <label className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${rememberMe ? "text-emerald-700" : "text-slate-500"}`}>
                      {rememberMe ? "مفعل" : "متوقف"}
                    </span>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-5 w-5 rounded border-2 border-slate-400 bg-white accent-sky-600"
                      disabled={submitting}
                    />
                  </label>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_55%,#1d4ed8_100%)] text-base font-bold shadow-lg shadow-sky-200/70 hover:opacity-95"
                  disabled={submitting}
                >
                  {submitting ? "جاري تسجيل الدخول..." : "دخول إلى النظام"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

