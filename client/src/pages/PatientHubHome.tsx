import { useLocation } from "wouter";
import PatientPicker from "@/components/PatientPicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserRound } from "lucide-react";

type PatientHubHomeProps = {
  visitDate: string;
};

/**
 * شاشة الدخول لمركز المريض: بحث واختيار فقط (بدون جدول المرضى الكامل).
 */
export default function PatientHubHome({ visitDate }: PatientHubHomeProps) {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10" dir="rtl">
      <Card className="w-full max-w-lg border-border/80 shadow-sm">
        <CardHeader className="text-right">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-lg">ابحث عن المريض</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                اكتب اسماً أو كوداً أو رقم موبايل، ثم اختر المريض. بعدها يمكنك فتح الموجز، التفاصيل،
                الفحوصات وغيرها من القائمة الجانبية؛ البيانات تُعرض وفق<strong className="text-foreground"> تاريخ الزيارة</strong> الموضَّح أعلى الصفحة (
                <span dir="ltr" className="tabular-nums">{visitDate}</span>
                ).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              قائمة المركز الجانبية تظهر بعد اختيار مريض لتصفح بياناته حسب اليوم المعروض.
            </span>
          </div>
          <PatientPicker
            label="المريض"
            placeholder="ابحث بالاسم أو الكود أو الموبايل..."
            onSelect={(patient) => {
              const q = encodeURIComponent(visitDate);
              navigate(`/patient-hub/brief/${patient.id}?visitDate=${q}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
