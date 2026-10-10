import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { Plug } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DateInput } from "@/components/ui/date-input";

const TRPC_API_REFERENCE = [
  {
    method: "query" as const,
    path: "medical.getAppointments",
    description: "جلب جميع المواعيد",
    status: "مسجل",
  },
  {
    method: "query" as const,
    path: "medical.getAppointmentsByPatient",
    description: "مواعيد مريض محدد",
    status: "مسجل",
  },
  {
    method: "mutation" as const,
    path: "medical.createAppointment",
    description: "إنشاء موعد",
    status: "مسجل",
  },
  {
    method: "query" as const,
    path: "medical.getAllExaminations",
    description: "جميع الفحوصات",
    status: "مسجل",
  },
  {
    method: "mutation" as const,
    path: "medical.createExamination",
    description: "إنشاء فحص",
    status: "مسجل",
  },
  {
    method: "mutation" as const,
    path: "medical.updateExamination",
    description: "تحديث فحص",
    status: "مسجل",
  },
  {
    method: "query" as const,
    path: "medical.getRuntimeDbInfo",
    description: "معلومات اتصال قاعدة التشغيل",
    status: "للمشرف",
  },
  {
    method: "mutation" as const,
    path: "medical.createPentacamResult",
    description: "إنشاء سجل بنتاكام",
    status: "مسجل",
  },
  {
    method: "query" as const,
    path: "medical.getPentacamResultsByVisit",
    description: "بنتاكام حسب الزيارة",
    status: "مسجل",
  },
  {
    method: "mutation" as const,
    path: "medical.createDoctorReport",
    description: "تقرير طبيب",
    status: "مسجل",
  },
  {
    method: "query" as const,
    path: "medical.getDoctorReportsByVisit",
    description: "تقارير حسب الزيارة",
    status: "مسجل",
  },
  {
    method: "query" as const,
    path: "medical.getMssqlSyncStatus",
    description: "حالة مزامنة MSSQL",
    status: "مسجل",
  },
  {
    method: "query" as const,
    path: "medical.getMssqlSyncRuntimeConfig",
    description: "إعداد تشغيل المزامنة التلقائية",
    status: "مسجل",
  },
  {
    method: "mutation" as const,
    path: "medical.updateMssqlSyncRuntimeConfig",
    description: "حفظ إعداد المزامنة التلقائية",
    status: "مسجل",
  },
  {
    method: "mutation" as const,
    path: "medical.syncPatientsFromMssql",
    description: "مزامنة مرضى من MSSQL",
    status: "مسجل",
  },
  {
    method: "mutation" as const,
    path: "medical.resetMssqlSyncCodes",
    description: "إعادة ضبط رموز المزامنة",
    status: "حساس",
  },
  {
    method: "mutation" as const,
    path: "medical.resetPatientsAutoIncrement",
    description: "AUTO_INCREMENT للمرضى",
    status: "حساس",
  },
] as const;

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(
      value,
      (_, v) => (typeof v === "bigint" ? String(v) : v),
      2,
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
    new Date().toISOString().split("T")[0],
  );
  const [appointmentType, setAppointmentType] = useState<
    "examination" | "surgery" | "followup"
  >("examination");
  const [appointmentBranch, setAppointmentBranch] = useState<
    "examinations" | "surgery"
  >("examinations");

  const [diagnosis, setDiagnosis] = useState("Demo diagnosis");
  const [clinicalOpinion, setClinicalOpinion] = useState("");
  const [recommendedTreatment, setRecommendedTreatment] = useState("");

  const [pentacamLtK1, setPentacamLtK1] = useState("");
  const [syncLimit, setSyncLimit] = useState("500");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [autoSyncIncremental, setAutoSyncIncremental] = useState(true);
  const [autoSyncOverwriteExisting, setAutoSyncOverwriteExisting] =
    useState(false);
  const [autoSyncPreserveManualEdits, setAutoSyncPreserveManualEdits] =
    useState(true);
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
    '{\n  "تلميح": "استخدم الأزرار أدناه لعرض مثال الإدخال ونتيجة tRPC"\n}',
  );
  const [previewResponse, setPreviewResponse] = useState(
    "// لا توجد استجابة بعد",
  );
  const [successAnnouncement, setSuccessAnnouncement] = useState("");
  const [errorAnnouncement, setErrorAnnouncement] = useState("");

  const announceSuccess = (message: string) => {
    setSuccessAnnouncement(message);
    setErrorAnnouncement("");
  };

  const announceError = (message: string) => {
    setErrorAnnouncement(message);
    setSuccessAnnouncement("");
  };

  const announceQueryResult = (label: string, result: { error: unknown }) => {
    if (result.error) {
      const message = getTrpcErrorMessage(result.error, `فشل تحميل ${label}`);
      announceError(message);
      toast.error(message);
      return;
    }
    announceSuccess(`تم تحميل ${label}`);
  };

  const capturePreview = (
    procedure: string,
    input: unknown,
    output: unknown,
  ) => {
    setPreviewRequest(safeStringify({ procedure, input }));
    setPreviewResponse(safeStringify(output));
  };

  const appointmentsQuery = trpc.medical.getAppointments.useQuery(undefined, {
    enabled: false,
    retry: 1,
  });
  const appointmentsByPatientQuery =
    trpc.medical.getAppointmentsByPatient.useQuery(
      { patientId: Number(patientId || 0) },
      { enabled: false, retry: 1 },
    );
  const examinationsQuery = trpc.medical.getAllExaminations.useQuery(
    undefined,
    { enabled: false, retry: 1 },
  );
  const pentacamByVisitQuery = trpc.medical.getPentacamResultsByVisit.useQuery(
    { visitId: Number(visitId || 0) },
    { enabled: false, retry: 1 },
  );
  const doctorReportsByVisitQuery =
    trpc.medical.getDoctorReportsByVisit.useQuery(
      { visitId: Number(visitId || 0) },
      { enabled: false, retry: 1 },
    );
  const mssqlSyncStatusQuery = trpc.medical.getMssqlSyncStatus.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchInterval: 5000,
      retry: 1,
    },
  );
  const mssqlSyncRuntimeQuery = trpc.medical.getMssqlSyncRuntimeConfig.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchInterval: 10000,
      retry: 1,
    },
  );
  const runtimeDbInfoQuery = trpc.medical.getRuntimeDbInfo.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: false,
    retry: 1,
  });

  const createAppointmentMutation = trpc.medical.createAppointment.useMutation({
    onSuccess: () => {
      announceSuccess("تم إنشاء الموعد");
      toast.success("تم إنشاء الموعد");
    },
    onError: (error: unknown) => {
      const message = getTrpcErrorMessage(error, "فشل إنشاء الموعد");
      announceError(message);
      toast.error(message);
    },
  });

  const createExaminationMutation = trpc.medical.createExamination.useMutation({
    onSuccess: () => {
      announceSuccess("تم إنشاء الفحص");
      toast.success("تم إنشاء الفحص");
    },
    onError: (error: unknown) => {
      const message = getTrpcErrorMessage(error, "فشل إنشاء الفحص");
      announceError(message);
      toast.error(message);
    },
  });

  const updateExaminationMutation = trpc.medical.updateExamination.useMutation({
    onSuccess: () => {
      announceSuccess("تم تحديث الفحص");
      toast.success("تم تحديث الفحص");
    },
    onError: (error: unknown) => {
      const message = getTrpcErrorMessage(error, "فشل تحديث الفحص");
      announceError(message);
      toast.error(message);
    },
  });

  const createPentacamMutation = trpc.medical.createPentacamResult.useMutation({
    onSuccess: () => {
      announceSuccess("تم حفظ بنتاكام");
      toast.success("تم حفظ بنتاكام");
    },
    onError: (error: unknown) => {
      const message = getTrpcErrorMessage(error, "فشل حفظ بنتاكام");
      announceError(message);
      toast.error(message);
    },
  });

  const createDoctorReportMutation =
    trpc.medical.createDoctorReport.useMutation({
      onSuccess: () => {
        announceSuccess("تم حفظ تقرير الطبيب");
        toast.success("تم حفظ تقرير الطبيب");
      },
      onError: (error: unknown) => {
        const message = getTrpcErrorMessage(error, "فشل حفظ التقرير");
        announceError(message);
        toast.error(message);
      },
    });

  const resetMssqlSyncCodesMutation =
    trpc.medical.resetMssqlSyncCodes.useMutation({
      onSuccess: (result) => {
        capturePreview("medical.resetMssqlSyncCodes", {}, result);
        const message = `تمت إعادة ضبط ${result.affected} مريض؛ شغّل المزامنة الكاملة الآن`;
        announceSuccess(message);
        toast.success(message);
      },
      onError: (error: unknown) => {
        const message = getTrpcErrorMessage(
          error,
          "فشل إعادة ضبط رموز المزامنة",
        );
        announceError(message);
        toast.error(message);
      },
    });

  const [autoIncrementValue, setAutoIncrementValue] = useState("1128");
  const resetAutoIncrementMutation =
    trpc.medical.resetPatientsAutoIncrement.useMutation({
      onSuccess: (result, variables) => {
        capturePreview("medical.resetPatientsAutoIncrement", variables, result);
        const message = `تم ضبط AUTO_INCREMENT على ${result.value}`;
        announceSuccess(message);
        toast.success(message);
      },
      onError: (error: unknown) => {
        const message = getTrpcErrorMessage(
          error,
          "فشل إعادة ضبط AUTO_INCREMENT",
        );
        announceError(message);
        toast.error(message);
      },
    });

  const syncMssqlPatientsMutation =
    trpc.medical.syncPatientsFromMssql.useMutation({
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
        announceSuccess("اكتملت مزامنة مرضى MSSQL");
        toast.success("اكتملت مزامنة مرضى MSSQL");
      },
      onError: (error: unknown) => {
        const message = getTrpcErrorMessage(error, "فشلت مزامنة MSSQL");
        announceError(message);
        toast.error(message);
      },
    });
  const updateMssqlSyncRuntimeMutation =
    trpc.medical.updateMssqlSyncRuntimeConfig.useMutation({
      onSuccess: async (result, variables) => {
        capturePreview(
          "medical.updateMssqlSyncRuntimeConfig",
          variables,
          result ?? { ok: true },
        );
        announceSuccess("تم حفظ إعداد المزامنة التلقائية");
        toast.success("تم حفظ إعداد المزامنة التلقائية");
        await mssqlSyncRuntimeQuery.refetch();
      },
      onError: (error: unknown) => {
        const message = getTrpcErrorMessage(
          error,
          "فشل حفظ إعداد المزامنة التلقائية",
        );
        announceError(message);
        toast.error(message);
      },
    });

  useEffect(() => {
    const cfg = mssqlSyncRuntimeQuery.data;
    if (!cfg) return;
    setAutoSyncEnabled(Boolean(cfg.enabled));
    setAutoSyncIncremental(Boolean(cfg.incremental));
    setAutoSyncOverwriteExisting(Boolean((cfg as any).overwriteExisting));
    setAutoSyncPreserveManualEdits(
      Boolean((cfg as any).preserveManualEdits ?? true),
    );
    setAutoSyncLinkServices(
      Boolean((cfg as any).linkServicesForExisting ?? true),
    );
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
    <div
      dir="rtl"
      className="admin-detail mx-auto w-full max-w-[1440px] space-y-6 pb-2"
    >
      <PageHeader
        title="أدوات API"
        subtitle="أدوات tRPC للمشرفين: استدعاءات مباشرة، مزامنة MSSQL، وتشخيص قاعدة البيانات — الواجهة العامة للتطبيق تستخدم نفس المسار عبر /trpc"
        icon={<Plug className="h-5 w-5" />}
      />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {successAnnouncement}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {errorAnnouncement}
      </div>

      <Card className="rounded-lg border-border/80 bg-card shadow-none">
        <CardHeader>
          <CardTitle className="text-base">معاينة الطلب والاستجابة</CardTitle>
          <p className="text-sm text-muted-foreground">
            تُحدَّث تلقائياً عند تنفيذ الأزرار في الصفحة (آخر عملية منفذة أو
            بيانات جلب).
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

      <Card className="rounded-lg border-border/80 bg-card shadow-none">
        <CardHeader className="flex flex-col gap-1 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            مرجع إجراءات tRPC (هذه الصفحة)
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            هذا المرجع يوضح الإجراءات المتاحة؛ زمن الاستجابة يُفحص من أدوات
            المتصفح أو الشبكة
          </span>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-start font-bold">
                    الطريقة
                  </TableHead>
                  <TableHead className="min-w-[220px] text-start font-bold">
                    المسار
                  </TableHead>
                  <TableHead className="text-start font-bold">الوصف</TableHead>
                  <TableHead className="text-center font-bold">
                    التسجيل
                  </TableHead>
                  <TableHead className="text-center font-bold w-28">
                    زمن الاستجابة
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRPC_API_REFERENCE.map((row) => (
                  <TableRow key={row.path}>
                    <TableCell>
                      <Badge
                        variant={
                          row.method === "query" ? "secondary" : "default"
                        }
                        className={
                          row.method === "query"
                            ? "bg-success/15 text-success"
                            : "bg-primary text-primary-foreground"
                        }
                      >
                        {row.method === "query" ? "query" : "mutation"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all dir-ltr text-start">
                      {row.path}
                    </TableCell>
                    <TableCell className="text-sm">{row.description}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[13px]">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      —
                    </TableCell>
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
          <div className="space-y-2">
            <label htmlFor="admin-patient-id" className="text-sm font-medium">
              معرّف المريض
            </label>
            <Input
              id="admin-patient-id"
              className="min-h-11"
              inputMode="numeric"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="مثال: 123"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="admin-visit-id" className="text-sm font-medium">
              معرّف الزيارة
            </label>
            <Input
              id="admin-visit-id"
              className="min-h-11"
              inputMode="numeric"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              placeholder="مثال: 456"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="admin-examination-id"
              className="text-sm font-medium"
            >
              معرّف الفحص
            </label>
            <Input
              id="admin-examination-id"
              className="min-h-11"
              inputMode="numeric"
              value={examinationId}
              onChange={(e) => setExaminationId(e.target.value)}
              placeholder="مثال: 789"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>المواعيد (Appointments)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="appointment-date" className="text-sm font-medium">
                تاريخ الموعد
              </label>
              <DateInput
                id="appointment-date"
                className="min-h-11"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
            <Select
              value={appointmentType}
              onValueChange={(v) => setAppointmentType(v as any)}
            >
              <SelectTrigger className="min-h-11" aria-label="نوع الموعد">
                <SelectValue placeholder="نوع الموعد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="examination">فحص</SelectItem>
                <SelectItem value="surgery">عملية</SelectItem>
                <SelectItem value="followup">متابعة</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={appointmentBranch}
              onValueChange={(v) => setAppointmentBranch(v as any)}
            >
              <SelectTrigger className="min-h-11" aria-label="فرع الموعد">
                <SelectValue placeholder="الفرع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="examinations">فحوصات</SelectItem>
                <SelectItem value="surgery">عمليات</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 [&>button]:min-h-11">
            <Button
              className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
              disabled={
                createAppointmentMutation.isPending || patientIdNum <= 0
              }
              onClick={async () => {
                const input = {
                  patientId: patientIdNum,
                  appointmentDate,
                  appointmentType,
                  branch: appointmentBranch,
                };
                try {
                  const out =
                    await createAppointmentMutation.mutateAsync(input);
                  capturePreview("medical.createAppointment", input, out);
                } catch (error: unknown) {
                  capturePreview("medical.createAppointment", input, {
                    error: getTrpcErrorMessage(error, "فشل"),
                  });
                }
              }}
            >
              {createAppointmentMutation.isPending
                ? "جارٍ إنشاء الموعد…"
                : "إنشاء موعد"}
            </Button>
            <Button
              variant="outline"
              disabled={appointmentsQuery.isFetching}
              onClick={async () => {
                const r = await appointmentsQuery.refetch();
                announceQueryResult("جميع المواعيد", r);
                capturePreview(
                  "medical.getAppointments",
                  {},
                  r.error
                    ? { error: getTrpcErrorMessage(r.error, "فشل") }
                    : r.data,
                );
              }}
            >
              {appointmentsQuery.isFetching
                ? "جارٍ تحميل المواعيد…"
                : "جميع المواعيد"}
            </Button>
            <Button
              variant="outline"
              disabled={
                appointmentsByPatientQuery.isFetching || patientIdNum <= 0
              }
              onClick={async () => {
                const input = { patientId: patientIdNum };
                const r = await appointmentsByPatientQuery.refetch();
                announceQueryResult("مواعيد المريض", r);
                capturePreview(
                  "medical.getAppointmentsByPatient",
                  input,
                  r.error
                    ? { error: getTrpcErrorMessage(r.error, "فشل") }
                    : r.data,
                );
              }}
            >
              {appointmentsByPatientQuery.isFetching
                ? "جارٍ تحميل مواعيد المريض…"
                : "مواعيد المريض"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            عدد (جميع المواعيد):{" "}
            {appointmentsQuery.isError
              ? "تعذر التحميل؛ أعد المحاولة."
              : appointmentsQuery.isFetching
                ? "جارٍ التحميل…"
                : appointmentsQuery.data
                  ? appointmentsQuery.data.length
                  : "لم تُحمّل بعد"}{" "}
            | عدد (مواعيد المريض):{" "}
            {appointmentsByPatientQuery.isError
              ? "تعذر التحميل؛ أعد المحاولة."
              : appointmentsByPatientQuery.isFetching
                ? "جارٍ التحميل…"
                : appointmentsByPatientQuery.data
                  ? appointmentsByPatientQuery.data.length
                  : "لم تُحمّل بعد"}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>الفحوصات (Examinations)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 [&>button]:min-h-11">
            <Button
              className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
              disabled={
                createExaminationMutation.isPending ||
                visitIdNum <= 0 ||
                patientIdNum <= 0
              }
              onClick={async () => {
                const input = {
                  visitId: visitIdNum,
                  patientId: patientIdNum,
                  ucvaOD: "6/6",
                };
                try {
                  const out =
                    await createExaminationMutation.mutateAsync(input);
                  capturePreview("medical.createExamination", input, out);
                } catch (error: unknown) {
                  capturePreview("medical.createExamination", input, {
                    error: getTrpcErrorMessage(error, "فشل"),
                  });
                }
              }}
            >
              {createExaminationMutation.isPending
                ? "جارٍ إنشاء الفحص…"
                : "إنشاء فحص"}
            </Button>
            <Button
              variant="outline"
              disabled={updateExaminationMutation.isPending || examIdNum <= 0}
              onClick={async () => {
                const input = {
                  examinationId: examIdNum,
                  updates: { findings: "Updated findings" },
                };
                try {
                  const out =
                    await updateExaminationMutation.mutateAsync(input);
                  capturePreview("medical.updateExamination", input, out);
                } catch (error: unknown) {
                  capturePreview("medical.updateExamination", input, {
                    error: getTrpcErrorMessage(error, "فشل"),
                  });
                }
              }}
            >
              {updateExaminationMutation.isPending
                ? "جارٍ تحديث الفحص…"
                : "تحديث فحص"}
            </Button>
            <Button
              variant="outline"
              disabled={examinationsQuery.isFetching}
              onClick={async () => {
                const r = await examinationsQuery.refetch();
                announceQueryResult("جميع الفحوصات", r);
                capturePreview(
                  "medical.getAllExaminations",
                  {},
                  r.error
                    ? { error: getTrpcErrorMessage(r.error, "فشل") }
                    : r.data,
                );
              }}
            >
              {examinationsQuery.isFetching
                ? "جارٍ تحميل الفحوصات…"
                : "جميع الفحوصات"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            عدد السجلات المعروضة:{" "}
            {examinationsQuery.isError
              ? "تعذر تحميل الفحوصات؛ أعد المحاولة."
              : examinationsQuery.isFetching
                ? "جارٍ تحميل الفحوصات…"
                : examinationsQuery.data
                  ? examinationsQuery.data.length
                  : "لم تُحمّل بعد"}
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
            className="min-h-11"
            disabled={runtimeDbInfoQuery.isFetching}
            onClick={async () => {
              const r = await runtimeDbInfoQuery.refetch();
              announceQueryResult("معلومات قاعدة التشغيل", r);
              capturePreview(
                "medical.getRuntimeDbInfo",
                {},
                r.error
                  ? { error: getTrpcErrorMessage(r.error, "فشل") }
                  : r.data,
              );
            }}
          >
            {runtimeDbInfoQuery.isFetching
              ? "جارٍ فحص قاعدة التشغيل…"
              : "فحص قاعدة التشغيل النشطة"}
          </Button>
          <div
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {runtimeDbInfoQuery.isFetching
              ? "جارٍ فحص قاعدة التشغيل…"
              : runtimeDbInfoQuery.isError
                ? "تعذر فحص قاعدة التشغيل؛ أعد المحاولة."
                : runtimeDbInfoQuery.data
                  ? `Host: ${runtimeDbInfoQuery.data.host ?? "-"} | Port: ${runtimeDbInfoQuery.data.port ?? "-"} | DB: ${runtimeDbInfoQuery.data.database ?? "-"} | URL: ${runtimeDbInfoQuery.data.maskedUrl ?? "-"}`
                  : "لم تُحمّل معلومات قاعدة التشغيل بعد"}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>البنتاكام (Pentacam)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="pentacam-ltk1" className="text-sm font-medium">
              قيمة ltK1 للعين اليسرى
            </label>
            <Input
              id="pentacam-ltk1"
              className="min-h-11"
              value={pentacamLtK1}
              onChange={(e) => setPentacamLtK1(e.target.value)}
              placeholder="اختياري"
            />
          </div>
          <div className="flex flex-wrap gap-2 [&>button]:min-h-11">
            <Button
              className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
              disabled={
                createPentacamMutation.isPending ||
                visitIdNum <= 0 ||
                patientIdNum <= 0
              }
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
              {createPentacamMutation.isPending
                ? "جارٍ إنشاء بنتاكام…"
                : "إنشاء بنتاكام"}
            </Button>
            <Button
              variant="outline"
              disabled={pentacamByVisitQuery.isFetching || visitIdNum <= 0}
              onClick={async () => {
                const input = { visitId: visitIdNum };
                const r = await pentacamByVisitQuery.refetch();
                announceQueryResult("نتائج بنتاكام", r);
                capturePreview(
                  "medical.getPentacamResultsByVisit",
                  input,
                  r.error
                    ? { error: getTrpcErrorMessage(r.error, "فشل") }
                    : r.data,
                );
              }}
            >
              {pentacamByVisitQuery.isFetching
                ? "جارٍ تحميل نتائج بنتاكام…"
                : "بنتاكام حسب الزيارة"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            عدد السجلات:{" "}
            {pentacamByVisitQuery.isError
              ? "تعذر تحميل النتائج؛ أعد المحاولة."
              : pentacamByVisitQuery.isFetching
                ? "جارٍ تحميل النتائج…"
                : pentacamByVisitQuery.data
                  ? pentacamByVisitQuery.data.length
                  : "لم تُحمّل بعد"}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>تقارير الطبيب (Doctor Reports)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="doctor-diagnosis" className="text-sm font-medium">
                التشخيص
              </label>
              <Input
                id="doctor-diagnosis"
                className="min-h-11"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="أدخل التشخيص"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="doctor-opinion" className="text-sm font-medium">
                الرأي الطبي
              </label>
              <Input
                id="doctor-opinion"
                className="min-h-11"
                value={clinicalOpinion}
                onChange={(e) => setClinicalOpinion(e.target.value)}
                placeholder="اختياري"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="doctor-treatment" className="text-sm font-medium">
                العلاج المقترح
              </label>
              <Input
                id="doctor-treatment"
                className="min-h-11"
                value={recommendedTreatment}
                onChange={(e) => setRecommendedTreatment(e.target.value)}
                placeholder="اختياري"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 [&>button]:min-h-11">
            <Button
              className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
              disabled={
                createDoctorReportMutation.isPending ||
                visitIdNum <= 0 ||
                patientIdNum <= 0
              }
              onClick={async () => {
                const input = {
                  visitId: visitIdNum,
                  patientId: patientIdNum,
                  diagnosis,
                  clinicalOpinion,
                  recommendedTreatment,
                };
                try {
                  const out =
                    await createDoctorReportMutation.mutateAsync(input);
                  capturePreview("medical.createDoctorReport", input, out);
                } catch (error: unknown) {
                  capturePreview("medical.createDoctorReport", input, {
                    error: getTrpcErrorMessage(error, "فشل"),
                  });
                }
              }}
            >
              {createDoctorReportMutation.isPending
                ? "جارٍ إنشاء التقرير…"
                : "إنشاء تقرير طبيب"}
            </Button>
            <Button
              variant="outline"
              disabled={doctorReportsByVisitQuery.isFetching || visitIdNum <= 0}
              onClick={async () => {
                const input = { visitId: visitIdNum };
                const r = await doctorReportsByVisitQuery.refetch();
                announceQueryResult("تقارير الطبيب", r);
                capturePreview(
                  "medical.getDoctorReportsByVisit",
                  input,
                  r.error
                    ? { error: getTrpcErrorMessage(r.error, "فشل") }
                    : r.data,
                );
              }}
            >
              {doctorReportsByVisitQuery.isFetching
                ? "جارٍ تحميل التقارير…"
                : "تقارير حسب الزيارة"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            عدد التقارير:{" "}
            {doctorReportsByVisitQuery.isError
              ? "تعذر تحميل التقارير؛ أعد المحاولة."
              : doctorReportsByVisitQuery.isFetching
                ? "جارٍ تحميل التقارير…"
                : doctorReportsByVisitQuery.data
                  ? doctorReportsByVisitQuery.data.length
                  : "لم تُحمّل بعد"}
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>مزامنة مرضى MSSQL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="sync-limit" className="text-sm font-medium">
                حد المزامنة
              </label>
              <Input
                id="sync-limit"
                className="min-h-11"
                inputMode="numeric"
                value={syncLimit}
                onChange={(e) => setSyncLimit(e.target.value)}
                placeholder="مثال: 500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="sync-interval" className="text-sm font-medium">
                فاصل المزامنة بالمللي ثانية
              </label>
              <Input
                id="sync-interval"
                className="min-h-11"
                inputMode="numeric"
                value={autoSyncIntervalMs}
                onChange={(e) => setAutoSyncIntervalMs(e.target.value)}
                placeholder="الحد الأدنى 5000"
              />
            </div>
            <Select
              value={autoSyncEnabled ? "on" : "off"}
              onValueChange={(v) => setAutoSyncEnabled(v === "on")}
            >
              <SelectTrigger
                className="min-h-11"
                aria-label="حالة المزامنة التلقائية"
              >
                <SelectValue placeholder="المزامنة التلقائية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">المزامنة التلقائية: مفعلة</SelectItem>
                <SelectItem value="off">المزامنة التلقائية: متوقفة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={autoSyncIncremental ? "incremental" : "full"}
              onValueChange={(v) => setAutoSyncIncremental(v === "incremental")}
            >
              <SelectTrigger
                className="min-h-11"
                aria-label="وضع المزامنة التلقائية"
              >
                <SelectValue placeholder="وضع المزامنة التلقائية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incremental">تدريجية</SelectItem>
                <SelectItem value="full">كاملة</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={updateMssqlSyncRuntimeMutation.isPending}
              onClick={() => {
                if (autoSyncOverwriteExisting) {
                  const ok = window.confirm(
                    "تحذير: قد يحدّث وضع الاستبدال سجلات المرضى الحالية من مزامنة MSSQL.\nلا تفعّله إلا إذا كنت متأكداً. هل تريد المتابعة؟",
                  );
                  if (!ok) return;
                }
                updateMssqlSyncRuntimeMutation.mutate({
                  enabled: autoSyncEnabled,
                  incremental: autoSyncIncremental,
                  intervalMs: Math.max(
                    5000,
                    Number(autoSyncIntervalMs || 30000) || 30000,
                  ),
                  limit: Math.max(
                    1,
                    Math.min(20000, Number(syncLimit || 500) || 500),
                  ),
                  overwriteExisting: autoSyncOverwriteExisting,
                  preserveManualEdits: autoSyncPreserveManualEdits,
                  linkServicesForExisting: autoSyncLinkServices,
                });
              }}
            >
              {updateMssqlSyncRuntimeMutation.isPending
                ? "جارٍ حفظ الإعداد…"
                : "حفظ إعداد المزامنة التلقائية"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={autoSyncOverwriteExisting ? "on" : "off"}
              onValueChange={(v) => setAutoSyncOverwriteExisting(v === "on")}
            >
              <SelectTrigger
                className="min-h-11"
                aria-label="استبدال السجلات الحالية"
              >
                <SelectValue placeholder="استبدال السجلات الحالية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">
                  استبدال السجلات الحالية: متوقف (آمن)
                </SelectItem>
                <SelectItem value="on">
                  استبدال السجلات الحالية: مفعّل (خطر)
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={autoSyncPreserveManualEdits ? "on" : "off"}
              onValueChange={(v) => setAutoSyncPreserveManualEdits(v === "on")}
            >
              <SelectTrigger
                className="min-h-11"
                aria-label="الحفاظ على التعديلات اليدوية"
              >
                <SelectValue placeholder="الحفاظ على التعديلات اليدوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">
                  الحفاظ على التعديلات اليدوية: مفعّل (موصى به)
                </SelectItem>
                <SelectItem value="off">
                  الحفاظ على التعديلات اليدوية: متوقف
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={autoSyncLinkServices ? "on" : "off"}
              onValueChange={(v) => setAutoSyncLinkServices(v === "on")}
            >
              <SelectTrigger
                className="min-h-11"
                aria-label="ربط الخدمات بالسجلات الحالية"
              >
                <SelectValue placeholder="ربط الخدمات بالسجلات الحالية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">ربط الخدمات: مفعّل</SelectItem>
                <SelectItem value="off">ربط الخدمات: متوقف</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {mssqlSyncStatusQuery.isFetching && !mssqlSyncStatusQuery.data
              ? "جارٍ تحميل حالة المزامنة…"
              : mssqlSyncStatusQuery.isError
                ? "تعذر تحميل حالة المزامنة؛ أعد المحاولة."
                : mssqlSyncStatusQuery.data
                  ? `الحالة: ${(mssqlSyncStatusQuery.data as any).running ? "قيد التشغيل" : "متوقفة"} | آخر مزامنة: ${mssqlSyncStatusQuery.data.lastSuccessAt ? new Date(mssqlSyncStatusQuery.data.lastSuccessAt).toLocaleString("ar-EG") : "لم تتم"} | آخر وضع: ${mssqlSyncStatusQuery.data.lastMode ?? "-"} | العلامة: ${mssqlSyncStatusQuery.data.lastMarker ?? "-"} | آخر تغييرات: ${String((mssqlSyncStatusQuery.data as any).lastChangeCount ?? "-")} | التشغيل التالي: ${(mssqlSyncStatusQuery.data as any).nextRunAt ? new Date((mssqlSyncStatusQuery.data as any).nextRunAt).toLocaleString("ar-EG") : "-"}${(mssqlSyncStatusQuery.data as any).lastError ? ` | آخر خطأ: ${String((mssqlSyncStatusQuery.data as any).lastError)}` : ""}`
                  : mssqlSyncRuntimeQuery.isError
                    ? "تعذر تحميل إعداد المزامنة التلقائية؛ أعد المحاولة."
                    : "لم تُحمّل حالة المزامنة بعد"}
          </div>
          <div className="flex flex-wrap gap-2 [&>button]:min-h-11">
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
              {syncMssqlPatientsMutation.isPending
                ? "جارٍ تنفيذ التجربة…"
                : "تجربة مزامنة MSSQL"}
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
              {syncMssqlPatientsMutation.isPending
                ? "جارٍ تشغيل المزامنة…"
                : "تشغيل المزامنة التدريجية"}
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
              {syncMssqlPatientsMutation.isPending
                ? "جارٍ تشغيل المزامنة…"
                : "تشغيل مزامنة MSSQL"}
            </Button>
            <Button
              variant="destructive"
              disabled={
                resetMssqlSyncCodesMutation.isPending ||
                syncMssqlPatientsMutation.isPending
              }
              onClick={() => resetMssqlSyncCodesMutation.mutate()}
            >
              {resetMssqlSyncCodesMutation.isPending
                ? "جارٍ إعادة الضبط…"
                : "إعادة ضبط رموز المزامنة"}
            </Button>
          </div>
          <div
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {syncMssqlPatientsMutation.isPending
              ? "المزامنة قيد التشغيل…"
              : lastSyncResult
                ? `تم الجلب: ${lastSyncResult.fetched} | أُضيف: ${lastSyncResult.inserted} | حُدّث: ${lastSyncResult.updated} | تم التخطي: ${lastSyncResult.skipped} | الوضع: ${lastSyncResult.dryRun ? "تجربة" : "فعلي"}`
                : "لا توجد نتيجة مزامنة بعد"}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>AUTO_INCREMENT — جدول المرضى</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end [&>button]:min-h-11">
            <div className="space-y-2">
              <label
                htmlFor="auto-increment-value"
                className="text-sm font-medium"
              >
                القيمة الجديدة للعداد
              </label>
              <Input
                id="auto-increment-value"
                value={autoIncrementValue}
                onChange={(e) => setAutoIncrementValue(e.target.value)}
                placeholder="مثال: 1128"
                className="min-h-11 w-full sm:w-40"
                inputMode="numeric"
              />
            </div>
            <Button
              variant="destructive"
              disabled={resetAutoIncrementMutation.isPending}
              onClick={() => {
                const val = Number(autoIncrementValue);
                if (!val || val < 1) return toast.error("أدخل رقماً صحيحاً");
                if (!window.confirm(`ضبط AUTO_INCREMENT للمرضى على ${val}؟`))
                  return;
                resetAutoIncrementMutation.mutate({ value: val });
              }}
            >
              {resetAutoIncrementMutation.isPending
                ? "جارٍ الضبط…"
                : "ضبط AUTO_INCREMENT"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
