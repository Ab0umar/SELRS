import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  Edit,
  User,
  Calendar,
  Phone,
  CreditCard,
  Briefcase,
  FileText,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Eye,
  Activity,
  Heart,
  Layers
} from "lucide-react";

// Translations
const GENDER_AR = { male: "ذكر", female: "أنثى" };
const VISIT_TYPE_AR = {
  consultation: "كشف / استشارة",
  examination: "فحص طبي",
  followup: "متابعة",
  operation: "عملية جراحية"
};
const VISIT_STATUS_AR = {
  scheduled: "مجدول",
  arrived: "وصل بالعيادة",
  in_progress: "قيد الكشف",
  completed: "اكتمل",
  cancelled: "ملغي"
};
const OP_STATUS_AR = {
  scheduled: "مجدولة",
  completed: "اكتملت",
  cancelled: "ملغاة"
};
const FOLLOWUP_STATUS_AR = {
  scheduled: "مجدولة",
  completed: "اكتملت",
  missed: "لم يحضر"
};

export default function KfPatientDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  // Active Tab state
  const [activeTab, setActiveTab] = useState("visits");

  // Selected Exam for details dialog
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  // Queries
  const { data: patient, isLoading: loadingPatient, isError } = trpc.kf.getPatient.useQuery(
    { kfId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const { data: visits = [], isLoading: loadingVisits } = trpc.kf.listVisits.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const { data: examinations = [], isLoading: loadingExams } = trpc.kf.listExaminations.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const { data: operations = [], isLoading: loadingOps } = trpc.kf.listOperations.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const { data: followups = [], isLoading: loadingFollows } = trpc.kf.listFollowups.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  // Selected Exam query
  const { data: selectedExam, isLoading: loadingSelectedExam } = trpc.kf.getExamination.useQuery(
    { kfExamId: selectedExamId ?? 0 },
    { enabled: !!selectedExamId }
  );

  if (loadingPatient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-bold">عذراً، لم يتم العثور على ملف المريض المطلوب</h2>
        <Button onClick={() => setLocation("/kf/patients")} className="mt-4">
          الرجوع لقائمة المرضى
        </Button>
      </div>
    );
  }

  // Refraction display helper
  const renderRefraction = (refractionObj: any) => {
    if (!refractionObj) return "—";
    const { sph, cyl, axis } = refractionObj as any;
    if (!sph && !cyl && !axis) return "—";
    return `Sph: ${sph || "0.00"}, Cyl: ${cyl || "0.00"}, Axis: ${axis || "0"}`;
  };

  return (
    <section dir="rtl" className="space-y-6">
      {/* Back & Edit Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/kf/patients")} className="self-start gap-1 cursor-pointer">
          <ChevronRight className="h-4 w-4" />
          <span>الرجوع لسجل المرضى</span>
        </Button>
        <Button asChild variant="outline" className="gap-2 self-start sm:self-auto">
          <Link href={`/kf/patients/${patient.kfId}/edit`}>
            <Edit className="h-4 w-4" />
            <span>تعديل بيانات المريض</span>
          </Link>
        </Button>
      </div>

      {/* Patient Header Card */}
      <Card className="overflow-hidden border-primary/10">
        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{patient.fullName}</h2>
              <span className="font-mono text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                {patient.kfCode}
              </span>
            </div>
          </div>
          {patient.selrsPatientCode && (
            <div className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1 rounded-full text-muted-foreground w-fit">
              <Heart className="h-4 w-4 text-rose-500" />
              <span>مرتبط بـ SELRS: </span>
              <strong className="font-mono">{patient.selrsPatientCode}</strong>
            </div>
          )}
        </div>

        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">السن / الجنس</span>
              <span className="font-medium text-sm">
                {patient.age ? `${patient.age} سنة` : "—"} / {patient.gender ? (GENDER_AR as Record<string, string>)[patient.gender] : "—"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">رقم الموبايل</span>
              {patient.phone ? (
                <span className="font-medium text-sm inline-flex items-center gap-1" dir="ltr">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {patient.phone}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">رقم الهوية / الرقم القومي</span>
              <span className="font-medium text-sm inline-flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-muted-foreground" />
                {patient.nationalId || "—"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">تاريخ التسجيل</span>
              <span className="font-medium text-sm inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {new Date(patient.createdAt).toLocaleDateString("ar-EG")}
              </span>
            </div>
          </div>

          <hr className="my-4 border-border/60" />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">المهنة</span>
              <span className="text-sm font-medium inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                {patient.occupation || "—"}
              </span>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground block">العنوان بالكامل</span>
              <span className="text-sm font-medium">{patient.address || "—"}</span>
            </div>
          </div>

          {(patient.medicalHistory || patient.allergies || patient.notes) && (
            <>
              <hr className="my-4 border-border/60" />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1 p-2 rounded bg-amber-50/10 border border-amber-500/10">
                  <span className="text-xs text-amber-600 font-bold block">التاريخ المرضي العام</span>
                  <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{patient.medicalHistory || "لا يوجد"}</p>
                </div>
                <div className="space-y-1 p-2 rounded bg-red-50/10 border border-red-500/10">
                  <span className="text-xs text-red-600 font-bold block">حساسية الأدوية / الأطعمة</span>
                  <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{patient.allergies || "لا يوجد"}</p>
                </div>
                <div className="space-y-1 p-2 rounded bg-muted/50 border border-border/40">
                  <span className="text-xs text-muted-foreground font-bold block">ملاحظات إضافية</span>
                  <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{patient.notes || "لا يوجد"}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sub-records Tabs section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-1 mb-4 gap-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="visits" className="gap-1.5 cursor-pointer">
              <Layers className="h-4 w-4" />
              <span>الزيارات ({visits.length})</span>
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-1.5 cursor-pointer">
              <Eye className="h-4 w-4" />
              <span>الفحوصات الطبية ({examinations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-1.5 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" />
              <span>العمليات ({operations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="followups" className="gap-1.5 cursor-pointer">
              <Calendar className="h-4 w-4" />
              <span>المتابعات ({followups.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Add Records Action Button based on selected tab */}
          <div>
            {activeTab === "visits" && (
              <Button asChild size="sm" className="gap-1.5 cursor-pointer">
                <Link href={`/kf/patients/${patient.kfId}/visits/new`}>
                  <Plus className="h-4 w-4" />
                  <span>إضافة زيارة جديدة</span>
                </Link>
              </Button>
            )}
            {activeTab === "exams" && (
              <Button asChild size="sm" className="gap-1.5 cursor-pointer">
                <Link href={`/kf/patients/${patient.kfId}/examinations/new`}>
                  <Plus className="h-4 w-4" />
                  <span>إضافة فحص جديد</span>
                </Link>
              </Button>
            )}
            {activeTab === "operations" && (
              <Button asChild size="sm" className="gap-1.5 cursor-pointer">
                <Link href={`/kf/patients/${patient.kfId}/operations/new`}>
                  <Plus className="h-4 w-4" />
                  <span>حجز عملية جراحية</span>
                </Link>
              </Button>
            )}
            {activeTab === "followups" && (
              <Button asChild size="sm" className="gap-1.5 cursor-pointer">
                <Link href={`/kf/patients/${patient.kfId}/followups/new`}>
                  <Plus className="h-4 w-4" />
                  <span>جدولة متابعة</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Visits Tab */}
        <TabsContent value="visits">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاريخ الزيارة</TableHead>
                    <TableHead className="text-right">نوع الزيارة</TableHead>
                    <TableHead className="text-right">الطبيب المعالج</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingVisits ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : visits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        لا توجد زيارات مسجلة لهذا المريض. اضغط على "إضافة زيارة جديدة" للبدء.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visits.map((v: any) => (
                      <TableRow key={v.kfVisitId}>
                        <TableCell className="font-semibold">
                          {new Date(v.visitDate).toLocaleDateString("ar-EG")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(VISIT_TYPE_AR as Record<string, string>)[v.visitType ?? "consultation"] || v.visitType}
                          </Badge>
                        </TableCell>
                        <TableCell>{v.doctorName || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              v.status === "completed"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : v.status === "cancelled"
                                ? "bg-destructive hover:bg-destructive/90"
                                : v.status === "in_progress"
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-primary hover:bg-primary/95"
                            }
                          >
                            {(VISIT_STATUS_AR as Record<string, string>)[v.status ?? "scheduled"] || v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={v.notes ?? ""}>
                          {v.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examinations Tab */}
        <TabsContent value="exams">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاريخ الفحص</TableHead>
                    <TableHead className="text-right">العين اليمنى VA</TableHead>
                    <TableHead className="text-right">العين اليسرى VA</TableHead>
                    <TableHead className="text-right">ضغط العين (ي / ش)</TableHead>
                    <TableHead className="text-right">التشخيص</TableHead>
                    <TableHead className="text-right">الطبيب الفاحص</TableHead>
                    <TableHead className="text-left">عرض</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExams ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : examinations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        لا توجد فحوصات مسجلة لهذا المريض. اضغط على "إضافة فحص جديد" للبدء.
                      </TableCell>
                    </TableRow>
                  ) : (
                    examinations.map((e: any) => (
                      <TableRow key={e.kfExamId}>
                        <TableCell className="font-semibold">
                          {new Date(e.examDate).toLocaleDateString("ar-EG")}
                        </TableCell>
                        <TableCell>{e.rightVa || "—"}</TableCell>
                        <TableCell>{e.leftVa || "—"}</TableCell>
                        <TableCell>
                          {e.iopRight || "—"} / {e.iopLeft || "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={e.diagnosis ?? ""}>
                          {e.diagnosis || "—"}
                        </TableCell>
                        <TableCell>{e.doctorName || "—"}</TableCell>
                        <TableCell className="text-left">
                          <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setSelectedExamId(e.kfExamId)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاريخ العملية</TableHead>
                    <TableHead className="text-right">نوع العملية</TableHead>
                    <TableHead className="text-right">العين</TableHead>
                    <TableHead className="text-right">الجراح</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOps ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : operations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        لا توجد عمليات جراحية مسجلة.
                      </TableCell>
                    </TableRow>
                  ) : (
                    operations.map((op: any) => (
                      <TableRow key={op.kfOpId}>
                        <TableCell className="font-semibold">
                          {new Date(op.opDate).toLocaleDateString("ar-EG")}
                        </TableCell>
                        <TableCell className="font-medium">{op.opType}</TableCell>
                        <TableCell>
                          {op.eye === "both" ? "العينين" : op.eye === "right" ? "اليمنى" : op.eye === "left" ? "اليسرى" : "—"}
                        </TableCell>
                        <TableCell>{op.doctorName || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              op.status === "completed"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : op.status === "cancelled"
                                ? "bg-destructive hover:bg-destructive/90"
                                : "bg-primary hover:bg-primary/95"
                            }
                          >
                            {(OP_STATUS_AR as Record<string, string>)[op.status ?? "scheduled"] || op.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={op.notes ?? ""}>
                          {op.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Followups Tab */}
        <TabsContent value="followups">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاريخ المتابعة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingFollows ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : followups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        لا توجد متابعات مسجلة لهذا المريض.
                      </TableCell>
                    </TableRow>
                  ) : (
                    followups.map((f: any) => (
                      <TableRow key={f.kfFollowupId}>
                        <TableCell className="font-semibold">
                          {new Date(f.followupDate).toLocaleDateString("ar-EG")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              f.status === "completed"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : f.status === "missed"
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-primary hover:bg-primary/95"
                            }
                          >
                            {(FOLLOWUP_STATUS_AR as Record<string, string>)[f.status ?? "scheduled"] || f.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{f.notes || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Examination Details Dialog */}
      <Dialog open={!!selectedExamId} onOpenChange={(open) => !open && setSelectedExamId(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {loadingSelectedExam ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              جاري تحميل الفحص الطبي...
            </div>
          ) : selectedExam ? (
            <div className="space-y-6">
              <DialogHeader className="text-right">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span>تفاصيل الفحص الطبي بتاريخ {new Date(selectedExam.examDate).toLocaleDateString("ar-EG")}</span>
                </DialogTitle>
                <DialogDescription>
                  رقم الكشف: {selectedExam.kfExamId} | الطبيب الفاحص: {selectedExam.doctorName || "غير محدد"}
                </DialogDescription>
              </DialogHeader>

              {/* VA & IOP */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-primary/5">
                  <CardHeader className="py-2.5 px-4 bg-primary/5">
                    <CardTitle className="text-sm">حدة الإبصار (Visual Acuity)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">العين اليمنى</span>
                      <strong className="text-base">{selectedExam.rightVa || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">العين اليسرى</span>
                      <strong className="text-base">{selectedExam.leftVa || "—"}</strong>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/5">
                  <CardHeader className="py-2.5 px-4 bg-primary/5">
                    <CardTitle className="text-sm">ضغط العين (IOP)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">العين اليمنى</span>
                      <strong className="text-base">{selectedExam.iopRight || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">العين اليسرى</span>
                      <strong className="text-base">{selectedExam.iopLeft || "—"}</strong>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Refraction (Sphere/Cylinder/Axis) */}
              <Card className="border-primary/5">
                <CardHeader className="py-2.5 px-4 bg-primary/5">
                  <CardTitle className="text-sm">مقاسات الانكسار (Refraction)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid gap-4 sm:grid-cols-2 text-sm">
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs font-bold text-primary block mb-1">العين اليمنى (OD)</span>
                    <span className="font-mono">{renderRefraction(selectedExam.rightRefraction)}</span>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs font-bold text-primary block mb-1">العين اليسرى (OS)</span>
                    <span className="font-mono">{renderRefraction(selectedExam.leftRefraction)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Clinical Details */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-bold block">التشخيص (Diagnosis)</span>
                  <div className="p-3 border rounded-lg bg-card text-sm whitespace-pre-wrap">
                    {selectedExam.diagnosis || "لا يوجد تشخيص مسجل."}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-bold block">الخطة العلاجية (Treatment Plan)</span>
                  <div className="p-3 border rounded-lg bg-card text-sm whitespace-pre-wrap">
                    {selectedExam.plan || "لا توجد خطة مسجلة."}
                  </div>
                </div>

                {selectedExam.notes && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-bold block">ملاحظات الكشف</span>
                    <div className="p-3 border rounded-lg bg-card text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedExam.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-destructive">فشل تحميل تفاصيل الفحص</div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
