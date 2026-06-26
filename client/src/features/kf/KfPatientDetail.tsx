import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { localISODate } from "@/lib/utils";
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
  Layers,
  Trash2,
  Loader2,
  ScrollText,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { DateInput } from "@/components/ui/date-input";

const KF_DOCTORS = ["د. محمد السعدني", "د. سعيد مجدي"] as const;

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

function ConsultationSheet({ patient }: { patient: any }) {
  const today = new Date().toLocaleDateString("ar-EG");
  const cell: React.CSSProperties = { border: "1px solid #000", padding: "5px 8px", fontSize: "12px" };
  const line: React.CSSProperties = { borderBottom: "1px solid #999", marginTop: 16, marginBottom: 8 };
  const line2: React.CSSProperties = { borderBottom: "1px solid #999", marginBottom: 4 };
  return (
    <div dir="rtl" style={{ fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#000", padding: "24px" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: "bold" }}>مركز ساعدني لجراحة وتقويم الإبصار</div>
        <div style={{ fontSize: 14 }}>وحدة كفرالشيخ الطبية</div>
        <div style={{ fontSize: 14, fontWeight: "bold" }}>ورقة كشف / استشارة</div>
      </div>
      <div style={{ textAlign: "left", marginBottom: 8, fontSize: 12 }}>
        <strong>التاريخ:</strong> {today}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: "50%" }}><strong>كود المريض:</strong> {patient.kfCode}</td>
            <td style={cell}><strong>اسم المريض:</strong> {patient.fullName}</td>
          </tr>
          <tr>
            <td style={cell}><strong>السن:</strong> {patient.age ? `${patient.age} سنة` : "—"}</td>
            <td style={cell}><strong>الجنس:</strong> {patient.gender === "male" ? "ذكر" : patient.gender === "female" ? "أنثى" : "—"}</td>
          </tr>
          <tr>
            <td style={cell}><strong>الهاتف:</strong> {patient.phone || "—"}</td>
            <td style={cell}><strong>الرقم القومي:</strong> {patient.nationalId || "—"}</td>
          </tr>
          <tr>
            <td style={cell}><strong>المهنة:</strong> {patient.occupation || "—"}</td>
            <td style={cell}><strong>العنوان:</strong> {patient.address || "—"}</td>
          </tr>
          <tr>
            <td style={{ ...cell, fontSize: 12 }} colSpan={2}><strong>التاريخ المرضي:</strong> {patient.medicalHistory || "—"}</td>
          </tr>
          <tr>
            <td style={{ ...cell, fontSize: 12 }} colSpan={2}><strong>الحساسية:</strong> {patient.allergies || "—"}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ border: "2px solid #000", marginBottom: 8 }}>
        <div style={{ background: "#f0f0f0", padding: "4px 8px", fontWeight: "bold", textAlign: "center", borderBottom: "1px solid #000", fontSize: 12 }}>بيانات الكشف الطبي</div>
        <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontSize: 12 }}>
          <strong>الشكوى الرئيسية:</strong>
          <div style={line} /><div style={line2} />
        </div>
        <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontSize: 12 }}>
          <table style={{ width: "100%" }}><tbody>
            <tr>
              <td><strong>حدة الإبصار (VA):</strong></td>
              <td>يمين: <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 70 }}>&nbsp;</span></td>
              <td>يسار: <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 70 }}>&nbsp;</span></td>
            </tr>
            <tr>
              <td><strong>ضغط العين (IOP):</strong></td>
              <td>يمين: <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 70 }}>&nbsp;</span></td>
              <td>يسار: <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 70 }}>&nbsp;</span></td>
            </tr>
          </tbody></table>
        </div>
        <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontSize: 12 }}>
          <strong>التشخيص:</strong>
          <div style={line} /><div style={line2} />
        </div>
        <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontSize: 12 }}>
          <strong>العلاج / الروشتة:</strong>
          <div style={line} /><div style={{ ...line2, marginBottom: 8 }} /><div style={line2} />
        </div>
        <div style={{ padding: 8, fontSize: 12 }}>
          <table style={{ width: "100%" }}><tbody>
            <tr>
              <td>الطبيب المعالج: <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 120 }}>&nbsp;</span></td>
              <td style={{ textAlign: "left" }}>التوقيع: <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 100 }}>&nbsp;</span></td>
            </tr>
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

