import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Trash2, X, Edit } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDisplayValue } from "@/hooks/patient-details/usePatientDetails";

interface FollowupTabProps {
  examinations: any[];
  visitsData: any[];
  surgeries: any[];
  followups: any[];
  isAdmin: boolean;
  editingVisitId: number | null;
  editVisitDate: string;
  setEditingVisitId: (id: number | null) => void;
  setEditVisitDate: (date: string) => void;
  updateVisitDateMutation: { mutate: (args: { visitId: number; visitDate: string }) => void; isPending: boolean };
  deleteExamMutation: { mutateAsync: (args: { examinationId: number }) => Promise<any>; isPending: boolean };
  deleteVisitMutation: { isPending: boolean };
  onAfterDelete: () => Promise<void>;
}

export function FollowupTab({
  examinations, visitsData, surgeries, followups, isAdmin,
  editingVisitId, editVisitDate, setEditingVisitId, setEditVisitDate,
  updateVisitDateMutation, deleteExamMutation, deleteVisitMutation, onAfterDelete,
}: FollowupTabProps) {
  return (
    <div className="space-y-6">
      {/* All Visits/Examinations */}
      <Card className="border-border/80 bg-background/92 shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle>جميع الزيارات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {examinations.length === 0 && <p className="text-sm text-muted-foreground">لا توجد زيارات محفوظة</p>}
          {[...examinations]
            .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .map((exam: any) => {
              const isEditing = editingVisitId === exam.visitId;
              const visit = visitsData.find((v: any) => v.id === exam.visitId);
              const displayDate = visit?.visitDate || exam.createdAt;
              return (
                <div key={exam.id} className="rounded-2xl border border-border bg-muted/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">زيارة رقم {exam.id}</span>
                      <p className="text-xs text-muted-foreground mt-1">النوع: {exam.visitType === "followup" ? "متابعة" : "فحص"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing && isAdmin ? (
                        <>
                          <Input type="date" value={editVisitDate} onChange={(e) => setEditVisitDate(e.target.value)} className="w-32 h-7 text-xs" dir="ltr" />
                          <Button size="sm" variant="ghost" onClick={() => updateVisitDateMutation.mutate({ visitId: exam.visitId, visitDate: editVisitDate })} disabled={updateVisitDateMutation.isPending}>
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingVisitId(null)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">{formatDate(displayDate)}</span>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => { const dateStr = new Date(displayDate).toISOString().split("T")[0]; setEditVisitDate(dateStr); setEditingVisitId(exam.visitId); }} className="text-card-foreground hover:bg-primary/5">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {isAdmin && (
                        <Button variant="ghost" size="sm" aria-label="حذف الزيارة" disabled={deleteVisitMutation.isPending || !exam.visitId} className="h-11 w-11 p-0"
                          onClick={async () => {
                            if (!exam.visitId) { toast.error("خطأ: لا يوجد رقم زيارة"); return; }
                            if (confirm(`هل أنت متأكد من حذف الزيارة رقم ${exam.visitId} (${formatDate(exam.createdAt)}) وكل بياناتها فقط؟\n\nسيتم حذف هذه الزيارة فقط، الزيارات الأخرى ستبقى محفوظة.`)) {
                              try {
                                if (!exam.id) { toast.error("خطأ: معرّف الفحص مفقود"); return; }
                                await deleteExamMutation.mutateAsync({ examinationId: exam.id });
                                toast.success("تم حذف الزيارة بنجاح");
                                await new Promise(resolve => setTimeout(resolve, 500));
                                await onAfterDelete();
                              } catch (error) {
                                toast.error(`حدث خطأ في الحذف: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive hover:text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {(exam.ucvaOD || exam.ucvaOS || exam.bcvaOD || exam.bcvaOS) && (
                    <div className="text-sm pt-2 border-t border-border">
                      <span className="font-semibold text-foreground">الحدة البصرية:</span>
                      <p className="text-muted-foreground mt-1">
                        {exam.ucvaOD && `UCVA OD: ${exam.ucvaOD}`}{exam.ucvaOD && exam.ucvaOS && " | "}{exam.ucvaOS && `UCVA OS: ${exam.ucvaOS}`}
                      </p>
                      {(exam.bcvaOD || exam.bcvaOS) && (
                        <p className="text-muted-foreground">{exam.bcvaOD && `BCVA OD: ${exam.bcvaOD}`}{exam.bcvaOD && exam.bcvaOS && " | "}{exam.bcvaOS && `BCVA OS: ${exam.bcvaOS}`}</p>
                      )}
                    </div>
                  )}
                  {(exam.sphereOD || exam.sphereOS || exam.cylinderOD || exam.cylinderOS) && (
                    <div className="text-sm pt-2 border-t border-border">
                      <span className="font-semibold text-foreground">الانكسار:</span>
                      {exam.sphereOD && <p className="text-muted-foreground mt-1">OD: {exam.sphereOD} / {exam.cylinderOD || "-"} x {exam.axisOD || "-"}</p>}
                      {exam.sphereOS && <p className="text-muted-foreground">OS: {exam.sphereOS} / {exam.cylinderOS || "-"} x {exam.axisOS || "-"}</p>}
                    </div>
                  )}
                  {(exam.iopOD || exam.iopOS) && (
                    <div className="text-sm pt-2 border-t border-border">
                      <span className="font-semibold text-foreground">ضغط العين:</span>
                      <p className="text-muted-foreground mt-1">{exam.iopOD && `OD: ${exam.iopOD}`}{exam.iopOD && exam.iopOS && " | "}{exam.iopOS && `OS: ${exam.iopOS}`}</p>
                    </div>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>

      {surgeries.length > 0 && (
        <Card className="border-border/80 bg-background/92 shadow-sm">
          <CardHeader className="border-b border-border"><CardTitle>العمليات الجراحية</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {surgeries.map((surgery: any) => (
              <div key={surgery.id} className="rounded-2xl border border-border bg-muted/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">عملية #{surgery.id}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(surgery.surgeryDate)}</span>
                </div>
                {surgery.notes && <p className="text-sm text-muted-foreground mt-2">{surgery.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {followups.length > 0 && (
        <Card className="border-border/80 bg-background/92 shadow-sm">
          <CardHeader className="border-b border-border"><CardTitle>متابعات ما بعد العملية</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {followups.map((followup: any) => (
              <div key={followup.id} className="rounded-2xl border border-border bg-muted/70 p-4 space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">متابعة #{followup.id}</span>
                  <span className="text-xs font-medium text-primary">{formatDate(followup.followupDate)}</span>
                </div>
                {(followup.visualAcuityOD || followup.visualAcuityOS) && (
                  <div className="text-sm"><span className="font-medium text-foreground">الإبصار:</span><span className="ml-2 text-muted-foreground">{followup.visualAcuityOD && `OD: ${followup.visualAcuityOD}`}{followup.visualAcuityOD && followup.visualAcuityOS && " | "}{followup.visualAcuityOS && `OS: ${followup.visualAcuityOS}`}</span></div>
                )}
                {(followup.iopOD || followup.iopOS) && (
                  <div className="text-sm"><span className="font-medium text-foreground">ضغط العين:</span><span className="ml-2 text-muted-foreground">{followup.iopOD && `OD: ${followup.iopOD}`}{followup.iopOD && followup.iopOS && " | "}{followup.iopOS && `OS: ${followup.iopOS}`}</span></div>
                )}
                {followup.findings && <div className="text-sm"><span className="font-medium text-foreground">الملاحظات:</span><p className="text-muted-foreground mt-1">{formatDisplayValue(followup.findings)}</p></div>}
                {followup.prescription && <div className="text-sm"><span className="font-medium text-foreground">الوصفة:</span><p className="text-muted-foreground mt-1">{formatDisplayValue(followup.prescription)}</p></div>}
                {followup.status && <div className="text-sm"><span className="font-medium text-foreground">الحالة:</span><span className="ml-2 text-muted-foreground">{followup.status}</span></div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
