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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden selrs-login-bg p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-5rem] top-[-4rem] h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--selrs-navy)_12%,transparent)] blur-3xl" />
        <div className="absolute bottom-[-3rem] left-[-4rem] h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--selrs-orange)_18%,transparent)] blur-3xl" />
      </div>
      <Card className="selrs-glass-card relative mx-auto w-full max-w-xl overflow-hidden border-white/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" aria-hidden />
        <CardContent className="relative pt-8 pb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-rose-600" />
            Missing Route
          </div>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>

          <h2 className="mb-4 text-xl font-semibold text-slate-700">Page Not Found</h2>

          <p className="text-slate-600 mb-8 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button onClick={handleGoHome} className="px-6 py-2.5 shadow-md hover:shadow-lg">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
