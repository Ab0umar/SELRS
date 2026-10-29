import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function AdminDataSourceAudit() {
  const { user } = useAuth();
  const [patientIdInput, setPatientIdInput] = useState("");
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientIdError, setPatientIdError] = useState<string | null>(null);
  const auditQuery = trpc.medical.getDataSourceAuditStatus.useQuery(
    { patientId: patientId ?? undefined },
    {
      enabled: user?.role === "admin" && patientId !== null,
      refetchOnWindowFocus: false,
    },
  );

  // Admin guard
  if (user?.role !== "admin") {
    return (
      <div
        className="w-full space-y-5 px-2 pb-2 text-start sm:px-3 lg:px-4"
        dir="rtl"
      >
        <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
          <AlertDescription>
            لا توجد أذونات كافية لعرض هذه الصفحة
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const submitPatientId = () => {
    const nextPatientId = Number(patientIdInput);
    if (Number.isInteger(nextPatientId) && nextPatientId > 0) {
      setPatientIdError(null);
      setPatientId(nextPatientId);
      return;
    }
    setPatientIdError("أدخل معرّفًا صحيحًا أكبر من صفر.");
  };

  const handleExport = () => {
    if (!auditQuery.data || patientId === null) return;
    const exportBlob = new Blob([JSON.stringify(auditQuery.data, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(exportBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `تدقيق-مصادر-البيانات-${patientId}.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div
      className="w-full space-y-5 px-2 pb-2 text-start sm:px-3 lg:px-4"
      dir="rtl"
    >
      {/* Header */}
      <div className="space-y-3 border-b border-border pb-4">
        <h1 className="text-2xl font-semibold sm:text-2xl">
          تدقيق مصادر البيانات
        </h1>
        <p className="text-sm text-muted-foreground">
          راجع مصدر البيانات الديموغرافية والسريرية، ثم نفّذ تحققًا مباشرًا
          لمريض محدد.
        </p>
      </div>

      {/* Section 1: Patient Data Sources */}
      <Card
        dir="rtl"
        className="rounded-lg border-border/90 bg-card text-start shadow-none"
      >
        <CardHeader>
          <CardTitle>جداول مصادر بيانات المريض</CardTitle>
          <CardDescription>
            البيانات الديموغرافية يجب أن تأتي من جدول المرضى فقط
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <caption className="sr-only">
                مصادر بيانات الحقول الديموغرافية للمريض
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    الحالة
                  </th>
                  <th className="px-3 py-2 font-semibold">جدول العرض</th>
                  <th className="px-3 py-2 font-semibold">واجهة العرض</th>
                  <th className="px-3 py-2 font-semibold">جدول الحفظ</th>
                  <th className="px-3 py-2 font-semibold">واجهة الحفظ</th>
                  <th className="px-3 py-2 font-semibold">واجهة الإدخال</th>
                  <th className="px-3 py-2 font-semibold">الحقل</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "الاسم الكامل",
                    "نموذج التسجيل",
                    "createPatient / updatePatient",
                    "patients",
                    "getPatientById",
                    "patients.fullName",
                  ],
                  [
                    "رمز المريض",
                    "نموذج التسجيل",
                    "createPatient",
                    "patients",
                    "getPatientById",
                    "patients.patientCode",
                  ],
                  [
                    "رقم الهاتف",
                    "نموذج التسجيل",
                    "updatePatient",
                    "patients",
                    "getPatientById",
                    "patients.phone",
                  ],
                  [
                    "الطبيب",
                    "صفحة المرضى / التسجيل",
                    "updatePatient",
                    "patients",
                    "getPatientById",
                    "patients.doctorCode",
                  ],
                  [
                    "الخدمة",
                    "صفحة المرضى / التسجيل",
                    "updatePatient",
                    "patients",
                    "getPatientById",
                    "patients.serviceCode",
                  ],
                  [
                    "تاريخ الميلاد",
                    "نموذج التسجيل",
                    "createPatient",
                    "patients",
                    "getPatientById",
                    "patients.dateOfBirth",
                  ],
                  [
                    "الفرع",
                    "نموذج التسجيل",
                    "createPatient",
                    "patients",
                    "getPatientById",
                    "patients.branch",
                  ],
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded bg-success/15 px-2 py-1 text-success">
                        مطابق
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row[5]}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row[4]}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row[3]}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row[2]}</td>
                    <td className="px-3 py-2 text-xs">{row[1]}</td>
                    <td className="px-3 py-2 font-semibold">{row[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Medical Data Sources */}
      <Card
        dir="rtl"
        className="rounded-lg border-border/90 bg-card text-start shadow-none"
      >
        <CardHeader>
          <CardTitle>جداول مصادر البيانات الطبية</CardTitle>
          <CardDescription>
            قائمة المراجعة الطبية تستخدم fallback مؤقتًا من patientPageStates،
            وما زال هذا الاستخدام تحت الفحص.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <caption className="sr-only">
                مصادر البيانات الطبية لكل حقل في الفحص
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    الحالة
                  </th>
                  <th className="px-3 py-2 font-semibold">
                    يستخدم patientPageStates؟
                  </th>
                  <th className="px-3 py-2 font-semibold">جدول العرض</th>
                  <th className="px-3 py-2 font-semibold">واجهة العرض</th>
                  <th className="px-3 py-2 font-semibold">جدول الحفظ</th>
                  <th className="px-3 py-2 font-semibold">واجهة الحفظ</th>
                  <th className="px-3 py-2 font-semibold">واجهة الإدخال</th>
                  <th className="px-3 py-2 font-semibold">الحقل</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    field: "قائمة المراجعة الطبية",
                    input: "نموذج الفحص",
                    save: "saveExaminationForm",
                    table: "examination_checklist_items",
                    display: "getExaminationChecklist",
                    displayTable: "examination_checklist_items",
                    usesPageState: "fallback مؤقت",
                    status: "⚠️ تحقق",
                  },
                  {
                    field: "انكسار العين (Autoref)",
                    input: "لوحة الفحص",
                    save: "saveRefractionToExamination",
                    table: "autorefractometryData",
                    display: "getAutorefractometryByPatient",
                    displayTable: "autorefractometryData",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "ضغط العين (IOP)",
                    input: "لوحة الفحص",
                    save: "saveRefractionToExamination",
                    table: "autorefractometryData",
                    display: "getAutorefractometryByPatient",
                    displayTable: "autorefractometryData",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "بعد الانكسار (After Refraction)",
                    input: "لوحة الفحص",
                    save: "saveAfterRefractionData",
                    table: "afterRefractionData",
                    display: "getAfterRefractionByExamination",
                    displayTable: "afterRefractionData",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "نظارة / مقاس العدسات (Refraction)",
                    input: "لوحة الفحص",
                    save: "saveRefractionToExamination",
                    table: "glassesRecords",
                    display: "getGlassesRecordsByPatient",
                    displayTable: "glassesRecords",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "الفحص الأساسي (Fundus)",
                    input: "لوحة الفحص",
                    save: "saveExaminationForm / saveMedicalVisit",
                    table: "examinations / doctorReports",
                    display: "getExaminationById / getDoctorReport",
                    displayTable: "examinations",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "بيانات البنتاكام (Pentacam)",
                    input: "لوحة البنتاكام",
                    save: "updatePentacamResult / saveExaminationForm",
                    table: "pentacamResults",
                    display: "getPentacamResultsByVisit",
                    displayTable: "pentacamResults",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "القرار العلاجي (Treatment)",
                    input: "لوحة الفحص / التشخيص",
                    save: "saveMedicalVisit / createDoctorReport",
                    table: "examinations / doctorReports",
                    display: "getExaminationById / getDoctorReport",
                    displayTable: "examinations",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "طلبات الفحوصات (Tests)",
                    input: "صفحة طلب الفحوصات",
                    save: "createTestRequest",
                    table: "testRequests / testRequestItems",
                    display: "getPatientTestRequests",
                    displayTable: "testRequests",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "التشخيص (Diagnosis)",
                    input: "لوحة التشخيص",
                    save: "createDoctorReport / updateDoctorReport",
                    table: "doctorReports",
                    display: "getDoctorReport / getDoctorReportByVisit",
                    displayTable: "doctorReports",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                  {
                    field: "الوصفات الطبية (Prescriptions)",
                    input: "لوحة الوصفة",
                    save: "createPrescriptionWithItems",
                    table: "prescriptions / prescriptionItems",
                    display: "getPatientPrescriptions",
                    displayTable: "prescriptions",
                    usesPageState: "لا",
                    status: "✅ مطابق",
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded px-2 py-1 text-xs ${
                          row.status === "⚠️ تحقق"
                            ? "bg-warning/20 text-warning-text"
                            : "bg-success/15 text-success"
                        }`}
                      >
                        {row.status.replace(/[✅⚠️❌]/g, "").trim()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{row.usesPageState}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.displayTable}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.display}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.table}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.save}</td>
                    <td className="px-3 py-2 text-xs">{row.input}</td>
                    <td className="px-3 py-2 font-semibold">{row.field}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: patientPageStates Usage */}
      <Card
        dir="rtl"
        className="rounded-lg border-border/90 bg-card text-start shadow-none"
      >
        <CardHeader>
          <CardTitle>استخدام patientPageStates</CardTitle>
          <CardDescription>
            مصادر الحالة التي تُخزّن في patientPageStates والإجراء المسموح
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <caption className="sr-only">
                استخدام حالة الصفحة ومصادر الاستبدال المسموح بها
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    حالة التنظيف
                  </th>
                  <th className="px-3 py-2 font-semibold">جدول الاستبدال</th>
                  <th className="px-3 py-2 font-semibold">السبب</th>
                  <th className="px-3 py-2 font-semibold">مسموح؟</th>
                  <th className="px-3 py-2 font-semibold">الغرض</th>
                  <th className="px-3 py-2 font-semibold">المفتاح</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    key: "visitDate",
                    purpose: "حالة جلسة UI",
                    allowed: "✅ نعم",
                    reason: "وقت الجلسة مؤقت",
                    replacement: "visits.visitDate",
                    cleanup: "مسموح",
                  },
                  {
                    key: "sheetSelection",
                    purpose: "اختيار الورقة",
                    allowed: "✅ نعم",
                    reason: "حالة UI فقط",
                    replacement: "غير متوفر",
                    cleanup: "مسموح",
                  },
                  {
                    key: "doctorName",
                    purpose: "اسم الطبيب",
                    allowed: "✅ نعم",
                    reason: "عرض في الجلسة فقط",
                    replacement: "patients.doctorCode",
                    cleanup: "مسموح",
                  },
                  {
                    key: "serviceCode",
                    purpose: "كود الخدمة",
                    allowed: "✅ نعم",
                    reason: "عرض مؤقت",
                    replacement: "patients.serviceCode",
                    cleanup: "مسموح",
                  },
                  {
                    key: "generalDiseases",
                    purpose: "بيانات سريرية",
                    allowed: "⚠️ مؤقت",
                    reason: "fallback حتى التحقق من Backfill",
                    replacement: "examination_checklist_items",
                    cleanup: "قيد التنظيف",
                  },
                  {
                    key: "pregnancyOrLactation",
                    purpose: "بيانات سريرية",
                    allowed: "⚠️ مؤقت",
                    reason: "fallback حتى التحقق من Backfill",
                    replacement: "examination_checklist_items",
                    cleanup: "قيد التنظيف",
                  },
                  {
                    key: "acneTreatment",
                    purpose: "بيانات سريرية",
                    allowed: "⚠️ مؤقت",
                    reason: "fallback حتى التحقق من Backfill",
                    replacement: "examination_checklist_items",
                    cleanup: "قيد التنظيف",
                  },
                  {
                    key: "familyKeratoconus",
                    purpose: "بيانات سريرية",
                    allowed: "⚠️ مؤقت",
                    reason: "fallback حتى التحقق من Backfill",
                    replacement: "examination_checklist_items",
                    cleanup: "قيد التنظيف",
                  },
                  {
                    key: "doctorCode (server write)",
                    purpose: "تعيين الطبيب",
                    allowed: "❌ لا",
                    reason: "تم حذفه في Phase 1",
                    replacement: "patients.doctorCode",
                    cleanup: "تم التنظيف ✅",
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-3 py-2 text-xs">
                      {row.cleanup.replace(/[✅⚠️❌]/g, "").trim()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.replacement}
                    </td>
                    <td className="px-3 py-2 text-xs">{row.reason}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.allowed.replace(/[✅⚠️❌]/g, "").trim()}
                    </td>
                    <td className="px-3 py-2 text-xs">{row.purpose}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Live Spot Check */}
      <Card
        dir="rtl"
        className="rounded-lg border-border/90 bg-card text-start shadow-none"
      >
        <CardHeader>
          <CardTitle>التحقق المباشر</CardTitle>
          <CardDescription>
            أدخل معرّف المريض للتحقق من مصادر البيانات الفعلية. لا يبدأ الفحص
            قبل الضغط على زر التحقق.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input */}
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              submitPatientId();
            }}
          >
            <label className="sr-only" htmlFor="audit-patient-id">
              معرّف المريض
            </label>
            <Input
              id="audit-patient-id"
              type="number"
              placeholder="معرّف المريض"
              value={patientIdInput}
              onChange={(event) => {
                setPatientIdInput(event.target.value);
                setPatientIdError(null);
              }}
              className="text-start"
              min={1}
              step={1}
              inputMode="numeric"
              aria-describedby={
                patientIdError
                  ? "audit-patient-id-help audit-patient-id-error"
                  : "audit-patient-id-help"
              }
              aria-invalid={patientIdError ? "true" : undefined}
            />
            <Button
              type="submit"
              disabled={!patientIdInput || auditQuery.isFetching}
            >
              {auditQuery.isFetching ? (
                <>
                  <Spinner className="h-4 w-4" />
                  جاري التحقق…
                </>
              ) : (
                "تحقق"
              )}
            </Button>
          </form>
          <p
            id="audit-patient-id-help"
            className="text-xs text-muted-foreground"
          >
            استخدم رقمًا صحيحًا أكبر من صفر.
          </p>
          {patientIdError && (
            <p
              id="audit-patient-id-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {patientIdError}
            </p>
          )}

          {patientId !== null && auditQuery.data && !auditQuery.isFetching && (
            <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                آخر فحص للمعرّف {patientId}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => auditQuery.refetch()}
                  disabled={auditQuery.isFetching}
                >
                  {auditQuery.isFetching ? "جاري التحديث…" : "تحديث الفحص"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExport}
                  disabled={auditQuery.data.checked !== true}
                >
                  تصدير JSON
                </Button>
              </div>
            </div>
          )}

          {/* Results */}
          {auditQuery.isFetching && (
            <div
              className="flex justify-end gap-2"
              role="status"
              aria-live="polite"
            >
              <Spinner className="h-4 w-4" />
              <span className="text-sm">جاري التحقق…</span>
            </div>
          )}

          {patientId === null && !auditQuery.isFetching && (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              أدخل معرّف المريض لبدء التحقق من مصادر البيانات.
            </div>
          )}

          {patientId !== null &&
            auditQuery.data &&
            auditQuery.data.checked === false &&
            !auditQuery.isFetching && (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                لم تُرجع عملية التحقق بيانات لهذا المعرّف.
              </div>
            )}

          {!auditQuery.isFetching &&
            auditQuery.data?.checked &&
            auditQuery.data.checked === true &&
            (() => {
              const data = auditQuery.data;
              const missingValue = "غير متوفر";
              return (
                <div className="space-y-6">
                  {/* Patient Data */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="border-border/90 bg-muted/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          بيانات المريض من جدول patients
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {data.patient ? (
                          <>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {data.patient.fullName}
                              </span>
                              <span className="text-xs">الاسم</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {data.patient.patientCode}
                              </span>
                              <span className="text-xs">رمز المريض</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {data.patient.phone}
                              </span>
                              <span className="text-xs">الهاتف</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {data.patient.doctorCode || missingValue}
                              </span>
                              <span className="text-xs">رمز الطبيب</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {data.patient.serviceCode || missingValue}
                              </span>
                              <span className="text-xs">رمز الخدمة</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            لم يتم العثور على المريض
                          </span>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/90 bg-muted/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          حالة الجلسة من patientPageStates
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {data.pageStateSessionFields ? (
                          <>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {String(
                                  data.pageStateSessionFields.doctorName ||
                                    missingValue,
                                )}
                              </span>
                              <span className="text-xs">اسم الطبيب</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {typeof data.pageStateSessionFields
                                  .visitDate === "string"
                                  ? new Date(
                                      data.pageStateSessionFields.visitDate,
                                    ).toLocaleDateString("ar-EG")
                                  : missingValue}
                              </span>
                              <span className="text-xs">تاريخ الزيارة</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {String(
                                  data.pageStateSessionFields.sheetSelection ||
                                    missingValue,
                                ).substring(0, 30)}
                              </span>
                              <span className="text-xs">اختيار الورقة</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-xs text-muted-foreground">
                                {String(
                                  data.pageStateSessionFields.serviceCode ||
                                    missingValue,
                                )}
                              </span>
                              <span className="text-xs">رمز الخدمة</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            لا توجد حالة جلسة
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">قائمة المراجعة الطبية المحفوظة</h3>
                    {data.checklistNormalized ? (
                      <div role="region" aria-label="قائمة المراجعة الطبية" tabIndex={0} className="overflow-x-auto rounded border border-border">
                        <table className="w-full text-start text-xs">
                          <thead><tr><th scope="col">الحقل</th><th scope="col">القيمة المحفوظة</th></tr></thead>
                          <tbody>{Object.entries(data.checklistNormalized).filter(([key]) => !["id","patientId","examinationId","createdAt","updatedAt"].includes(key)).map(([key,value])=>(<tr key={key}><th scope="row">{key}</th><td>{value === null ? missingValue : value ? "نعم" : "لا"}</td></tr>))}</tbody>
                        </table>
                      </div>
                    ) : <p>لا توجد قائمة مراجعة محفوظة لهذا الكشف.</p>}
                  </div>

                  {/* Autoref + IOP */}
                  {data.autoref && (
                    <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                      <h4 className="font-semibold">
                        انكسار العين (Autoref) + ضغط العين (IOP)
                      </h4>
                      <div className="grid gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>OD Sphere</span>
                          <span className="font-mono">
                            {data.autoref.sphereOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OD Cylinder</span>
                          <span className="font-mono">
                            {data.autoref.cylinderOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OD Axis</span>
                          <span className="font-mono">
                            {data.autoref.axisOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Sphere</span>
                          <span className="font-mono">
                            {data.autoref.sphereOS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Cylinder</span>
                          <span className="font-mono">
                            {data.autoref.cylinderOS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Axis</span>
                          <span className="font-mono">
                            {data.autoref.axisOS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>IOP OD</span>
                          <span className="font-mono">
                            {data.autoref.iopOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>IOP OS</span>
                          <span className="font-mono">
                            {data.autoref.iopOS || missingValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* After Refraction */}
                  {data.afterRef && (
                    <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                      <h4 className="font-semibold">
                        بعد الانكسار (After Refraction)
                      </h4>
                      <div className="grid gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>OD Sphere</span>
                          <span className="font-mono">
                            {data.afterRef.sphereOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OD Cylinder</span>
                          <span className="font-mono">
                            {data.afterRef.cylinderOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OD Axis</span>
                          <span className="font-mono">
                            {data.afterRef.axisOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Sphere</span>
                          <span className="font-mono">
                            {data.afterRef.sphereOS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Cylinder</span>
                          <span className="font-mono">
                            {data.afterRef.cylinderOS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Axis</span>
                          <span className="font-mono">
                            {data.afterRef.axisOS || missingValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Glasses */}
                  {data.glasses && (
                    <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                      <h4 className="font-semibold">
                        نظارة / مقاس العدسات (Refraction)
                      </h4>
                      <div className="grid gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>OD Sphere</span>
                          <span className="font-mono">
                            {data.glasses.sOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OD Cylinder</span>
                          <span className="font-mono">
                            {data.glasses.cOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OD Axis</span>
                          <span className="font-mono">
                            {data.glasses.axisOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Sphere</span>
                          <span className="font-mono">
                            {data.glasses.sOS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Cylinder</span>
                          <span className="font-mono">
                            {data.glasses.cOS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>OS Axis</span>
                          <span className="font-mono">
                            {data.glasses.axisOS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>PD OD</span>
                          <span className="font-mono">
                            {data.glasses.pdOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>ADD OD</span>
                          <span className="font-mono">
                            {data.glasses.addOD || missingValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pentacam */}
                  {data.pentacam && (
                    <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                      <h4 className="font-semibold">
                        بيانات البنتاكام (Pentacam)
                      </h4>
                      <div className="grid gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>K1 OD</span>
                          <span className="font-mono">
                            {data.pentacam.k1OD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>K2 OD</span>
                          <span className="font-mono">
                            {data.pentacam.k2OD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>K1 OS</span>
                          <span className="font-mono">
                            {data.pentacam.k1OS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>K2 OS</span>
                          <span className="font-mono">
                            {data.pentacam.k2OS || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thinnest OD</span>
                          <span className="font-mono">
                            {data.pentacam.thinnestPointOD || missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thinnest OS</span>
                          <span className="font-mono">
                            {data.pentacam.thinnestPointOS || missingValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fundus/Treatment via Doctor Report */}
                  {data.doctorReport && (
                    <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                      <h4 className="font-semibold">
                        التشخيص والقرار العلاجي (Diagnosis & Treatment)
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="font-semibold">التشخيص</div>
                          <div className="font-mono text-muted-foreground line-clamp-2">
                            {data.doctorReport.diagnosis || missingValue}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">العلاج</div>
                          <div className="font-mono text-muted-foreground line-clamp-2">
                            {data.doctorReport.treatment || missingValue}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">التوصيات</div>
                          <div className="font-mono text-muted-foreground line-clamp-2">
                            {data.doctorReport.recommendations || missingValue}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Requests */}
                  {data.testRequest && (
                    <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                      <h4 className="font-semibold">
                        طلبات الفحوصات (Test Requests)
                      </h4>
                      <div className="grid gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>تاريخ الطلب</span>
                          <span className="font-mono">
                            {data.testRequest.requestDate
                              ? new Date(
                                  String(data.testRequest.requestDate),
                                ).toLocaleDateString("ar-EG")
                              : missingValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>الحالة</span>
                          <span className="font-mono">
                            {data.testRequest.status || missingValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {auditQuery.error && (
            <Alert
              className="border-destructive/30 bg-destructive/10 text-destructive"
              role="alert"
            >
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  تعذّر تحميل نتيجة التدقيق:{" "}
                  {getTrpcErrorMessage(auditQuery.error, "حدث خطأ غير متوقع")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => auditQuery.refetch()}
                  disabled={auditQuery.isFetching}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  {auditQuery.isFetching ? "جاري المحاولة…" : "إعادة المحاولة"}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
