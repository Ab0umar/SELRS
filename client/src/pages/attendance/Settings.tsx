import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Attendance settings
        </p>
        <h2 className="text-2xl font-bold text-foreground">الإعدادات العامة</h2>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Core attendance settings are configured in the Device Settings page.
          This page is reserved for additional module-specific settings.
        </AlertDescription>
      </Alert>

      <section className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold text-foreground">
            Device Configuration
          </h3>
        </div>
        <div className="space-y-3 px-4 py-4 text-sm text-muted-foreground">
          <p>Configure fingerprint device settings:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Device IP Address and Port</li>
            <li>Access Database path and configuration</li>
            <li>Sync frequency and timing</li>
            <li>Connection and timeout settings</li>
          </ul>
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => (window.location.href = "/attendance/admin/sync")}
          >
            Go to Device Settings
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold text-foreground">
            Shift Configuration
          </h3>
        </div>
        <div className="space-y-3 px-4 py-4 text-sm text-muted-foreground">
          <p>Define work shifts and assign employees to shifts:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Create and manage shifts (start time, end time, break duration)
            </li>
            <li>Assign shifts to employees</li>
            <li>Set default shifts per employee</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Shift management coming in Phase 2
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold text-foreground">
            Attendance Rules
          </h3>
        </div>
        <div className="space-y-3 px-4 py-4 text-sm text-muted-foreground">
          <p>Configure attendance calculation rules:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Grace period for late arrival (minutes)</li>
            <li>Minimum worked hours for present status</li>
            <li>Overtime thresholds and rules</li>
            <li>Early leave tolerance (minutes)</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Customizable rules configuration coming in Phase 2
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold text-foreground">
            Holidays & Leave Types
          </h3>
        </div>
        <div className="space-y-3 px-4 py-4 text-sm text-muted-foreground">
          <p>Manage organizational holidays and leave types:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Define public holidays</li>
            <li>Create leave types (annual, sick, casual, etc.)</li>
            <li>Set leave policies and limits per employee</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Holiday and leave management available in Leave Management section
          </p>
        </div>
      </section>
    </div>
  );
}