function FollowupSheet({ patient, operations, followups }: { patient: any; operations: any[]; followups: any[] }) {
  const lastOp = operations.find((op: any) => op.status === "completed") ?? operations[0];
  const nextFollowup = followups.find((f: any) => f.status === "scheduled");
  const sheetDate = nextFollowup
    ? new Date(nextFollowup.followupDate).toLocaleDateString("ar-EG")
    : new Date().toLocaleDateString("ar-EG");
  const cell: React.CSSProperties = { border: "1px solid #000", padding: "5px 8px", fontSize: "12px" };
  const line: React.CSSProperties = { borderBottom: "1px solid #999", marginTop: 16, marginBottom: 8 };
  const line2: React.CSSProperties = { borderBottom: "1px solid #999", marginBottom: 4 };
  return (
    <div dir="rtl" style={{ fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#000", padding: "24px" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: "bold" }}>مركز ساعدني لجراحة وتقويم الإبصار</div>
        <div style={{ fontSize: 14 }}>وحدة كفرالشيخ الطبية</div>
        <div style={{ fontSize: 14, fontWeight: "bold" }}>ورقة متابعة مريض</div>
      </div>
      <div style={{ textAlign: "left", marginBottom: 8, fontSize: 12 }}>
        <strong>تاريخ المتابعة:</strong> {sheetDate}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: "50%" }}><strong>كود المريض:</strong> {patient.kfCode}</td>
            <td style={cell}><strong>اسم المريض:</strong> {patient.fullName}</td>
          </tr>
          <tr>
            <td style={cell}><strong>السن:</strong> {patient.age ? `${patient.age} سنة` : "—"}</td>
            <td style={cell}><strong>الجنس:</strong> {patient.gender === "male" ? "ذكر" : patient.gender === "female" ? "أنثى" : "—"}</td>
          </tr>
          <tr>
            <td style={cell} colSpan={2}><strong>الهاتف:</strong> {patient.phone || "—"}</td>
          </tr>
          {lastOp && (
            <tr>
              <td style={cell} colSpan={2}>
                <strong>آخر عملية:</strong> {lastOp.opType} — {new Date(lastOp.opDate).toLocaleDateString("ar-EG")}
                {" "}({lastOp.eye === "both" ? "العينين" : lastOp.eye === "right" ? "العين اليمنى" : "العين اليسرى"})
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ border: "2px solid #000", marginBottom: 8 }}>
        <div style={{ background: "#f0f0f0", padding: "4px 8px", fontWeight: "bold", textAlign: "center", borderBottom: "1px solid #000", fontSize: 12 }}>بيانات المتابعة</div>
        <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontSize: 12 }}>
          <strong>الحالة الحالية للمريض:</strong>
          <div style={line} /><div style={line2} />
        </div>
        <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontSize: 12 }}>
          <strong>ملاحظات المتابعة:</strong>
          <div style={line} /><div style={{ ...line2, marginBottom: 8 }} /><div style={line2} />
        </div>
        <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontSize: 12 }}>
          <strong>موعد المتابعة القادم:</strong>{" "}
          <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 150 }}>&nbsp;</span>
        </div>
        <div style={{ padding: 8, fontSize: 12 }}>
          <table style={{ width: "100%" }}><tbody>
            <tr>
              <td>الطبيب المعالج: <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 120 }}>&nbsp;</span></td>
              <td style={{ textAlign: "left" }}>التوقيع: <span style={{ display: "inline-block", borderBottom: "1px solid #999", minWidth: 100 }}>&nbsp;</span></td>
            </tr>
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

