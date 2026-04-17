import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  title: string;
  body: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function OfflinePageState({
  title,
  body,
  retryLabel = "Retry",
  onRetry,
}: Props) {
  return (
    <Card className="overflow-hidden border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-amber-200 bg-white/80 p-2 text-amber-700 shadow-sm">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700/80">
              Offline State
            </div>
            <CardTitle className="text-base text-amber-950">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl leading-6">{body}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="gap-2 border-amber-300 bg-white/80 hover:bg-white">
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
