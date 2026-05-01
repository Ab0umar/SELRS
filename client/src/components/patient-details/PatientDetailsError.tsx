import { OfflinePageState } from "@/components/OfflinePageState";

interface PatientDetailsErrorProps {
  onRetry: () => void;
}

export function PatientDetailsError({ onRetry }: PatientDetailsErrorProps) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="container mx-auto px-4 py-8">
        <OfflinePageState
          title="تعذر تحميل ملف المريض"
          body="الملف المطلوب غير متاح الآن من الخادم. أعد المحاولة عندما يعود الاتصال."
          onRetry={onRetry}
        />
      </main>
    </div>
  );
}
