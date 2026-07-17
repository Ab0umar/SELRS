import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Download, Printer, Save, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PatientPicker from "@/components/PatientPicker";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";

function CertLabel({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-bold text-[#727780]">{children}</span>
  );
}

export default function MedicalConditionReport() {
  const { isAuthenticated, user } = useAuth();
  const [, params] = useRoute("/medical-condition-report/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const [patientId, setPatientId] = useState<number | undefined>(
    initialPatientId,
  );

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });
  const reportsQuery = trpc.medical.getMedicalConditionReportsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const templatesQuery = trpc.medical.getMedicalConditionReportTemplates.useQuery();
  const templates = (templatesQuery.data as any[] | undefined) ?? [];
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);

  const patient = patientQuery.data as any;
  const reports = (reportsQuery.data as any[] | undefined) ?? [];
  const [existingReportId, setExistingReportId] = useState<number | undefined>();
  const [reportDate, setReportDate] = useState("");
  const [operationType, setOperationType] = useState("");
  const [operationDate, setOperationDate] = useState("");
  const [condition, setCondition] = useState("");
  const [includeCurrentStatus, setIncludeCurrentStatus] = useState(true);
  const [vaOd, setVaOd] = useState("");
  const [vaOs, setVaOs] = useState("");
  const [complications, setComplications] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [templateId, setTemplateId] = useState("");

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const template = templates.find((t) => String(t.id) === id);
    if (!template) return;
    if (template.operationType) setOperationType(template.operationType);
    setCondition(template.condition ?? "");
    setComplications(template.complications ?? "");
    setFollowUpPlan(template.followUpPlan ?? "");
  };

  useEffect(() => {
    if (initialPatientId) setPatientId(initialPatientId);
  }, [initialPatientId]);

  useEffect(() => {
    const fullName = String(user?.name ?? "").trim();
    if (fullName && !doctorName) setDoctorName(fullName);
  }, [doctorName, user?.name]);

  useEffect(() => {
    if (!patient) return;
    setPatientName(patient.fullName || "");
    setPatientCode(patient.patientCode || "");
    setPatientDob(patient.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "");
  }, [patient]);

  useEffect(() => {
    const report = reports[0];
    if (!report) return;
    setExistingReportId(Number(report.id));
    setReportDate(report.reportDate ? String(report.reportDate).split("T")[0] : "");
    setOperationType(report.operationType || "");
    setOperationDate(report.operationDate ? String(report.operationDate).split("T")[0] : "");
    setCondition(report.condition || "");
    setIncludeCurrentStatus(report.includeCurrentStatus ?? true);
    setVaOd(report.vaOD || "");
    setVaOs(report.vaOS || "");
    setComplications(report.complications || "");
    setFollowUpPlan(report.followUpPlan || "");
    if (report.doctorName) setDoctorName(report.doctorName);
    if (report.patientNameOverride) setPatientName(report.patientNameOverride);
    if (report.patientCodeOverride) setPatientCode(report.patientCodeOverride);
    if (report.patientDobOverride) setPatientDob(String(report.patientDobOverride).split("T")[0]);
  }, [reports]);

  const saveReportMutation = trpc.medical.saveMedicalConditionReport.useMutation();

  const handleSave = async () => {
    if (!patientId) {
      toast.error("اختر مريضاً أولاً");
      return;
    }
    try {
      await saveReportMutation.mutateAsync({
        id: existingReportId,
        patientId,
        reportDate: reportDate || undefined,
        operationType: operationType || undefined,
        operationDate: operationDate || undefined,
        condition: condition || undefined,
        includeCurrentStatus,
        vaOD: includeCurrentStatus ? vaOd || undefined : undefined,
        vaOS: includeCurrentStatus ? vaOs || undefined : undefined,
        complications: complications || undefined,
        followUpPlan: followUpPlan || undefined,
        doctorName: doctorName || undefined,
        patientNameOverride: patientName || undefined,
        patientCodeOverride: patientCode || undefined,
        patientDobOverride: patientDob || undefined,
      });
      toast.success("تم حفظ التقرير");
      await reportsQuery.refetch();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="medical-condition-report-root min-h-screen bg-[#eef5f7] text-[#161d1f]">
      <style>{`
        .mcr-paper {
          width: 210mm;
          min-height: 297mm;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .medical-condition-report-root {
            min-height: 0 !important;
            height: 297mm !important;
            background: white !important;
            overflow: hidden !important;
          }
          .mcr-print-shell {
            padding: 0 !important;
            height: 297mm !important;
            overflow: hidden !important;
          }
          .mcr-paper {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 0 !important;
            max-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            padding: 30mm 18mm 12mm !important;
            overflow: hidden !important;
          }
          .mcr-paper header {
            margin-bottom: 6mm !important;
            padding-bottom: 4mm !important;
          }
          .mcr-paper section {
            margin-bottom: 5mm !important;
          }
          .mcr-paper section:nth-of-type(1) {
            padding: 4mm !important;
          }
          .mcr-paper section:nth-of-type(1) h3 {
            margin-bottom: 2mm !important;
            font-size: 15px !important;
          }
          .mcr-paper p {
            line-height: 1.45 !important;
          }
          .mcr-paper table th,
          .mcr-paper table td {
            padding-top: 1.6mm !important;
            padding-bottom: 1.6mm !important;
          }
          .mcr-paper input,
          .mcr-paper textarea {
            box-shadow: none !important;
          }
          .mcr-paper footer {
            margin-top: 4mm !important;
            padding-top: 3mm !important;
            gap: 14mm !important;
          }
          .mcr-paper footer p {
            margin-bottom: 3mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <header className="no-print sticky top-0 z-50 border-b border-[#c2c7d1] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-lg font-extrabold text-[#00355f]">
              Medical Condition Report
            </h1>
            <p className="text-xs font-semibold text-[#727780]">
              تقرير حالة طبية
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-64">
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="نموذج جاهز..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="إدارة النماذج الجاهزة"
              onClick={() => setTemplatesDialogOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <div className="w-72">
              <PatientPicker
                initialPatientId={patientId}
                onSelect={(selected) => {
                  if (selected?.id) setPatientId(Number(selected.id));
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-[#00355f] text-[#00355f]"
              onClick={handleSave}
              disabled={saveReportMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveReportMutation.isPending ? "جارٍ الحفظ..." : "Save"}
            </Button>
            <Button
              type="button"
              className="bg-[#00355f] text-white"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[#c2c7d1]"
              onClick={() => window.print()}
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mcr-print-shell flex justify-center p-8" dir="rtl">
        <article className="mcr-paper relative flex flex-col border border-[#c2c7d1] bg-white px-[40mm] pb-[40mm] pt-[48mm] shadow-sm">
          <section className="mb-8 border border-[#c2c7d1] bg-[#eef5f7] p-5">
            <h3 className="mb-3 text-lg font-bold text-[#00355f]">
              تقرير طبي
            </h3>
            <p className="text-[15px] leading-8 text-[#161d1f]">
              تشهد العيادة بأن المريض المذكور أدناه يعاني من الحالة الطبية
              التالية:{" "}
              <Input
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="mx-1 inline-flex h-8 w-64 border-0 border-b border-dotted border-[#727780] bg-transparent px-2 text-center text-base font-bold shadow-none focus-visible:ring-0"
              />{" "}
              ، وأن حالته تستدعي المتابعة الطبية اللازمة على النحو المبين
              أدناه.
            </p>
          </section>

          <section className="mb-8 grid grid-cols-2 gap-x-10 gap-y-4">
            <label className="flex items-center justify-between gap-2 border-b border-[#c2c7d1] py-2">
              <CertLabel>الاسم الكامل:</CertLabel>
              <Input
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className="h-8 w-56 border-0 border-b border-dotted border-[#727780] bg-transparent text-right text-base font-bold shadow-none focus-visible:ring-0"
              />
            </label>
            <label className="flex items-center justify-between gap-2 border-b border-[#c2c7d1] py-2">
              <CertLabel>رقم المريض:</CertLabel>
              <Input
                value={patientCode}
                onChange={(event) => setPatientCode(event.target.value)}
                className="h-8 w-36 border-0 border-b border-dotted border-[#727780] bg-transparent text-center font-mono text-base font-semibold shadow-none focus-visible:ring-0"
              />
            </label>
            <label className="flex items-center justify-between gap-2 border-b border-[#c2c7d1] py-2">
              <CertLabel>تاريخ الميلاد:</CertLabel>
              <DateInput
                value={patientDob}
                onChange={(event) => setPatientDob(event.target.value)}
                className="h-8 w-36 border-[#c2c7d1] text-center font-mono text-base font-semibold"
              />
            </label>
            <label className="flex items-center justify-between gap-4 border-b border-[#c2c7d1] py-2">
              <CertLabel>تاريخ التقرير:</CertLabel>
              <DateInput
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                className="h-8 w-36 border-[#c2c7d1] text-center text-base"
              />
            </label>
            <label className="flex items-center justify-between gap-2 border-b border-[#c2c7d1] py-2">
              <CertLabel>نوع العملية:</CertLabel>
              <Input
                value={operationType}
                onChange={(event) => setOperationType(event.target.value)}
                className="h-8 w-36 border-0 border-b border-dotted border-[#727780] bg-transparent text-center text-base font-bold shadow-none focus-visible:ring-0"
              />
            </label>
            <label className="flex items-center justify-between gap-4 border-b border-[#c2c7d1] py-2">
              <CertLabel>تاريخ العملية:</CertLabel>
              <DateInput
                value={operationDate}
                onChange={(event) => setOperationDate(event.target.value)}
                className="h-8 w-36 border-[#c2c7d1] text-center text-base"
              />
            </label>
          </section>

          <label className="no-print mb-3 flex items-center gap-2 text-sm font-bold text-[#00355f]">
            <Checkbox
              checked={includeCurrentStatus}
              onCheckedChange={(checked) => setIncludeCurrentStatus(checked === true)}
            />
            إضافة الفحص الحالي / Current Status
          </label>

          {includeCurrentStatus && (
            <section
              className="mb-8 overflow-hidden border border-[#c2c7d1]"
              dir="ltr"
            >
              <h3 className="border-b border-[#c2c7d1] bg-[#00355f] px-4 py-2 text-center text-sm font-extrabold text-white">
                الفحص الحالي / Current Status
              </h3>
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-[#e8eff1] text-[12px] font-bold text-[#42474f]">
                    <th className="border border-[#c2c7d1] px-3 py-2">Eye</th>
                    <th className="border border-[#c2c7d1] px-3 py-2">VA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#c2c7d1] px-3 py-2 font-bold">
                      OD
                    </td>
                    <td className="border border-[#c2c7d1] p-0">
                      <Input
                        value={vaOd}
                        onChange={(event) => setVaOd(event.target.value)}
                        className="h-10 border-0 text-center text-lg font-bold"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#c2c7d1] px-3 py-2 font-bold">
                      OS
                    </td>
                    <td className="border border-[#c2c7d1] p-0">
                      <Input
                        value={vaOs}
                        onChange={(event) => setVaOs(event.target.value)}
                        className="h-10 border-0 text-center text-lg font-bold"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          <section className="mb-8">
            <h3 className="mb-2 text-sm font-bold text-[#00355f]">
              المضاعفات / Complications
            </h3>
            <Textarea
              value={complications}
              onChange={(event) => setComplications(event.target.value)}
              rows={4}
              className="border-[#c2c7d1] text-[15px]"
              placeholder="اذكر أي مضاعفات ملاحظة، إن وجدت..."
            />
          </section>

          <section className="mb-8">
            <h3 className="mb-2 text-sm font-bold text-[#00355f]">
              خطة المتابعة / Follow-up Plan
            </h3>
            <Textarea
              value={followUpPlan}
              onChange={(event) => setFollowUpPlan(event.target.value)}
              rows={4}
              className="border-[#c2c7d1] text-[15px]"
              placeholder="اذكر توصيات المتابعة والموعد القادم..."
            />
          </section>

          <footer className="mt-4 border-t border-[#c2c7d1] pt-4">
            <div dir="ltr" className="text-left">
              <p dir="ltr" className="mb-5 text-left font-bold">
                توقيع الطبيب المعالج:
              </p>
              <div className="mb-2 w-56 border-b border-[#42474f]" />
              <Input
                value={doctorName}
                onChange={(event) => setDoctorName(event.target.value)}
                dir="ltr"
                className="w-64 border-0 bg-transparent p-0 text-left font-bold shadow-none"
              />
              <p className="text-xs text-[#727780]">استشاري جراحة العيون</p>
            </div>
          </footer>
        </article>
      </main>

      <TemplatesManagerDialog
        open={templatesDialogOpen}
        onOpenChange={setTemplatesDialogOpen}
        templates={templates}
      />
    </div>
  );
}

function TemplatesManagerDialog({
  open,
  onOpenChange,
  templates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: any[];
}) {
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | undefined>();
  const [name, setName] = useState("");
  const [operationType, setOperationType] = useState("");
  const [condition, setCondition] = useState("");
  const [complications, setComplications] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState("");

  const resetForm = () => {
    setEditingId(undefined);
    setName("");
    setOperationType("");
    setCondition("");
    setComplications("");
    setFollowUpPlan("");
  };

  const saveMutation = trpc.medical.saveMedicalConditionReportTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم الحفظ");
      resetForm();
      utils.medical.getMedicalConditionReportTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    },
  });

  const deleteMutation = trpc.medical.deleteMedicalConditionReportTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم الحذف");
      utils.medical.getMedicalConditionReportTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحذف"));
    },
  });

  const handleEdit = (template: any) => {
    setEditingId(Number(template.id));
    setName(template.name || "");
    setOperationType(template.operationType || "");
    setCondition(template.condition || "");
    setComplications(template.complications || "");
    setFollowUpPlan(template.followUpPlan || "");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("اكتب اسم النموذج");
      return;
    }
    saveMutation.mutate({
      id: editingId,
      name: name.trim(),
      operationType: operationType || undefined,
      condition: condition || undefined,
      complications: complications || undefined,
      followUpPlan: followUpPlan || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إدارة النماذج الجاهزة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
            {templates.length === 0 ? (
              <span className="text-sm text-muted-foreground">لا توجد نماذج بعد</span>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <button
                    type="button"
                    className="flex-1 text-right"
                    onClick={() => handleEdit(template)}
                  >
                    {template.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate({ id: Number(template.id) })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم النموذج</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">نوع العملية (اختياري)</label>
              <Input value={operationType} onChange={(e) => setOperationType(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">الحالة الطبية</label>
              <Textarea rows={2} value={condition} onChange={(e) => setCondition(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">المضاعفات</label>
              <Textarea rows={2} value={complications} onChange={(e) => setComplications(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">خطة المتابعة</label>
              <Textarea rows={2} value={followUpPlan} onChange={(e) => setFollowUpPlan(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingId ? "تحديث النموذج" : "إضافة نموذج جديد"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء التعديل
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
