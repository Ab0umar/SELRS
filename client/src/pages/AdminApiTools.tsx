import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { Plug } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

const TRPC_API_REFERENCE = [
  { method: "query" as const, path: "medical.getAppointments", description: "جلب جميع المواعيد", status: "فعال" },
  { method: "query" as const, path: "medical.getAppointmentsByPatient", description: "مواعيد مريض محدد", status: "فعال" },
  { method: "mutation" as const, path: "medical.createAppointment", description: "إنشاء موعد", status: "فعال" },
  { method: "query" as const, path: "medical.getAllExaminations", description: "جميع الفحوصات", status: "فعال" },
  { method: "mutation" as const, path: "medical.createExamination", description: "إنشاء فحص", status: "فعال" },
  { method: "mutation" as const, path: "medical.updateExamination", description: "تحديث فحص", status: "فعال" },
  { method: "query" as const, path: "medical.getRuntimeDbInfo", description: "معلومات اتصال قاعدة التشغيل", status: "صلاحية admin" },
  { method: "mutation" as const, path: "medical.createPentacamResult", description: "إنشاء سجل بنتاكام", status: "فعال" },
  { method: "query" as const, path: "medical.getPentacamResultsByVisit", description: "بنتاكام حسب الزيارة", status: "فعال" },
  { method: "mutation" as const, path: "medical.createDoctorReport", description: "تقرير طبيب", status: "فعال" },
  { method: "query" as const, path: "medical.getDoctorReportsByVisit", description: "تقارير حسب الزيارة", status: "فعال" },
  { method: "query" as const, path: "medical.getMssqlSyncStatus", description: "حالة مزامنة MSSQL", status: "فعال" },
  { method: "query" as const, path: "medical.getMssqlSyncRuntimeConfig", description: "إعداد تشغيل المزامنة التلقائية", status: "فعال" },
  { method: "mutation" as const, path: "medical.updateMssqlSyncRuntimeConfig", description: "حفظ إعداد المزامنة التلقائية", status: "فعال" },
  { method: "mutation" as const, path: "medical.syncPatientsFromMssql", description: "مزامنة مرضى من MSSQL", status: "فعال" },
  { method: "mutation" as const, path: "medical.resetMssqlSyncCodes", description: "إعادة ضبط رموز المزامنة", status: "خطر" },
  { method: "mutation" as const, path: "medical.resetPatientsAutoIncrement", description: "AUTO_INCREMENT للمرضى", status: "خطر" },
] as const;

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(
      value,
      (_, v) => (typeof v === "bigint" ? String(v) : v),
      2
    );
  } catch {
    return String(value);
  }
}

