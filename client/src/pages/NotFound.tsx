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
    <div className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_30%),linear-gradient(135deg,_#f8fafc,_#eef2ff)]">
      <Card className="mx-4 w-full max-w-xl border-slate-200/80 bg-white/90 shadow-lg backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
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
            <Button
              onClick={handleGoHome}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
