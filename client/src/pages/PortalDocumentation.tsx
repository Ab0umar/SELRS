import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PortalDocumentation() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6" dir="rtl">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title="التوثيق"
        description="إشارات سريعة لملفات المشروع — المحتوى الحقيقي يبقى داخل مستودع الكود."
      />

      <ul className="list-disc space-y-2 pr-5 text-sm leading-7 text-muted-foreground marker:text-primary">
        <li>
          <span className="font-semibold text-foreground">تشغيل وبناء التطبيق:</span> اتباع{" "}
          <span className="font-mono text-xs">AGENTS.md</span> أو أوامر <span className="font-mono">pnpm dev / check / build</span> على جذر
          مستودع SELRS الكامل لديك.
        </li>
        <li>
          <span className="font-semibold text-foreground">مزامنة MSSQL وحالات الطبيب/الخدمة:</span> راجع دليل SELRS الداخلي (<span className="font-mono">
            CLAUDE.md / project_mssql_sync_fix.md
          </span>
          ).
        </li>
        <li>
          <span className="font-semibold text-foreground">الصلاحيات:</span> <span className="font-mono">ProtectedRoute</span> في الواجهة وقرارات الدور في
          الخادم عبر الإجراءات المحمية.
        </li>
      </ul>
    </div>
  );
}