export default function AdminApiTools() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [patientId, setPatientId] = useState("");
  const [visitId, setVisitId] = useState("");
  const [examinationId, setExaminationId] = useState("");

  const [appointmentDate, setAppointmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [appointmentType, setAppointmentType] = useState<"examination" | "surgery" | "followup">("examination");
  const [appointmentBranch, setAppointmentBranch] = useState<"examinations" | "surgery">("examinations");

  const [diagnosis, setDiagnosis] = useState("Demo diagnosis");
  const [clinicalOpinion, setClinicalOpinion] = useState("");
  const [recommendedTreatment, setRecommendedTreatment] = useState("");

  const [pentacamLtK1, setPentacamLtK1] = useState("");
  const [syncLimit, setSyncLimit] = useState("500");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [autoSyncIncremental, setAutoSyncIncremental] = useState(true);
  const [autoSyncOverwriteExisting, setAutoSyncOverwriteExisting] = useState(false);
  const [autoSyncPreserveManualEdits, setAutoSyncPreserveManualEdits] = useState(true);
  const [autoSyncLinkServices, setAutoSyncLinkServices] = useState(true);
  const [autoSyncIntervalMs, setAutoSyncIntervalMs] = useState("30000");
  const [lastSyncResult, setLastSyncResult] = useState<null | {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
    dryRun: boolean;
    startedAt: string;
    finishedAt: string;
  }>(null);
  const [previewRequest, setPreviewRequest] = useState(
    '{\n  "تلميح": "استخدم الأزرار أدناه لعرض مثال الإدخال ونتيجة tRPC"\n}'
  );
  const [previewResponse, setPreviewResponse] = useState("// لا توجد استجابة بعد");

  const capturePreview = (procedure: string, input: unknown, output: unknown) => {
    setPreviewRequest(safeStringify({ procedure, input }));
    setPreviewResponse(safeStringify(output));
  };

  const appointmentsQuery = trpc.medical.getAppointments.useQuery(undefined, { enabled: false });
  const appointmentsByPatientQuery = trpc.medical.getAppointmentsByPatient.useQuery(
    { patientId: Number(patientId || 0) },
    { enabled: false }
  );
  const examinationsQuery = trpc.medical.getAllExaminations.useQuery(undefined, { enabled: false });
  const pentacamByVisitQuery = trpc.medical.getPentacamResultsByVisit.useQuery(
    { visitId: Number(visitId || 0) },
    { enabled: false }
  );
  const doctorReportsByVisitQuery = trpc.medical.getDoctorReportsByVisit.useQuery(
    { visitId: Number(visitId || 0) },
    { enabled: false }
  );
  const mssqlSyncStatusQuery = trpc.medical.getMssqlSyncStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  });
  const mssqlSyncRuntimeQuery = trpc.medical.getMssqlSyncRuntimeConfig.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 10000,
  });
  const runtimeDbInfoQuery = trpc.medical.getRuntimeDbInfo.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: false,
  });

  const createAppointmentMutation = trpc.medical.createAppointment.useMutation({
    onSuccess: () => toast.success("تم إنشاء الموعد"),
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل إنشاء الموعد")),
  });

  const createExaminationMutation = trpc.medical.createExamination.useMutation({
    onSuccess: () => toast.success("تم إنشاء الفحص"),
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل إنشاء الفحص")),
  });

  const updateExaminationMutation = trpc.medical.updateExamination.useMutation({
    onSuccess: () => toast.success("تم تحديث الفحص"),
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل تحديث الفحص")),
  });

  const createPentacamMutation = trpc.medical.createPentacamResult.useMutation({
    onSuccess: () => toast.success("تم حفظ بنتاكام"),
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل حفظ بنتاكام")),
  });

  const createDoctorReportMutation = trpc.medical.createDoctorReport.useMutation({
    onSuccess: () => toast.success("تم حفظ تقرير الطبيب"),
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل حفظ التقرير")),
  });

  const resetMssqlSyncCodesMutation = trpc.medical.resetMssqlSyncCodes.useMutation({
    onSuccess: (result) => {
      capturePreview("medical.resetMssqlSyncCodes", {}, result);
      toast.success(`Reset ${result.affected} patients — now run full sync`);
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "Failed to reset sync codes")),
  });

  const [autoIncrementValue, setAutoIncrementValue] = useState("1128");
  const resetAutoIncrementMutation = trpc.medical.resetPatientsAutoIncrement.useMutation({
    onSuccess: (result, variables) => {
      capturePreview("medical.resetPatientsAutoIncrement", variables, result);
      toast.success(`AUTO_INCREMENT set to ${result.value}`);
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "Failed to reset AUTO_INCREMENT")),
  });

  const syncMssqlPatientsMutation = trpc.medical.syncPatientsFromMssql.useMutation({
    onSuccess: (result, variables) => {
      setLastSyncResult({
        fetched: Number(result.fetched ?? 0),
        inserted: Number(result.inserted ?? 0),
        updated: Number(result.updated ?? 0),
        skipped: Number(result.skipped ?? 0),
        dryRun: Boolean(result.dryRun),
        startedAt: String(result.startedAt ?? ""),
        finishedAt: String(result.finishedAt ?? ""),
      });
      capturePreview("medical.syncPatientsFromMssql", variables, result);
      void mssqlSyncStatusQuery.refetch();
      toast.success("MSSQL patient sync completed");
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "MSSQL sync failed")),
  });
  const updateMssqlSyncRuntimeMutation = trpc.medical.updateMssqlSyncRuntimeConfig.useMutation({
    onSuccess: async (result, variables) => {
      capturePreview("medical.updateMssqlSyncRuntimeConfig", variables, result ?? { ok: true });
      toast.success("Auto sync config saved");
      await mssqlSyncRuntimeQuery.refetch();
    },
    onError: (error: unknown) =>
      toast.error(getTrpcErrorMessage(error, "Failed to save auto sync config")),
  });

  useEffect(() => {
    const cfg = mssqlSyncRuntimeQuery.data;
    if (!cfg) return;
    setAutoSyncEnabled(Boolean(cfg.enabled));
    setAutoSyncIncremental(Boolean(cfg.incremental));
    setAutoSyncOverwriteExisting(Boolean((cfg as any).overwriteExisting));
    setAutoSyncPreserveManualEdits(Boolean((cfg as any).preserveManualEdits ?? true));
    setAutoSyncLinkServices(Boolean((cfg as any).linkServicesForExisting ?? true));
    setAutoSyncIntervalMs(String(cfg.intervalMs ?? 30000));
    setSyncLimit(String(cfg.limit ?? 500));
  }, [mssqlSyncRuntimeQuery.data]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;
  if (user?.role !== "admin") return null;

  const patientIdNum = Number(patientId || 0);
  const visitIdNum = Number(visitId || 0);
  const examIdNum = Number(examinationId || 0);

  return (
    <div dir="rtl" className="mx-auto w-full max-w-[1440px] space-y-6 pb-2">
      <PageHeader
        title="أدوات API"
        subtitle="أدوات tRPC للمشرفين: استدعاءات مباشرة، مزامنة MSSQL، وتشخيص قاعدة البيانات — الواجهة العامة للتطبيق تستخدم نفس المسار عبر /trpc"
        icon={<Plug className="h-5 w-5" />}
      />

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">معاينة الطلب والاستجابة</CardTitle>
          <p className="text-sm text-muted-foreground">
            تُحدَّث تلقائياً عند تنفيذ الأزرار في الصفحة (آخر عملية ناجحة أو بيانات جلب).
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="request" className="w-full">
            <TabsList className="mb-3 w-full justify-start sm:w-auto">
              <TabsTrigger value="request">الطلب</TabsTrigger>
              <TabsTrigger value="response">الاستجابة</TabsTrigger>
            </TabsList>
            <TabsContent value="request" className="mt-0">
              <pre
                className="max-h-[280px] overflow-auto rounded-lg border border-border/80 bg-muted/30 p-4 text-left text-xs leading-relaxed dir-ltr font-mono"
                dir="ltr"
              >
                {previewRequest}
              </pre>
            </TabsContent>
            <TabsContent value="response" className="mt-0">
              <pre
                className="max-h-[280px] overflow-auto rounded-lg border border-border/80 bg-muted/30 p-4 text-left text-xs leading-relaxed dir-ltr font-mono whitespace-pre-wrap"
                dir="ltr"
              >
                {previewResponse}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-1 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">مرجع إجراءات tRPC (هذه الصفحة)</CardTitle>
          <span className="text-xs text-muted-foreground">زمن الاستجابة غير مُقاس تلقائياً — استخدم أدوات المتصفح أو الشبكة</span>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right font-bold">الطريقة</TableHead>
                  <TableHead className="min-w-[220px] text-right font-bold">المسار</TableHead>
                  <TableHead className="text-right font-bold">الوصف</TableHead>
                  <TableHead className="text-center font-bold">الحالة</TableHead>
                  <TableHead className="text-center font-bold w-28">زمن الاستجابة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRPC_API_REFERENCE.map((row) => (
                  <TableRow key={row.path}>
                    <TableCell>
                      <Badge
                        variant={row.method === "query" ? "secondary" : "default"}
                        className={
                          row.method === "query"
                            ? "bg-success/15 text-success"
                            : "bg-primary text-primary-foreground"
                        }
                      >
                        {row.method === "query" ? "query" : "mutation"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all dir-ltr text-right">{row.path}</TableCell>
                    <TableCell className="text-sm">{row.description}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>المعرفات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="patientId"
            />
            <Input
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              placeholder="visitId"
            />
            <Input
              value={examinationId}
              onChange={(e) => setExaminationId(e.target.value)}
              placeholder="examinationId"
            />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>المواعيد (Appointments)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
              <Select value={appointmentType} onValueChange={(v) => setAppointmentType(v as any)}>
                <SelectTrigger><SelectValue placeholder="نوع الموعد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="examination">فحص</SelectItem>
                  <SelectItem value="surgery">عملية</SelectItem>
                  <SelectItem value="followup">متابعة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={appointmentBranch} onValueChange={(v) => setAppointmentBranch(v as any)}>
                <SelectTrigger><SelectValue placeholder="الفرع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="examinations">فحوصات</SelectItem>
                  <SelectItem value="surgery">عمليات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
                onClick={async () => {
                  const input = {
                    patientId: patientIdNum,
                    appointmentDate,
                    appointmentType,
                    branch: appointmentBranch,
                  };
                  try {
                    const out = await createAppointmentMutation.mutateAsync(input);
                    capturePreview("medical.createAppointment", input, out);
                  } catch (error: unknown) {
                    capturePreview("medical.createAppointment", input, {
                      error: getTrpcErrorMessage(error, "فشل"),
                    });
                  }
                }}
              >
                إنشاء موعد
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const r = await appointmentsQuery.refetch();
                  capturePreview(
                    "medical.getAppointments",
                    {},
                    r.error ? { error: getTrpcErrorMessage(r.error, "فشل") } : r.data
                  );
                }}
              >
                جميع المواعيد
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const input = { patientId: patientIdNum };
                  const r = await appointmentsByPatientQuery.refetch();
                  capturePreview(
                    "medical.getAppointmentsByPatient",
                    input,
                    r.error ? { error: getTrpcErrorMessage(r.error, "فشل") } : r.data
                  );
                }}
              >
                مواعيد المريض
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              عدد (جميع المواعيد): {appointmentsQuery.data ? appointmentsQuery.data.length : "-"} | عدد (مواعيد المريض):{" "}
              {appointmentsByPatientQuery.data ? appointmentsByPatientQuery.data.length : "-"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>الفحوصات (Examinations)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
                onClick={async () => {
                  const input = { visitId: visitIdNum, patientId: patientIdNum, ucvaOD: "6/6" };
                  try {
                    const out = await createExaminationMutation.mutateAsync(input);
                    capturePreview("medical.createExamination", input, out);
                  } catch (error: unknown) {
                    capturePreview("medical.createExamination", input, {
                      error: getTrpcErrorMessage(error, "فشل"),
                    });
                  }
                }}
              >
                إنشاء فحص
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const input = { examinationId: examIdNum, updates: { findings: "Updated findings" } };
                  try {
                    const out = await updateExaminationMutation.mutateAsync(input);
                    capturePreview("medical.updateExamination", input, out);
                  } catch (error: unknown) {
                    capturePreview("medical.updateExamination", input, {
                      error: getTrpcErrorMessage(error, "فشل"),
                    });
                  }
                }}
              >
                تحديث فحص
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const r = await examinationsQuery.refetch();
                  capturePreview(
                    "medical.getAllExaminations",
                    {},
                    r.error ? { error: getTrpcErrorMessage(r.error, "فشل") } : r.data
                  );
                }}
              >
                جميع الفحوصات
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              عدد السجلات المعروضة: {examinationsQuery.data ? examinationsQuery.data.length : "-"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Runtime DB (تشخيص)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={async () => {
                const r = await runtimeDbInfoQuery.refetch();
                capturePreview(
                  "medical.getRuntimeDbInfo",
                  {},
                  r.error ? { error: getTrpcErrorMessage(r.error, "فشل") } : r.data
                );
              }}
            >
              فحص قاعدة التشغيل النشطة
            </Button>
            <div className="text-sm text-muted-foreground">
              {runtimeDbInfoQuery.isFetching
                ? "Checking..."
                : runtimeDbInfoQuery.data
                  ? `Host: ${runtimeDbInfoQuery.data.host ?? "-"} | Port: ${runtimeDbInfoQuery.data.port ?? "-"} | DB: ${runtimeDbInfoQuery.data.database ?? "-"} | URL: ${runtimeDbInfoQuery.data.maskedUrl ?? "-"}`
                  : "No runtime DB info loaded yet"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>البنتاكام (Pentacam)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={pentacamLtK1}
              onChange={(e) => setPentacamLtK1(e.target.value)}
              placeholder="ltK1"
            />
            <div className="flex gap-2">
              <Button
                className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
                onClick={async () => {
                  const input = {
                    visitId: visitIdNum,
                    patientId: patientIdNum,
                    ltK1: pentacamLtK1 ? Number(pentacamLtK1) : undefined,
                  };
                  try {
                    const out = await createPentacamMutation.mutateAsync(input);
                    capturePreview("medical.createPentacamResult", input, out);
                  } catch (error: unknown) {
                    capturePreview("medical.createPentacamResult", input, {
                      error: getTrpcErrorMessage(error, "فشل"),
                    });
                  }
                }}
              >
                إنشاء بنتاكام
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const input = { visitId: visitIdNum };
                  const r = await pentacamByVisitQuery.refetch();
                  capturePreview(
                    "medical.getPentacamResultsByVisit",
                    input,
                    r.error ? { error: getTrpcErrorMessage(r.error, "فشل") } : r.data
                  );
                }}
              >
                بنتاكام حسب الزيارة
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              عدد السجلات: {pentacamByVisitQuery.data ? pentacamByVisitQuery.data.length : "-"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>تقارير الطبيب (Doctor Reports)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="التشخيص" />
              <Input value={clinicalOpinion} onChange={(e) => setClinicalOpinion(e.target.value)} placeholder="الرأي الطبي" />
              <Input value={recommendedTreatment} onChange={(e) => setRecommendedTreatment(e.target.value)} placeholder="العلاج المقترح" />
            </div>
            <div className="flex gap-2">
              <Button
                className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
                onClick={async () => {
                  const input = {
                    visitId: visitIdNum,
                    patientId: patientIdNum,
                    diagnosis,
                    clinicalOpinion,
                    recommendedTreatment,
                  };
                  try {
                    const out = await createDoctorReportMutation.mutateAsync(input);
                    capturePreview("medical.createDoctorReport", input, out);
                  } catch (error: unknown) {
                    capturePreview("medical.createDoctorReport", input, {
                      error: getTrpcErrorMessage(error, "فشل"),
                    });
                  }
                }}
              >
                إنشاء تقرير طبيب
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const input = { visitId: visitIdNum };
                  const r = await doctorReportsByVisitQuery.refetch();
                  capturePreview(
                    "medical.getDoctorReportsByVisit",
                    input,
                    r.error ? { error: getTrpcErrorMessage(r.error, "فشل") } : r.data
                  );
                }}
              >
                تقارير حسب الزيارة
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              عدد التقارير: {doctorReportsByVisitQuery.data ? doctorReportsByVisitQuery.data.length : "-"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>مزامنة مرضى MSSQL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                value={syncLimit}
                onChange={(e) => setSyncLimit(e.target.value)}
                placeholder="Sync limit (e.g. 500)"
              />
              <Input
                value={autoSyncIntervalMs}
                onChange={(e) => setAutoSyncIntervalMs(e.target.value)}
                placeholder="Auto interval ms (min 5000)"
              />
              <Select value={autoSyncEnabled ? "on" : "off"} onValueChange={(v) => setAutoSyncEnabled(v === "on")}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto Sync" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">Auto Sync ON</SelectItem>
                  <SelectItem value="off">Auto Sync OFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={autoSyncIncremental ? "incremental" : "full"} onValueChange={(v) => setAutoSyncIncremental(v === "incremental")}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto Sync Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incremental">Incremental</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={updateMssqlSyncRuntimeMutation.isPending}
                onClick={() => {
                  if (autoSyncOverwriteExisting) {
                    const ok = window.confirm(
                      "WARNING: Overwrite mode can update existing patient records from MSSQL sync.\nOnly enable if you are sure. Continue?"
                    );
                    if (!ok) return;
                  }
                  updateMssqlSyncRuntimeMutation.mutate({
                    enabled: autoSyncEnabled,
                    incremental: autoSyncIncremental,
                    intervalMs: Math.max(5000, Number(autoSyncIntervalMs || 30000) || 30000),
                    limit: Math.max(1, Math.min(20000, Number(syncLimit || 500) || 500)),
                    overwriteExisting: autoSyncOverwriteExisting,
                    preserveManualEdits: autoSyncPreserveManualEdits,
                    linkServicesForExisting: autoSyncLinkServices,
                  });
                }}
              >
                Save Auto Sync Config
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={autoSyncOverwriteExisting ? "on" : "off"}
                onValueChange={(v) => setAutoSyncOverwriteExisting(v === "on")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Overwrite Existing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Overwrite Existing: OFF (Safe)</SelectItem>
                  <SelectItem value="on">Overwrite Existing: ON (Danger)</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={autoSyncPreserveManualEdits ? "on" : "off"}
                onValueChange={(v) => setAutoSyncPreserveManualEdits(v === "on")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Preserve Manual Edits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">Preserve Manual Edits: ON (Recommended)</SelectItem>
                  <SelectItem value="off">Preserve Manual Edits: OFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={autoSyncLinkServices ? "on" : "off"}
                onValueChange={(v) => setAutoSyncLinkServices(v === "on")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link Services For Existing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">Link Services: ON</SelectItem>
                  <SelectItem value="off">Link Services: OFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {mssqlSyncStatusQuery.data
                ? `State: ${(mssqlSyncStatusQuery.data as any).running ? "Running" : "Idle"} | Last Sync: ${mssqlSyncStatusQuery.data.lastSuccessAt ? new Date(mssqlSyncStatusQuery.data.lastSuccessAt).toLocaleString() : "Never"} | Last Mode: ${mssqlSyncStatusQuery.data.lastMode ?? "-"} | Marker: ${mssqlSyncStatusQuery.data.lastMarker ?? "-"} | Last Changes: ${String((mssqlSyncStatusQuery.data as any).lastChangeCount ?? "-")} | Next Run: ${(mssqlSyncStatusQuery.data as any).nextRunAt ? new Date((mssqlSyncStatusQuery.data as any).nextRunAt).toLocaleString() : "-"}${(mssqlSyncStatusQuery.data as any).lastError ? ` | Last Error: ${String((mssqlSyncStatusQuery.data as any).lastError)}` : ""}`
                : "Loading sync status..."}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={syncMssqlPatientsMutation.isPending}
                onClick={() =>
                  syncMssqlPatientsMutation.mutate({
                    dryRun: true,
                    limit: Math.max(1, Number(syncLimit || 500) || 500),
                  })
                }
              >
                Dry Run MSSQL Sync
              </Button>
              <Button
                variant="outline"
                disabled={syncMssqlPatientsMutation.isPending}
                onClick={() =>
                  syncMssqlPatientsMutation.mutate({
                    dryRun: false,
                    incremental: true,
                    limit: Math.max(1, Number(syncLimit || 500) || 500),
                  })
                }
              >
                Run Incremental Sync
              </Button>
              <Button
                disabled={syncMssqlPatientsMutation.isPending}
                onClick={() =>
                  syncMssqlPatientsMutation.mutate({
                    dryRun: false,
                    incremental: false,
                    limit: Math.max(1, Number(syncLimit || 500) || 500),
                  })
                }
              >
                Run MSSQL Sync
              </Button>
              <Button
                variant="destructive"
                disabled={resetMssqlSyncCodesMutation.isPending || syncMssqlPatientsMutation.isPending}
                onClick={() => resetMssqlSyncCodesMutation.mutate()}
              >
                Reset Sync Codes
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {syncMssqlPatientsMutation.isPending
                ? "Sync running..."
                : lastSyncResult
                  ? `Fetched: ${lastSyncResult.fetched} | Inserted: ${lastSyncResult.inserted} | Updated: ${lastSyncResult.updated} | Skipped: ${lastSyncResult.skipped} | Mode: ${lastSyncResult.dryRun ? "Dry Run" : "Live"}`
                  : "No sync result yet"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>AUTO_INCREMENT — جدول المرضى</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <Input
                value={autoIncrementValue}
                onChange={(e) => setAutoIncrementValue(e.target.value)}
                placeholder="e.g. 1128"
                className="w-40"
              />
              <Button
                variant="destructive"
                disabled={resetAutoIncrementMutation.isPending}
                onClick={() => {
                  const val = Number(autoIncrementValue);
                  if (!val || val < 1) return toast.error("Enter a valid number");
                  if (!window.confirm(`Set patients AUTO_INCREMENT to ${val}?`)) return;
                  resetAutoIncrementMutation.mutate({ value: val });
                }}
              >
                Set AUTO_INCREMENT
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}


