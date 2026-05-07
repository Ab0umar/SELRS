import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function AdminDataSourceAudit() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<number | ''>('');

  // Admin guard
  if (user?.role !== 'admin') {
    return (
      <div className="w-full space-y-5 px-2 pb-2 text-right sm:px-3 lg:px-4" dir="rtl">
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertDescription>
            لا توجد أذونات كافية لعرض هذه الصفحة
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const auditQuery = trpc.medical.getDataSourceAuditStatus.useQuery(
    { patientId: patientId && typeof patientId === 'number' ? patientId : undefined },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  return (
    <div className="w-full space-y-5 px-2 pb-2 text-right sm:px-3 lg:px-4" dir="rtl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">مصدر البيانات — تدقيق</h1>
        <p className="text-sm text-muted-foreground">
          تحقق من أن البيانات الديموغرافية والسريرية تأتي من الجداول الصحيحة
        </p>
      </div>

      {/* Section 1: Patient Data Sources */}
      <Card dir="rtl" className="border-border/90 bg-card text-right shadow-sm">
        <CardHeader>
          <CardTitle>جداول مصادر بيانات المريض</CardTitle>
          <CardDescription>
            البيانات الديموغرافية يجب أن تأتي من جدول المرضى فقط
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-semibold">الحالة</th>
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
                  ['الاسم الكامل', 'نموذج التسجيل', 'createPatient / updatePatient', 'patients', 'getPatientById', 'patients.fullName'],
                  ['رمز المريض', 'نموذج التسجيل', 'createPatient', 'patients', 'getPatientById', 'patients.patientCode'],
                  ['رقم الهاتف', 'نموذج التسجيل', 'updatePatient', 'patients', 'getPatientById', 'patients.phone'],
                  ['الطبيب', 'صفحة المرضى / التسجيل', 'updatePatient', 'patients', 'getPatientById', 'patients.doctorCode'],
                  ['الخدمة', 'صفحة المرضى / التسجيل', 'updatePatient', 'patients', 'getPatientById', 'patients.serviceCode'],
                  ['تاريخ الميلاد', 'نموذج التسجيل', 'createPatient', 'patients', 'getPatientById', 'patients.dateOfBirth'],
                  ['الفرع', 'نموذج التسجيل', 'createPatient', 'patients', 'getPatientById', 'patients.branch'],
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-green-800">
                        ✅ مطابق
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
      <Card dir="rtl" className="border-border/90 bg-card text-right shadow-sm">
        <CardHeader>
          <CardTitle>جداول مصادر البيانات الطبية</CardTitle>
          <CardDescription>
            قائمة المراجعة الطبية تستخدم fallback مؤقت من patientPageStates — تحت الفحص
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-semibold">الحالة</th>
                  <th className="px-3 py-2 font-semibold">يستخدم patientPageStates؟</th>
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
                    field: 'قائمة المراجعة الطبية',
                    input: 'نموذج الفحص',
                    save: 'saveExaminationForm',
                    table: 'examination_checklist_items',
                    display: 'getExaminationChecklist',
                    displayTable: 'examination_checklist_items',
                    usesPageState: 'fallback مؤقت',
                    status: '⚠️ تحقق',
                  },
                  {
                    field: 'انكسار العين (Autoref)',
                    input: 'لوحة الفحص',
                    save: 'saveRefractionToExamination',
                    table: 'autorefractometryData',
                    display: 'getAutorefractometryByPatient',
                    displayTable: 'autorefractometryData',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'ضغط العين (IOP)',
                    input: 'لوحة الفحص',
                    save: 'saveRefractionToExamination',
                    table: 'autorefractometryData',
                    display: 'getAutorefractometryByPatient',
                    displayTable: 'autorefractometryData',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'بعد الانكسار (After Refraction)',
                    input: 'لوحة الفحص',
                    save: 'saveAfterRefractionData',
                    table: 'afterRefractionData',
                    display: 'getAfterRefractionByExamination',
                    displayTable: 'afterRefractionData',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'نظارة / مقاس العدسات (Refraction)',
                    input: 'لوحة الفحص',
                    save: 'saveRefractionToExamination',
                    table: 'glassesRecords',
                    display: 'getGlassesRecordsByPatient',
                    displayTable: 'glassesRecords',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'الفحص الأساسي (Fundus)',
                    input: 'لوحة الفحص',
                    save: 'saveExaminationForm / saveMedicalVisit',
                    table: 'examinations / doctorReports',
                    display: 'getExaminationById / getDoctorReport',
                    displayTable: 'examinations',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'بيانات البنتاكام (Pentacam)',
                    input: 'لوحة البنتاكام',
                    save: 'updatePentacamResult / saveExaminationForm',
                    table: 'pentacamResults',
                    display: 'getPentacamResultsByVisit',
                    displayTable: 'pentacamResults',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'القرار العلاجي (Treatment)',
                    input: 'لوحة الفحص / التشخيص',
                    save: 'saveMedicalVisit / createDoctorReport',
                    table: 'examinations / doctorReports',
                    display: 'getExaminationById / getDoctorReport',
                    displayTable: 'examinations',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'طلبات الفحوصات (Tests)',
                    input: 'صفحة طلب الفحوصات',
                    save: 'createTestRequest',
                    table: 'testRequests / testRequestItems',
                    display: 'getPatientTestRequests',
                    displayTable: 'testRequests',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'التشخيص (Diagnosis)',
                    input: 'لوحة التشخيص',
                    save: 'createDoctorReport / updateDoctorReport',
                    table: 'doctorReports',
                    display: 'getDoctorReport / getDoctorReportByVisit',
                    displayTable: 'doctorReports',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                  {
                    field: 'الوصفات الطبية (Prescriptions)',
                    input: 'لوحة الوصفة',
                    save: 'createPrescriptionWithItems',
                    table: 'prescriptions / prescriptionItems',
                    display: 'getPatientPrescriptions',
                    displayTable: 'prescriptions',
                    usesPageState: 'لا',
                    status: '✅ مطابق',
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded px-2 py-1 text-xs ${
                        row.status === '⚠️ تحقق'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{row.usesPageState}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.displayTable}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.display}</td>
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
      <Card dir="rtl" className="border-border/90 bg-card text-right shadow-sm">
        <CardHeader>
          <CardTitle>استخدام patientPageStates</CardTitle>
          <CardDescription>
            مصادر الحالة التي تُخزّن في patientPageStates والإجراء المسموح
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-semibold">حالة التنظيف</th>
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
                    key: 'visitDate',
                    purpose: 'حالة جلسة UI',
                    allowed: '✅ نعم',
                    reason: 'وقت الجلسة مؤقت',
                    replacement: 'visits.visitDate',
                    cleanup: 'مسموح',
                  },
                  {
                    key: 'sheetSelection',
                    purpose: 'اختيار الورقة',
                    allowed: '✅ نعم',
                    reason: 'حالة UI فقط',
                    replacement: '—',
                    cleanup: 'مسموح',
                  },
                  {
                    key: 'doctorName',
                    purpose: 'اسم الطبيب',
                    allowed: '✅ نعم',
                    reason: 'عرض في الجلسة فقط',
                    replacement: 'patients.doctorCode',
                    cleanup: 'مسموح',
                  },
                  {
                    key: 'serviceCode',
                    purpose: 'كود الخدمة',
                    allowed: '✅ نعم',
                    reason: 'عرض مؤقت',
                    replacement: 'patients.serviceCode',
                    cleanup: 'مسموح',
                  },
                  {
                    key: 'generalDiseases',
                    purpose: 'بيانات سريرية',
                    allowed: '⚠️ مؤقت',
                    reason: 'fallback حتى التحقق من Backfill',
                    replacement: 'examination_checklist_items',
                    cleanup: 'قيد التنظيف',
                  },
                  {
                    key: 'pregnancyOrLactation',
                    purpose: 'بيانات سريرية',
                    allowed: '⚠️ مؤقت',
                    reason: 'fallback حتى التحقق من Backfill',
                    replacement: 'examination_checklist_items',
                    cleanup: 'قيد التنظيف',
                  },
                  {
                    key: 'acneTreatment',
                    purpose: 'بيانات سريرية',
                    allowed: '⚠️ مؤقت',
                    reason: 'fallback حتى التحقق من Backfill',
                    replacement: 'examination_checklist_items',
                    cleanup: 'قيد التنظيف',
                  },
                  {
                    key: 'familyKeratoconus',
                    purpose: 'بيانات سريرية',
                    allowed: '⚠️ مؤقت',
                    reason: 'fallback حتى التحقق من Backfill',
                    replacement: 'examination_checklist_items',
                    cleanup: 'قيد التنظيف',
                  },
                  {
                    key: 'doctorCode (server write)',
                    purpose: 'تعيين الطبيب',
                    allowed: '❌ لا',
                    reason: 'تم حذفه في Phase 1',
                    replacement: 'patients.doctorCode',
                    cleanup: 'تم التنظيف ✅',
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-3 py-2 text-xs">{row.cleanup}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.replacement}</td>
                    <td className="px-3 py-2 text-xs">{row.reason}</td>
                    <td className="px-3 py-2 text-xs">{row.allowed}</td>
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
      <Card dir="rtl" className="border-border/90 bg-card text-right shadow-sm">
        <CardHeader>
          <CardTitle>التحقق المباشر</CardTitle>
          <CardDescription>
            أدخل معرّف المريض للتحقق من مصادر البيانات الفعلية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="number"
              placeholder="معرّف المريض"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : '')}
              className="text-right"
              min={1}
            />
            <Button
              onClick={() => setPatientId(patientId)}
              disabled={!patientId || auditQuery.isLoading}
            >
              {auditQuery.isLoading ? <Spinner className="h-4 w-4" /> : 'تحقق'}
            </Button>
          </div>

          {/* Results */}
          {auditQuery.isLoading && (
            <div className="flex justify-end gap-2">
              <Spinner className="h-4 w-4" />
              <span className="text-sm">جاري التحقق...</span>
            </div>
          )}

          {auditQuery.data?.checked && auditQuery.data.checked === true && (() => {
            const data = auditQuery.data;
            return (
              <div className="space-y-6">
                {/* Patient Data */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-border/90 bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">بيانات المريض من جدول patients</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {data.patient ? (
                        <>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{data.patient.fullName}</span>
                            <span className="text-xs">الاسم</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{data.patient.patientCode}</span>
                            <span className="text-xs">رمز المريض</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{data.patient.phone}</span>
                            <span className="text-xs">الهاتف</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{data.patient.doctorCode || '—'}</span>
                            <span className="text-xs">رمز الطبيب</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{data.patient.serviceCode || '—'}</span>
                            <span className="text-xs">رمز الخدمة</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">لم يتم العثور على المريض</span>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/90 bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">حالة الجلسة من patientPageStates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {data.pageStateSessionFields ? (
                        <>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{String(data.pageStateSessionFields.doctorName || '—')}</span>
                            <span className="text-xs">اسم الطبيب</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">
                              {typeof data.pageStateSessionFields.visitDate === 'string'
                                ? new Date(data.pageStateSessionFields.visitDate).toLocaleDateString('ar-EG')
                                : '—'}
                            </span>
                            <span className="text-xs">تاريخ الزيارة</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{String(data.pageStateSessionFields.sheetSelection || '—').substring(0, 30)}</span>
                            <span className="text-xs">اختيار الورقة</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{String(data.pageStateSessionFields.serviceCode || '—')}</span>
                            <span className="text-xs">رمز الخدمة</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">لا توجد حالة جلسة</span>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Checklist Comparison */}
                <div className="space-y-3">
                  <h3 className="font-semibold">مقارنة قائمة المراجعة الطبية</h3>
                  {data.checklistNormalized ? (
                    <div className="overflow-x-auto rounded border border-border">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-2 py-2 font-semibold">تطابق</th>
                            <th className="px-2 py-2 font-semibold">قيمة patientPageStates</th>
                            <th className="px-2 py-2 font-semibold">قيمة المعيار</th>
                            <th className="px-2 py-2 font-semibold">الحقل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.checklistNormalized).map(([key, normalizedValue]) => {
                            const pageStateValue = data.checklistInPageState ? (data.checklistInPageState as Record<string, unknown>)[key] : undefined;
                            const match = normalizedValue === pageStateValue;
                            return (
                              <tr key={key} className="border-b border-border">
                                <td className="px-2 py-2">
                                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                                    match
                                      ? 'bg-green-100 text-green-800'
                                      : pageStateValue !== undefined && pageStateValue !== null
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {match ? '✅' : pageStateValue !== undefined && pageStateValue !== null ? '⚠️' : '—'}
                                  </span>
                                </td>
                                <td className="px-2 py-2 font-mono">{String(pageStateValue ?? '—')}</td>
                                <td className="px-2 py-2 font-mono">{String(normalizedValue ?? '—')}</td>
                                <td className="px-2 py-2 font-semibold">{key}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                      <AlertDescription>
                        لا يوجد سجل checklist معياري (examination_checklist_items) لهذا المريض
                      </AlertDescription>
                    </Alert>
                  )}

                  {!data.checklistInPageState && (
                    <Alert className="border-blue-200 bg-blue-50 text-blue-800">
                      <AlertDescription>
                        لا توجد بيانات checklist في patientPageStates
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Autoref + IOP */}
                {data.autoref && (
                  <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                    <h4 className="font-semibold">انكسار العين (Autoref) + ضغط العين (IOP)</h4>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between"><span>OD Sphere</span><span className="font-mono">{data.autoref.sphereOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OD Cylinder</span><span className="font-mono">{data.autoref.cylinderOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OD Axis</span><span className="font-mono">{data.autoref.axisOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Sphere</span><span className="font-mono">{data.autoref.sphereOS || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Cylinder</span><span className="font-mono">{data.autoref.cylinderOS || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Axis</span><span className="font-mono">{data.autoref.axisOS || '—'}</span></div>
                      <div className="flex justify-between"><span>IOP OD</span><span className="font-mono">{data.autoref.iopOD || '—'}</span></div>
                      <div className="flex justify-between"><span>IOP OS</span><span className="font-mono">{data.autoref.iopOS || '—'}</span></div>
                    </div>
                  </div>
                )}

                {/* After Refraction */}
                {data.afterRef && (
                  <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                    <h4 className="font-semibold">بعد الانكسار (After Refraction)</h4>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between"><span>OD Sphere</span><span className="font-mono">{data.afterRef.sphereOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OD Cylinder</span><span className="font-mono">{data.afterRef.cylinderOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OD Axis</span><span className="font-mono">{data.afterRef.axisOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Sphere</span><span className="font-mono">{data.afterRef.sphereOS || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Cylinder</span><span className="font-mono">{data.afterRef.cylinderOS || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Axis</span><span className="font-mono">{data.afterRef.axisOS || '—'}</span></div>
                    </div>
                  </div>
                )}

                {/* Glasses */}
                {data.glasses && (
                  <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                    <h4 className="font-semibold">نظارة / مقاس العدسات (Refraction)</h4>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between"><span>OD Sphere</span><span className="font-mono">{data.glasses.sOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OD Cylinder</span><span className="font-mono">{data.glasses.cOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OD Axis</span><span className="font-mono">{data.glasses.axisOD || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Sphere</span><span className="font-mono">{data.glasses.sOS || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Cylinder</span><span className="font-mono">{data.glasses.cOS || '—'}</span></div>
                      <div className="flex justify-between"><span>OS Axis</span><span className="font-mono">{data.glasses.axisOS || '—'}</span></div>
                      <div className="flex justify-between"><span>PD OD</span><span className="font-mono">{data.glasses.pdOD || '—'}</span></div>
                      <div className="flex justify-between"><span>ADD OD</span><span className="font-mono">{data.glasses.addOD || '—'}</span></div>
                    </div>
                  </div>
                )}

                {/* Pentacam */}
                {data.pentacam && (
                  <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                    <h4 className="font-semibold">بيانات البنتاكام (Pentacam)</h4>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between"><span>K1 OD</span><span className="font-mono">{data.pentacam.k1OD || '—'}</span></div>
                      <div className="flex justify-between"><span>K2 OD</span><span className="font-mono">{data.pentacam.k2OD || '—'}</span></div>
                      <div className="flex justify-between"><span>K1 OS</span><span className="font-mono">{data.pentacam.k1OS || '—'}</span></div>
                      <div className="flex justify-between"><span>K2 OS</span><span className="font-mono">{data.pentacam.k2OS || '—'}</span></div>
                      <div className="flex justify-between"><span>Thinnest OD</span><span className="font-mono">{data.pentacam.thinnestPointOD || '—'}</span></div>
                      <div className="flex justify-between"><span>Thinnest OS</span><span className="font-mono">{data.pentacam.thinnestPointOS || '—'}</span></div>
                    </div>
                  </div>
                )}

                {/* Fundus/Treatment via Doctor Report */}
                {data.doctorReport && (
                  <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                    <h4 className="font-semibold">التشخيص والقرار العلاجي (Diagnosis & Treatment)</h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="font-semibold">التشخيص</div>
                        <div className="font-mono text-muted-foreground line-clamp-2">{data.doctorReport.diagnosis || '—'}</div>
                      </div>
                      <div>
                        <div className="font-semibold">العلاج</div>
                        <div className="font-mono text-muted-foreground line-clamp-2">{data.doctorReport.treatment || '—'}</div>
                      </div>
                      <div>
                        <div className="font-semibold">التوصيات</div>
                        <div className="font-mono text-muted-foreground line-clamp-2">{data.doctorReport.recommendations || '—'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Requests */}
                {data.testRequest && (
                  <div className="space-y-2 rounded border border-border bg-muted/20 p-3">
                    <h4 className="font-semibold">طلبات الفحوصات (Test Requests)</h4>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between"><span>تاريخ الطلب</span><span className="font-mono">{data.testRequest.requestDate ? new Date(String(data.testRequest.requestDate)).toLocaleDateString('ar-EG') : '—'}</span></div>
                      <div className="flex justify-between"><span>الحالة</span><span className="font-mono">{data.testRequest.status || '—'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {auditQuery.error && (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription>
                خطأ: {auditQuery.error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
