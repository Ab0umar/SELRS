import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";

export default function AdminCardVisibility() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Card visibility settings
  const cardVisibilityQuery = trpc.medical.getDashboardCardVisibility.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const updateCardVisibilityMutation = trpc.medical.setDashboardCardVisibility.useMutation({
    onSuccess: () => {
      utils.medical.getDashboardCardVisibility.invalidate();
      toast.success("تم حفظ إعدادات العرض بنجاح");
    },
    onError: (error) => {
      console.error("Failed to update card visibility:", error);
      toast.error("فشل تحديث إعدادات العرض");
    },
  });

  // Local state for all visibility flags
  const [showPatientDataPanel, setShowPatientDataPanel] = useState(true);
  const [showMedicalFileCard, setShowMedicalFileCard] = useState(true);
  const [showTodayPatientsPanel, setShowTodayPatientsPanel] = useState(true);
  const [showPatients, setShowPatients] = useState(true);
  const [showPatientFile, setShowPatientFile] = useState(true);
  const [showExaminations, setShowExaminations] = useState(true);
  const [showPentacam, setShowPentacam] = useState(true);
  const [showAppointments, setShowAppointments] = useState(true);
  const [showPricingRules, setShowPricingRules] = useState(true);
  const [showMedicalReports, setShowMedicalReports] = useState(true);
  const [showPatientSummary, setShowPatientSummary] = useState(true);
  const [showPrescription, setShowPrescription] = useState(true);
  const [showRefraction, setShowRefraction] = useState(true);
  const [showRequestTests, setShowRequestTests] = useState(true);
  const [showMedicationsTests, setShowMedicationsTests] = useState(true);
  const [showVisits, setShowVisits] = useState(true);
  const [showFollowups, setShowFollowups] = useState(true);
  const [showQuickEntry, setShowQuickEntry] = useState(true);
  const [showNewCases, setShowNewCases] = useState(true);
  const [showFollowupForm, setShowFollowupForm] = useState(true);
  const [showDoctorView, setShowDoctorView] = useState(true);
  const [showSheetCopies, setShowSheetCopies] = useState(true);

  // Load visibility from server
  useEffect(() => {
    if (cardVisibilityQuery.data) {
      setShowPatientDataPanel(cardVisibilityQuery.data.showPatientDataPanel);
      setShowMedicalFileCard(cardVisibilityQuery.data.showMedicalFileCard);
      setShowTodayPatientsPanel(cardVisibilityQuery.data.showTodayPatientsPanel);
      setShowPatients(cardVisibilityQuery.data.showPatients);
      setShowPatientFile(cardVisibilityQuery.data.showPatientFile);
      setShowExaminations(cardVisibilityQuery.data.showExaminations);
      setShowPentacam(cardVisibilityQuery.data.showPentacam);
      setShowAppointments(cardVisibilityQuery.data.showAppointments);
      setShowPricingRules(cardVisibilityQuery.data.showPricingRules);
      setShowMedicalReports(cardVisibilityQuery.data.showMedicalReports);
      setShowPatientSummary(cardVisibilityQuery.data.showPatientSummary);
      setShowPrescription(cardVisibilityQuery.data.showPrescription);
      setShowRefraction(cardVisibilityQuery.data.showRefraction);
      setShowRequestTests(cardVisibilityQuery.data.showRequestTests);
      setShowMedicationsTests(cardVisibilityQuery.data.showMedicationsTests);
      setShowVisits(cardVisibilityQuery.data.showVisits);
      setShowFollowups(cardVisibilityQuery.data.showFollowups);
      setShowQuickEntry(cardVisibilityQuery.data.showQuickEntry);
      setShowNewCases(cardVisibilityQuery.data.showNewCases);
      setShowFollowupForm(cardVisibilityQuery.data.showFollowupForm);
      setShowDoctorView(cardVisibilityQuery.data.showDoctorView);
      setShowSheetCopies(cardVisibilityQuery.data.showSheetCopies);
    }
  }, [cardVisibilityQuery.data]);

  const handleSave = () => {
    const newVisibility = {
      showPatientDataPanel,
      showMedicalFileCard,
      showTodayPatientsPanel,
      showPatients,
      showPatientFile,
      showExaminations,
      showPentacam,
      showAppointments,
      showPricingRules,
      showMedicalReports,
      showPatientSummary,
      showPrescription,
      showRefraction,
      showRequestTests,
      showMedicationsTests,
      showVisits,
      showFollowups,
      showQuickEntry,
      showNewCases,
      showFollowupForm,
      showDoctorView,
      showSheetCopies,
    };

    updateCardVisibilityMutation.mutate(newVisibility);
  };

  if (user?.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-right">
          <p className="text-sm font-medium text-red-800">لا توجد صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-right">إعدادات عرض الكروت</h1>
        <p className="text-right text-slate-600">إدارة ظهور وإخفاء الكروت في الداشبورد</p>
      </div>

      <Card>
        <CardHeader className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>الكروت المتاحة</CardTitle>
          </div>
          <CardDescription className="text-right">
            اختر الكروت التي تريد عرضها في الداشبورد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Panel Cards */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-right text-sm">كروت اللوحة العلوية</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showPatientDataPanel}
                  onCheckedChange={(checked) => setShowPatientDataPanel(Boolean(checked))}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">بيانات المريض</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showMedicalFileCard}
                  onCheckedChange={(checked) => setShowMedicalFileCard(Boolean(checked))}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">ملف المريض</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showTodayPatientsPanel}
                  onCheckedChange={(checked) => setShowTodayPatientsPanel(Boolean(checked))}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">مرضى اليوم</span>
              </label>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="space-y-3">
            <h3 className="font-semibold text-right text-sm">كروت الداشبورد</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showPatients}
                  onCheckedChange={(checked) => setShowPatients(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">المرضى</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showPatientFile}
                  onCheckedChange={(checked) => setShowPatientFile(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">ملف المريض 2</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showExaminations}
                  onCheckedChange={(checked) => setShowExaminations(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">الفحوصات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showPentacam}
                  onCheckedChange={(checked) => setShowPentacam(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">بنتاكام</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showAppointments}
                  onCheckedChange={(checked) => setShowAppointments(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">العمليات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showPricingRules}
                  onCheckedChange={(checked) => setShowPricingRules(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">تسعير العمليات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showMedicalReports}
                  onCheckedChange={(checked) => setShowMedicalReports(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">التقارير</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showPatientSummary}
                  onCheckedChange={(checked) => setShowPatientSummary(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">التقرير المجمع</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showPrescription}
                  onCheckedChange={(checked) => setShowPrescription(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">الروشتة</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showRefraction}
                  onCheckedChange={(checked) => setShowRefraction(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">مقاس النظاره</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showRequestTests}
                  onCheckedChange={(checked) => setShowRequestTests(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">طلب الفحوصات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showMedicationsTests}
                  onCheckedChange={(checked) => setShowMedicationsTests(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">الأدوية والفحوصات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showVisits}
                  onCheckedChange={(checked) => setShowVisits(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">الزيارات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showFollowups}
                  onCheckedChange={(checked) => setShowFollowups(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">المتابعات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showQuickEntry}
                  onCheckedChange={(checked) => setShowQuickEntry(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">إدخال سريع</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showNewCases}
                  onCheckedChange={(checked) => setShowNewCases(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">الحالات الجديدة</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showFollowupForm}
                  onCheckedChange={(checked) => setShowFollowupForm(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">نموذج المتابعة</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showDoctorView}
                  onCheckedChange={(checked) => setShowDoctorView(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">رؤية الطبيب</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showSheetCopies}
                  onCheckedChange={(checked) => setShowSheetCopies(checked as boolean)}
                  disabled={updateCardVisibilityMutation.isPending}
                />
                <span className="text-sm">نسخة الشيتات</span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updateCardVisibilityMutation.isPending || cardVisibilityQuery.isLoading}
              size="lg"
            >
              {updateCardVisibilityMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