export default function KfPatientDetail() {
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "accountant";
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  // Active Tab state
  const [activeTab, setActiveTab] = useState("visits");

  // Selected Exam for details dialog
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  // Delete confirm states per tab
  const [delVisit, setDelVisit] = useState<number | null>(null);
  const [delExam, setDelExam] = useState<number | null>(null);
  const [delOp, setDelOp] = useState<number | null>(null);
  const [delFollowup, setDelFollowup] = useState<number | null>(null);

  // Edit states per tab
  const [editVisit, setEditVisit] = useState<any | null>(null);
  const [editExam, setEditExam] = useState<any | null>(null);
  const [editOp, setEditOp] = useState<any | null>(null);
  const [editFollowup, setEditFollowup] = useState<any | null>(null);

  // Add dialog states
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [addVisitForm, setAddVisitForm] = useState<any>({});
  const [addExamOpen, setAddExamOpen] = useState(false);
  const [addExamForm, setAddExamForm] = useState<any>({});
  const [addOpOpen, setAddOpOpen] = useState(false);
  const [addOpForm, setAddOpForm] = useState<any>({});
  const [addFollowupOpen, setAddFollowupOpen] = useState(false);
  const [addFollowupForm, setAddFollowupForm] = useState<any>({});

  // Queries
  const { data: patient, isLoading: loadingPatient, isError } = trpc.kf.getPatient.useQuery(
    { kfId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );
  const { data: visits = [], isLoading: loadingVisits } = trpc.kf.listVisits.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const { data: examinations = [], isLoading: loadingExams, isError: isExamsError, error: examsError } = trpc.kf.listExaminations.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );
  const isExamsForbidden = isExamsError && examsError instanceof TRPCClientError && examsError.data?.code === "FORBIDDEN";

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

  const utils = trpc.useUtils();
  const deleteVisitMut = trpc.kf.deleteVisit.useMutation({
    onSuccess: () => { utils.kf.listVisits.invalidate(); toast.success("تم حذف الزيارة"); setDelVisit(null); },
    onError: () => toast.error("تعذر حذف الزيارة"),
  });
  const deleteExamMut = trpc.kf.deleteExamination.useMutation({
    onSuccess: () => { utils.kf.listExaminations.invalidate(); toast.success("تم حذف الفحص"); setDelExam(null); },
    onError: () => toast.error("تعذر حذف الفحص"),
  });
  const deleteOpMut = trpc.kf.deleteOperation.useMutation({
    onSuccess: () => { utils.kf.listOperations.invalidate(); toast.success("تم حذف العملية"); setDelOp(null); },
    onError: () => toast.error("تعذر حذف العملية"),
  });
  const deleteFollowupMut = trpc.kf.deleteFollowup.useMutation({
    onSuccess: () => { utils.kf.listFollowups.invalidate(); toast.success("تم حذف المتابعة"); setDelFollowup(null); },
    onError: () => toast.error("تعذر حذف المتابعة"),
  });

  const updateVisitMut = trpc.kf.updateVisit.useMutation({
    onSuccess: () => { utils.kf.listVisits.invalidate(); toast.success("تم تعديل الزيارة"); setEditVisit(null); },
    onError: () => toast.error("تعذر تعديل الزيارة"),
  });
  const updateExamMut = trpc.kf.updateExamination.useMutation({
    onSuccess: () => { utils.kf.listExaminations.invalidate(); toast.success("تم تعديل الفحص"); setEditExam(null); },
    onError: () => toast.error("تعذر تعديل الفحص"),
  });
  const updateOpMut = trpc.kf.updateOperation.useMutation({
    onSuccess: () => { utils.kf.listOperations.invalidate(); toast.success("تم تعديل العملية"); setEditOp(null); },
    onError: () => toast.error("تعذر تعديل العملية"),
  });
  const updateFollowupMut = trpc.kf.updateFollowup.useMutation({
    onSuccess: () => { utils.kf.listFollowups.invalidate(); toast.success("تم تعديل المتابعة"); setEditFollowup(null); },
    onError: () => toast.error("تعذر تعديل المتابعة"),
  });

  const createVisitMut = trpc.kf.createVisit.useMutation({
    onSuccess: () => { utils.kf.listVisits.invalidate(); toast.success("تم تسجيل الزيارة"); setAddVisitOpen(false); },
    onError: () => toast.error("تعذر حفظ الزيارة"),
  });
  const createExamMut = trpc.kf.createExamination.useMutation({
    onSuccess: () => { utils.kf.listExaminations.invalidate(); toast.success("تم حفظ الفحص الطبي"); setAddExamOpen(false); },
    onError: () => toast.error("تعذر حفظ الفحص"),
  });
  const createOpMut = trpc.kf.createOperation.useMutation({
    onSuccess: () => { utils.kf.listOperations.invalidate(); toast.success("تم حجز العملية"); setAddOpOpen(false); },
    onError: () => toast.error("تعذر حفظ العملية"),
  });
  const createFollowupMut = trpc.kf.createFollowup.useMutation({
    onSuccess: () => { utils.kf.listFollowups.invalidate(); toast.success("تمت جدولة المتابعة"); setAddFollowupOpen(false); },
    onError: () => toast.error("تعذر جدولة المتابعة"),
  });

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
    <>
    <section dir="rtl" className="space-y-6">
      {/* Back & Edit Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/kf/patients")} className="self-start gap-1 cursor-pointer">
          <ChevronRight className="h-4 w-4" />
          <span>الرجوع لسجل المرضى</span>
        </Button>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button asChild variant="outline" size="sm" className="gap-1.5 cursor-pointer">
            <Link href={`/kf/sheets/consultant/${patient.kfId}?original=1`} target="_blank">
              <ScrollText className="h-4 w-4" />
              <span>شيت استشاري KF</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 cursor-pointer">
            <Link href={`/kf/sheets/consultant/${patient.kfId}/followup?original=1`} target="_blank">
              <RefreshCw className="h-4 w-4" />
              <span>متابعة KF</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/kf/patients/${patient.kfId}/edit`}>
              <Edit className="h-4 w-4" />
              <span>تعديل بيانات المريض</span>
            </Link>
          </Button>
        </div>
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
              <Heart className="h-4 w-4 text-destructive" />
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
                <div className="space-y-1 p-2 rounded bg-secondary/5 border border-secondary/20">
                  <span className="text-xs text-secondary font-bold block">التاريخ المرضي العام</span>
                  <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{patient.medicalHistory || "لا يوجد"}</p>
                </div>
                <div className="space-y-1 p-2 rounded bg-destructive/10 border border-destructive/10">
                  <span className="text-xs text-destructive font-bold block">حساسية الأدوية / الأطعمة</span>
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
              <Button size="sm" className="gap-1.5 cursor-pointer" onClick={() => { setAddVisitForm({ visitDate: localISODate(), visitType: "consultation", doctorName: "", status: "scheduled", notes: "" }); setAddVisitOpen(true); }}>
                <Plus className="h-4 w-4" />
                <span>إضافة زيارة جديدة</span>
              </Button>
            )}
            {activeTab === "exams" && (
              <Button size="sm" className="gap-1.5 cursor-pointer" onClick={() => { setAddExamForm({ examDate: localISODate(), doctorName: "", rightVa: "", leftVa: "", iopRight: "", iopLeft: "", rightRefraction: {}, leftRefraction: {}, diagnosis: "", plan: "", notes: "" }); setAddExamOpen(true); }}>
                <Plus className="h-4 w-4" />
                <span>إضافة فحص جديد</span>
              </Button>
            )}
            {activeTab === "operations" && (
              <Button size="sm" className="gap-1.5 cursor-pointer" onClick={() => { setAddOpForm({ opDate: localISODate(), opType: "", eye: "", doctorName: "", status: "scheduled", notes: "" }); setAddOpOpen(true); }}>
                <Plus className="h-4 w-4" />
                <span>حجز عملية جراحية</span>
              </Button>
            )}
            {activeTab === "followups" && (
              <Button size="sm" className="gap-1.5 cursor-pointer" onClick={() => { setAddFollowupForm({ followupDate: localISODate(), status: "scheduled", notes: "", kfOpId: "none", kfVisitId: "none" }); setAddFollowupOpen(true); }}>
                <Plus className="h-4 w-4" />
                <span>جدولة متابعة</span>
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
                    <TableHead className="text-left"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingVisits ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : visits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
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
                                ? "bg-success hover:bg-success/90 text-success-foreground"
                                : v.status === "cancelled"
                                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                : v.status === "in_progress"
                                ? "bg-warning hover:bg-warning/90 text-warning-foreground"
                                : "bg-primary hover:bg-primary/95 text-primary-foreground"
                            }
                          >
                            {(VISIT_STATUS_AR as Record<string, string>)[v.status ?? "scheduled"] || v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={v.notes ?? ""}>
                          {v.notes || "—"}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex gap-1 items-center">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary" onClick={() => setEditVisit({ ...v, visitDate: v.visitDate ? new Date(v.visitDate).toISOString().split("T")[0] : "" })}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            {delVisit === v.kfVisitId ? (
                              <div className="flex gap-1">
                                <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => deleteVisitMut.mutate({ kfVisitId: v.kfVisitId })} disabled={deleteVisitMut.isPending}>
                                  {deleteVisitMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setDelVisit(null)}>لا</Button>
                              </div>
                            ) : canDelete ? (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDelVisit(v.kfVisitId)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
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
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExams ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : isExamsError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-destructive font-medium">
                        {isExamsForbidden ? "Access restricted" : "حدث خطأ أثناء تحميل الفحوصات"}
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
                          <div className="flex gap-1 items-center">
                            <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setSelectedExamId(e.kfExamId)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary" onClick={() => setEditExam({ ...e, examDate: e.examDate ? new Date(e.examDate).toISOString().split("T")[0] : "", rightRefraction: e.rightRefraction ?? {}, leftRefraction: e.leftRefraction ?? {} })}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            {delExam === e.kfExamId ? (
                              <div className="flex gap-1">
                                <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => deleteExamMut.mutate({ kfExamId: e.kfExamId })} disabled={deleteExamMut.isPending}>
                                  {deleteExamMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setDelExam(null)}>لا</Button>
                              </div>
                            ) : canDelete ? (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDelExam(e.kfExamId)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
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
                    <TableHead className="text-left"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOps ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : operations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
                                ? "bg-success hover:bg-success/90 text-success-foreground"
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
                        <TableCell className="text-left">
                          <div className="flex gap-1 items-center">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary" onClick={() => setEditOp({ ...op, opDate: op.opDate ? new Date(op.opDate).toISOString().split("T")[0] : "" })}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            {delOp === op.kfOpId ? (
                              <div className="flex gap-1">
                                <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => deleteOpMut.mutate({ kfOpId: op.kfOpId })} disabled={deleteOpMut.isPending}>
                                  {deleteOpMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setDelOp(null)}>لا</Button>
                              </div>
                            ) : canDelete ? (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDelOp(op.kfOpId)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
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
                    <TableHead className="text-left"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingFollows ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : followups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
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
                                ? "bg-success hover:bg-success/90 text-success-foreground"
                                : f.status === "missed"
                                ? "bg-warning hover:bg-warning/90 text-warning-foreground"
                                : "bg-primary hover:bg-primary/95 text-primary-foreground"
                            }
                          >
                            {(FOLLOWUP_STATUS_AR as Record<string, string>)[f.status ?? "scheduled"] || f.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{f.notes || "—"}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex gap-1 items-center">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary" onClick={() => setEditFollowup({ ...f, followupDate: f.followupDate ? new Date(f.followupDate).toISOString().split("T")[0] : "" })}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            {delFollowup === f.kfFollowupId ? (
                              <div className="flex gap-1">
                                <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => deleteFollowupMut.mutate({ kfFollowupId: f.kfFollowupId })} disabled={deleteFollowupMut.isPending}>
                                  {deleteFollowupMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setDelFollowup(null)}>لا</Button>
                              </div>
                            ) : canDelete ? (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDelFollowup(f.kfFollowupId)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
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

      {/* Edit Visit Dialog */}
      <Dialog open={!!editVisit} onOpenChange={(open) => !open && setEditVisit(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل الزيارة</DialogTitle>
            <DialogDescription>عدّل بيانات الزيارة ثم اضغط حفظ</DialogDescription>
          </DialogHeader>
          {editVisit && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>تاريخ الزيارة</Label>
                <DateInput value={editVisit.visitDate ?? ""} onChange={(e) => setEditVisit({ ...editVisit, visitDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>نوع الزيارة</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editVisit.visitType ?? ""} onChange={(e) => setEditVisit({ ...editVisit, visitType: e.target.value })}>
                  <option value="consultation">كشف / استشارة</option>
                  <option value="examination">فحص طبي</option>
                  <option value="followup">متابعة</option>
                  <option value="operation">عملية جراحية</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>الحالة</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editVisit.status ?? ""} onChange={(e) => setEditVisit({ ...editVisit, status: e.target.value })}>
                  <option value="scheduled">مجدول</option>
                  <option value="arrived">وصل بالعيادة</option>
                  <option value="in_progress">قيد الكشف</option>
                  <option value="completed">اكتمل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>الطبيب المعالج</Label>
                <Input value={editVisit.doctorName ?? ""} onChange={(e) => setEditVisit({ ...editVisit, doctorName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>ملاحظات</Label>
                <Textarea rows={2} value={editVisit.notes ?? ""} onChange={(e) => setEditVisit({ ...editVisit, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditVisit(null)}>إلغاء</Button>
            <Button disabled={updateVisitMut.isPending} onClick={() => {
              if (!editVisit) return;
              updateVisitMut.mutate({ kfVisitId: editVisit.kfVisitId, visitDate: editVisit.visitDate, visitType: editVisit.visitType, status: editVisit.status, doctorName: editVisit.doctorName || null, notes: editVisit.notes || null });
            }}>
              {updateVisitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Examination Dialog */}
      <Dialog open={!!editExam} onOpenChange={(open) => !open && setEditExam(null)}>
        <DialogContent dir="rtl" className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الفحص الطبي</DialogTitle>
            <DialogDescription>عدّل بيانات الفحص ثم اضغط حفظ</DialogDescription>
          </DialogHeader>
          {editExam && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>تاريخ الفحص</Label>
                  <DateInput value={editExam.examDate ?? ""} onChange={(e) => setEditExam({ ...editExam, examDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>الطبيب الفاحص</Label>
                  <Input value={editExam.doctorName ?? ""} onChange={(e) => setEditExam({ ...editExam, doctorName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>VA اليمنى (UCVA)</Label>
                  <Input value={editExam.rightVa ?? ""} onChange={(e) => setEditExam({ ...editExam, rightVa: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>VA اليسرى (UCVA)</Label>
                  <Input value={editExam.leftVa ?? ""} onChange={(e) => setEditExam({ ...editExam, leftVa: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>IOP اليمنى</Label>
                  <Input value={editExam.iopRight ?? ""} onChange={(e) => setEditExam({ ...editExam, iopRight: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>IOP اليسرى</Label>
                  <Input value={editExam.iopLeft ?? ""} onChange={(e) => setEditExam({ ...editExam, iopLeft: e.target.value })} />
                </div>
              </div>
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground">انكسار العين اليمنى (OD)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Sph</Label><Input className="h-8 text-xs" value={(editExam.rightRefraction as any)?.sph ?? ""} onChange={(e) => setEditExam({ ...editExam, rightRefraction: { ...(editExam.rightRefraction as any), sph: e.target.value } })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Cyl</Label><Input className="h-8 text-xs" value={(editExam.rightRefraction as any)?.cyl ?? ""} onChange={(e) => setEditExam({ ...editExam, rightRefraction: { ...(editExam.rightRefraction as any), cyl: e.target.value } })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Axis</Label><Input className="h-8 text-xs" value={(editExam.rightRefraction as any)?.axis ?? ""} onChange={(e) => setEditExam({ ...editExam, rightRefraction: { ...(editExam.rightRefraction as any), axis: e.target.value } })} /></div>
                </div>
              </div>
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground">انكسار العين اليسرى (OS)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Sph</Label><Input className="h-8 text-xs" value={(editExam.leftRefraction as any)?.sph ?? ""} onChange={(e) => setEditExam({ ...editExam, leftRefraction: { ...(editExam.leftRefraction as any), sph: e.target.value } })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Cyl</Label><Input className="h-8 text-xs" value={(editExam.leftRefraction as any)?.cyl ?? ""} onChange={(e) => setEditExam({ ...editExam, leftRefraction: { ...(editExam.leftRefraction as any), cyl: e.target.value } })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Axis</Label><Input className="h-8 text-xs" value={(editExam.leftRefraction as any)?.axis ?? ""} onChange={(e) => setEditExam({ ...editExam, leftRefraction: { ...(editExam.leftRefraction as any), axis: e.target.value } })} /></div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>التشخيص</Label>
                <Textarea rows={2} value={editExam.diagnosis ?? ""} onChange={(e) => setEditExam({ ...editExam, diagnosis: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>الخطة العلاجية</Label>
                <Textarea rows={2} value={editExam.plan ?? ""} onChange={(e) => setEditExam({ ...editExam, plan: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>ملاحظات</Label>
                <Textarea rows={2} value={editExam.notes ?? ""} onChange={(e) => setEditExam({ ...editExam, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditExam(null)}>إلغاء</Button>
            <Button disabled={updateExamMut.isPending} onClick={() => {
              if (!editExam) return;
              updateExamMut.mutate({ kfExamId: editExam.kfExamId, examDate: editExam.examDate, rightVa: editExam.rightVa || null, leftVa: editExam.leftVa || null, iopRight: editExam.iopRight || null, iopLeft: editExam.iopLeft || null, rightRefraction: editExam.rightRefraction || null, leftRefraction: editExam.leftRefraction || null, diagnosis: editExam.diagnosis || null, plan: editExam.plan || null, notes: editExam.notes || null, doctorName: editExam.doctorName || null });
            }}>
              {updateExamMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Operation Dialog */}
      <Dialog open={!!editOp} onOpenChange={(open) => !open && setEditOp(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل العملية الجراحية</DialogTitle>
            <DialogDescription>عدّل بيانات العملية ثم اضغط حفظ</DialogDescription>
          </DialogHeader>
          {editOp && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>تاريخ العملية</Label>
                <DateInput value={editOp.opDate ?? ""} onChange={(e) => setEditOp({ ...editOp, opDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>نوع العملية</Label>
                <Input value={editOp.opType ?? ""} onChange={(e) => setEditOp({ ...editOp, opType: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>العين</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editOp.eye ?? ""} onChange={(e) => setEditOp({ ...editOp, eye: e.target.value })}>
                  <option value="right">اليمنى</option>
                  <option value="left">اليسرى</option>
                  <option value="both">العينين</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>الجراح</Label>
                <Input value={editOp.doctorName ?? ""} onChange={(e) => setEditOp({ ...editOp, doctorName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>الحالة</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editOp.status ?? ""} onChange={(e) => setEditOp({ ...editOp, status: e.target.value })}>
                  <option value="scheduled">مجدولة</option>
                  <option value="completed">اكتملت</option>
                  <option value="cancelled">ملغاة</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>ملاحظات</Label>
                <Textarea rows={2} value={editOp.notes ?? ""} onChange={(e) => setEditOp({ ...editOp, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOp(null)}>إلغاء</Button>
            <Button disabled={updateOpMut.isPending} onClick={() => {
              if (!editOp) return;
              updateOpMut.mutate({ kfOpId: editOp.kfOpId, opDate: editOp.opDate, opType: editOp.opType, eye: editOp.eye, doctorName: editOp.doctorName || null, status: editOp.status, notes: editOp.notes || null });
            }}>
              {updateOpMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Visit Dialog */}
      <Dialog open={addVisitOpen} onOpenChange={setAddVisitOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة زيارة جديدة</DialogTitle>
            <DialogDescription>تسجيل زيارة جديدة للمريض: {patient.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>تاريخ الزيارة</Label>
              <DateInput value={addVisitForm.visitDate ?? ""} onChange={(e) => setAddVisitForm({ ...addVisitForm, visitDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>نوع الزيارة</Label>
              <Select value={addVisitForm.visitType ?? "consultation"} onValueChange={(v) => setAddVisitForm({ ...addVisitForm, visitType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">كشف / استشارة</SelectItem>
                  <SelectItem value="examination">فحص طبي</SelectItem>
                  <SelectItem value="followup">متابعة</SelectItem>
                  <SelectItem value="operation">عملية جراحية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>الطبيب</Label>
              <Select value={addVisitForm.doctorName ?? ""} onValueChange={(v) => setAddVisitForm({ ...addVisitForm, doctorName: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطبيب..." /></SelectTrigger>
                <SelectContent>
                  {KF_DOCTORS.map((dr) => <SelectItem key={dr} value={dr}>{dr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>الحالة</Label>
              <Select value={addVisitForm.status ?? "scheduled"} onValueChange={(v) => setAddVisitForm({ ...addVisitForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                  <SelectItem value="arrived">وصل بالعيادة</SelectItem>
                  <SelectItem value="in_progress">قيد الكشف</SelectItem>
                  <SelectItem value="completed">اكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={addVisitForm.notes ?? ""} onChange={(e) => setAddVisitForm({ ...addVisitForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddVisitOpen(false)}>إلغاء</Button>
            <Button disabled={createVisitMut.isPending} onClick={() => {
              if (!kfPatientId || !addVisitForm.visitDate) { toast.error("تاريخ الزيارة مطلوب"); return; }
              createVisitMut.mutate({ kfPatientId, visitDate: addVisitForm.visitDate, visitType: addVisitForm.visitType, doctorName: addVisitForm.doctorName || null, status: addVisitForm.status, notes: addVisitForm.notes || null });
            }}>
              {createVisitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Examination Dialog */}
      <Dialog open={addExamOpen} onOpenChange={setAddExamOpen}>
        <DialogContent dir="rtl" className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة فحص طبي جديد</DialogTitle>
            <DialogDescription>تسجيل فحص جديد للمريض: {patient.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>تاريخ الفحص</Label>
                <DateInput value={addExamForm.examDate ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, examDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>الطبيب الفاحص</Label>
                <Select value={addExamForm.doctorName ?? ""} onValueChange={(v) => setAddExamForm({ ...addExamForm, doctorName: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الطبيب..." /></SelectTrigger>
                  <SelectContent>
                    {KF_DOCTORS.map((dr) => <SelectItem key={dr} value={dr}>{dr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>VA اليمنى</Label><Input value={addExamForm.rightVa ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, rightVa: e.target.value })} /></div>
              <div className="space-y-1"><Label>VA اليسرى</Label><Input value={addExamForm.leftVa ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, leftVa: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>IOP اليمنى</Label><Input value={addExamForm.iopRight ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, iopRight: e.target.value })} /></div>
              <div className="space-y-1"><Label>IOP اليسرى</Label><Input value={addExamForm.iopLeft ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, iopLeft: e.target.value })} /></div>
            </div>
            <div className="border rounded-md p-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">انكسار العين اليمنى (OD)</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label className="text-xs">Sph</Label><Input className="h-8 text-xs" value={(addExamForm.rightRefraction as any)?.sph ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, rightRefraction: { ...(addExamForm.rightRefraction ?? {}), sph: e.target.value } })} /></div>
                <div className="space-y-1"><Label className="text-xs">Cyl</Label><Input className="h-8 text-xs" value={(addExamForm.rightRefraction as any)?.cyl ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, rightRefraction: { ...(addExamForm.rightRefraction ?? {}), cyl: e.target.value } })} /></div>
                <div className="space-y-1"><Label className="text-xs">Axis</Label><Input className="h-8 text-xs" value={(addExamForm.rightRefraction as any)?.axis ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, rightRefraction: { ...(addExamForm.rightRefraction ?? {}), axis: e.target.value } })} /></div>
              </div>
            </div>
            <div className="border rounded-md p-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">انكسار العين اليسرى (OS)</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label className="text-xs">Sph</Label><Input className="h-8 text-xs" value={(addExamForm.leftRefraction as any)?.sph ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, leftRefraction: { ...(addExamForm.leftRefraction ?? {}), sph: e.target.value } })} /></div>
                <div className="space-y-1"><Label className="text-xs">Cyl</Label><Input className="h-8 text-xs" value={(addExamForm.leftRefraction as any)?.cyl ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, leftRefraction: { ...(addExamForm.leftRefraction ?? {}), cyl: e.target.value } })} /></div>
                <div className="space-y-1"><Label className="text-xs">Axis</Label><Input className="h-8 text-xs" value={(addExamForm.leftRefraction as any)?.axis ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, leftRefraction: { ...(addExamForm.leftRefraction ?? {}), axis: e.target.value } })} /></div>
              </div>
            </div>
            <div className="space-y-1"><Label>التشخيص</Label><Textarea rows={2} value={addExamForm.diagnosis ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, diagnosis: e.target.value })} /></div>
            <div className="space-y-1"><Label>الخطة العلاجية</Label><Textarea rows={2} value={addExamForm.plan ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, plan: e.target.value })} /></div>
            <div className="space-y-1"><Label>ملاحظات</Label><Textarea rows={2} value={addExamForm.notes ?? ""} onChange={(e) => setAddExamForm({ ...addExamForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddExamOpen(false)}>إلغاء</Button>
            <Button disabled={createExamMut.isPending} onClick={() => {
              if (!kfPatientId || !addExamForm.examDate) { toast.error("تاريخ الفحص مطلوب"); return; }
              createExamMut.mutate({ kfPatientId, kfVisitId: null, examDate: addExamForm.examDate, rightVa: addExamForm.rightVa || null, leftVa: addExamForm.leftVa || null, iopRight: addExamForm.iopRight || null, iopLeft: addExamForm.iopLeft || null, rightRefraction: addExamForm.rightRefraction || null, leftRefraction: addExamForm.leftRefraction || null, diagnosis: addExamForm.diagnosis || null, plan: addExamForm.plan || null, notes: addExamForm.notes || null, doctorName: addExamForm.doctorName || null });
            }}>
              {createExamMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Operation Dialog */}
      <Dialog open={addOpOpen} onOpenChange={setAddOpOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>حجز عملية جراحية</DialogTitle>
            <DialogDescription>تسجيل عملية جراحية للمريض: {patient.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>تاريخ العملية</Label>
              <DateInput value={addOpForm.opDate ?? ""} onChange={(e) => setAddOpForm({ ...addOpForm, opDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>نوع العملية</Label>
              <Input placeholder="مثال: LASIK، فاكو، إلخ..." value={addOpForm.opType ?? ""} onChange={(e) => setAddOpForm({ ...addOpForm, opType: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>العين</Label>
              <Select value={addOpForm.eye ?? ""} onValueChange={(v) => setAddOpForm({ ...addOpForm, eye: v })}>
                <SelectTrigger><SelectValue placeholder="اختر العين..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">اليمنى</SelectItem>
                  <SelectItem value="left">اليسرى</SelectItem>
                  <SelectItem value="both">العينين</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>الجراح</Label>
              <Select value={addOpForm.doctorName ?? ""} onValueChange={(v) => setAddOpForm({ ...addOpForm, doctorName: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الجراح..." /></SelectTrigger>
                <SelectContent>
                  {KF_DOCTORS.map((dr) => <SelectItem key={dr} value={dr}>{dr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>الحالة</Label>
              <Select value={addOpForm.status ?? "scheduled"} onValueChange={(v) => setAddOpForm({ ...addOpForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">مجدولة</SelectItem>
                  <SelectItem value="completed">اكتملت</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={addOpForm.notes ?? ""} onChange={(e) => setAddOpForm({ ...addOpForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpOpen(false)}>إلغاء</Button>
            <Button disabled={createOpMut.isPending} onClick={() => {
              if (!kfPatientId || !addOpForm.opDate) { toast.error("تاريخ العملية مطلوب"); return; }
              if (!addOpForm.opType?.trim()) { toast.error("نوع العملية مطلوب"); return; }
              if (!addOpForm.eye) { toast.error("يجب اختيار العين"); return; }
              createOpMut.mutate({ kfPatientId, kfVisitId: null, opDate: addOpForm.opDate, opType: addOpForm.opType.trim(), eye: addOpForm.eye || null, doctorName: addOpForm.doctorName || null, status: addOpForm.status, notes: addOpForm.notes || null });
            }}>
              {createOpMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Followup Dialog */}
      <Dialog open={!!editFollowup} onOpenChange={(open) => !open && setEditFollowup(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المتابعة</DialogTitle>
            <DialogDescription>عدّل بيانات المتابعة ثم اضغط حفظ</DialogDescription>
          </DialogHeader>
          {editFollowup && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>تاريخ المتابعة</Label>
                <DateInput value={editFollowup.followupDate ?? ""} onChange={(e) => setEditFollowup({ ...editFollowup, followupDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>الحالة</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editFollowup.status ?? ""} onChange={(e) => setEditFollowup({ ...editFollowup, status: e.target.value })}>
                  <option value="scheduled">مجدولة</option>
                  <option value="completed">اكتملت</option>
                  <option value="missed">لم يحضر</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>ملاحظات</Label>
                <Textarea rows={2} value={editFollowup.notes ?? ""} onChange={(e) => setEditFollowup({ ...editFollowup, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditFollowup(null)}>إلغاء</Button>
            <Button disabled={updateFollowupMut.isPending} onClick={() => {
              if (!editFollowup) return;
              updateFollowupMut.mutate({ kfFollowupId: editFollowup.kfFollowupId, followupDate: editFollowup.followupDate, status: editFollowup.status, notes: editFollowup.notes || null });
            }}>
              {updateFollowupMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Followup Dialog */}
      <Dialog open={addFollowupOpen} onOpenChange={setAddFollowupOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>جدولة متابعة</DialogTitle>
            <DialogDescription>تحديد موعد مراجعة للمريض: {patient.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>تاريخ المتابعة</Label>
              <DateInput value={addFollowupForm.followupDate ?? ""} onChange={(e) => setAddFollowupForm({ ...addFollowupForm, followupDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>الحالة</Label>
              <Select value={addFollowupForm.status ?? "scheduled"} onValueChange={(v) => setAddFollowupForm({ ...addFollowupForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">مجدولة</SelectItem>
                  <SelectItem value="completed">اكتملت</SelectItem>
                  <SelectItem value="missed">لم يحضر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>مرتبطة بعملية (اختياري)</Label>
              <Select value={addFollowupForm.kfOpId ?? "none"} onValueChange={(v) => setAddFollowupForm({ ...addFollowupForm, kfOpId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">غير مرتبطة</SelectItem>
                  {operations.map((op: any) => (
                    <SelectItem key={op.kfOpId} value={String(op.kfOpId)}>
                      {op.opType} ({new Date(op.opDate).toLocaleDateString("ar-EG")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={addFollowupForm.notes ?? ""} onChange={(e) => setAddFollowupForm({ ...addFollowupForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddFollowupOpen(false)}>إلغاء</Button>
            <Button disabled={createFollowupMut.isPending} onClick={() => {
              if (!kfPatientId || !addFollowupForm.followupDate) { toast.error("تاريخ المتابعة مطلوب"); return; }
              createFollowupMut.mutate({ kfPatientId, followupDate: addFollowupForm.followupDate, status: addFollowupForm.status, notes: addFollowupForm.notes || null, kfOpId: addFollowupForm.kfOpId === "none" ? null : Number(addFollowupForm.kfOpId), kfVisitId: null });
            }}>
              {createFollowupMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
