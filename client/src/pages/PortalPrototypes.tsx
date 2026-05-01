import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PortalPrototypes() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6" dir="rtl">
      <PageHeader
        icon={<FlaskConical className="h-5 w-5" />}
        title="نماذج أولية (Prototypes)"
        description="مساحة فارغة مؤقتة لتجربة تدفقات جديدة دون تأثير على الإنتاج."
      />

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        لا توجد تجارب مفعّلة في هذا الفرع. أضِف مسارات أو مكوّنات تجريبية هنا عند الحاجة.
      </div>
    </div>
  );
}
