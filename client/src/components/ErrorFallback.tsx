import { useState } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error | null;
  onReload: () => void;
  onGoHome: () => void;
}

const DETAILS_ID = "error-fallback-details";

export function ErrorFallback({
  error,
  onReload,
  onGoHome,
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      dir="rtl"
      role="alert"
      className="flex items-center justify-center min-h-screen p-8 bg-background"
    >
      <div className="flex flex-col items-center w-full max-w-2xl p-8">
        <AlertTriangle
          size={48}
          aria-hidden="true"
          className="text-destructive mb-6 flex-shrink-0"
        />

        <h2 className="text-xl mb-4">حدث خطأ غير متوقع</h2>

        <p className="text-sm text-muted-foreground text-center mb-6">
          تعذر عرض هذه الصفحة. حاول إعادة التحميل أو العودة إلى الصفحة الرئيسية.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <Button variant="default" onClick={onReload}>
            <RotateCcw size={16} />
            إعادة تحميل الصفحة
          </Button>
          <Button variant="outline" onClick={onGoHome}>
            <Home size={16} />
            الصفحة الرئيسية
          </Button>
        </div>

        {error && (
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showDetails}
              aria-controls={DETAILS_ID}
              onClick={() => setShowDetails((value) => !value)}
            >
              {showDetails
                ? "إخفاء التفاصيل التقنية"
                : "عرض التفاصيل التقنية"}
            </Button>

            {/* The stack renders only while expanded; it must never sit in the collapsed DOM. */}
            {showDetails && (
              <pre
                id={DETAILS_ID}
                dir="ltr"
                className="w-full mt-3 p-4 rounded bg-muted text-sm text-muted-foreground text-start overflow-auto whitespace-break-spaces"
              >
                {[error.name, error.message, error.stack]
                  .filter(Boolean)
                  .join("\n")}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
