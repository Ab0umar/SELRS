import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden selrs-login-bg p-4"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute start-[-5rem] top-[-4rem] h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-3rem] end-[-4rem] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <Card className="selrs-glass-card relative mx-auto w-full max-w-xl overflow-hidden border-white/80 bg-background/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-primary"
          aria-hidden
        />
        <CardContent className="relative pt-8 pb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[13px] font-semibold uppercase text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-destructive" />
            رابط غير موجود
          </div>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/10 rounded-full" />
              <AlertCircle className="relative h-16 w-16 text-destructive" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>

          <h2 className="mb-4 text-xl font-semibold text-foreground">
            الصفحة غير موجودة
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            عذراً، الصفحة التي تبحث عنها غير موجودة.
            <br />
            ربما تم نقلها أو حذفها.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="px-6 py-2.5 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 ms-2" />
              الصفحة الرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
