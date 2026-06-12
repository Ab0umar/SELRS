import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Trash2, X, Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatDisplayValue,
} from "@/hooks/patient-details/usePatientDetails";

interface FollowupTabProps {
  examinations: any[];
  visitsData: any[];
  surgeries: any[];
  followups: any[];
  followupSheets: any[];
  isAdmin: boolean;
  patientId?: number;
  editingVisitId: number | null;
  editVisitDate: string;
  setEditingVisitId: (id: number | null) => void;
  setEditVisitDate: (date: string) => void;
  updateVisitDateMutation: {
    mutate: (args: { visitId: number; visitDate: string }) => void;
    isPending: boolean;
  };
  deleteExamMutation: {
    mutateAsync: (args: { examinationId: number }) => Promise<any>;
    isPending: boolean;
  };
  deleteVisitMutation: { isPending: boolean };
  onAfterDelete: () => Promise<void>;
}

export function FollowupTab({
  examinations,
  visitsData,
  surgeries,
  followups,
  followupSheets,
  isAdmin,
  patientId,
  editingVisitId,
  editVisitDate,
  setEditingVisitId,
  setEditVisitDate,
  updateVisitDateMutation,
  deleteExamMutation,
  deleteVisitMutation,
  onAfterDelete,
}: FollowupTabProps) {
  const [, setLocation] = useLocation();
  const [typeFilter, setTypeFilter] = useState<"all" | "exam" | "followup">(
    "all",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Flatten followup sheets → items, parse JSON refraction
  const followupEntries = (followupSheets ?? []).flatMap((sheet: any) =>
    (sheet.items ?? [])
      .filter((item: any) => item.followupDate)
      .map((item: any) => {
        let refOD: any = null;
        let refOS: any = null;
        try {
          refOD =
            typeof item.refracOD === "string"
              ? JSON.parse(item.refracOD)
              : item.refracOD;
        } catch {}
        try {
          refOS =
            typeof item.refracOS === "string"
              ? JSON.parse(item.refracOS)
              : item.refracOS;
        } catch {}
        return {
          _type: "followup" as const,
          _date: new Date(item.followupDate),
          _sheetType: sheet.sheetType,
          ...item,
          refOD,
          refOS,
        };
      }),
  );

  // Merge exams + followup items, sort newest first
  const allEntries = [
    ...examinations.map((e: any) => ({
      _type: "exam" as const,
      _date: new Date(
        visitsData.find((v: any) => v.id === e.visitId)?.visitDate ||
          e.createdAt,
      ),
      ...e,
    })),
    ...followupEntries,
  ].sort((a, b) => b._date.getTime() - a._date.getTime());

  const filteredEntries = allEntries.filter((entry) => {
    if (typeFilter !== "all" && entry._type !== typeFilter) return false;
    if (dateFrom && entry._date < new Date(dateFrom)) return false;
    if (dateTo && entry._date > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Unified timeline: exams + followups */}
      <Card className="border-border/80 bg-background/92 shadow-sm">
        <CardHeader className="border-b border-border flex items-center justify-between">
          <CardTitle>جميع الزيارات والمتابعات</CardTitle>
          {patientId && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setLocation(`/followup/${patientId}`)}
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">متابعة جديدة</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filter bar — matches MedicalFilePanel selector style */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="text-xs font-medium text-muted-foreground">
              عرض:
            </span>
            <Select
              value={typeFilter}
              onValueChange={(v) =>
                setTypeFilter(v as "all" | "exam" | "followup")
              }
            >
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="exam">فحص</SelectItem>
                <SelectItem value="followup">متابعة</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">من:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-7 w-32 text-xs"
              dir="ltr"
            />
            <span className="text-xs text-muted-foreground">إلى:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-7 w-32 text-xs"
              dir="ltr"
            />
            {(typeFilter !== "all" || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                مسح
              </button>
            )}
          </div>

          {filteredEntries.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد نتائج</p>
          )}
          {filteredEntries.map((entry: any, idx: number) => {
            const isExam = entry._type === "exam";
            const isEditing = isExam && editingVisitId === entry.visitId;
            return (
              <div
                key={`${entry._type}-${entry.id}-${idx}`}
                className="rounded-2xl border border-border bg-muted/70 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isExam ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}
                      >
                        {isExam ? "فحص" : "متابعة"}
                      </span>
                      {!isExam && entry._sheetType && (
                        <span className="text-xs text-muted-foreground">
                          ({entry._sheetType})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing && isAdmin ? (
                      <>
                        <Input
                          type="date"
                          value={editVisitDate}
                          onChange={(e) => setEditVisitDate(e.target.value)}
                          className="w-32 h-7 text-xs"
                          dir="ltr"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateVisitDateMutation.mutate({
                              visitId: entry.visitId,
                              visitDate: editVisitDate,
                            })
                          }
                          disabled={updateVisitDateMutation.isPending}
                        >
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingVisitId(null)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry._date)}
                        </span>
                        {isExam && isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const d = new Date(entry._date)
                                .toISOString()
                                .split("T")[0];
                              setEditVisitDate(d);
                              setEditingVisitId(entry.visitId);
                            }}
                            className="text-card-foreground hover:bg-primary/5"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                    {isExam && isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="حذف الزيارة"
                        disabled={
                          deleteVisitMutation.isPending || !entry.visitId
                        }
                        className="h-11 w-11 p-0"
                        onClick={async () => {
                          if (!entry.visitId) {
                            toast.error("خطأ: لا يوجد رقم زيارة");
                            return;
                          }
                          if (
                            confirm(
                              `هل أنت متأكد من حذف الزيارة رقم ${entry.visitId} (${formatDate(entry.createdAt)}) وكل بياناتها فقط؟`,
                            )
                          ) {
                            try {
                              if (!entry.id) {
                                toast.error("خطأ: معرّف الفحص مفقود");
                                return;
                              }
                              await deleteExamMutation.mutateAsync({
                                examinationId: entry.id,
                              });
                              toast.success("تم حذف الزيارة بنجاح");
                              await new Promise((resolve) =>
                                setTimeout(resolve, 500),
                              );
                              await onAfterDelete();
                            } catch (error) {
                              toast.error(
                                `حدث خطأ في الحذف: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
                              );
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Exam fields */}
                {isExam &&
                  (entry.ucvaOD ||
                    entry.ucvaOS ||
                    entry.bcvaOD ||
                    entry.bcvaOS) && (
                    <div className="text-sm pt-2 border-t border-border">
                      <span className="font-semibold text-foreground">
                        الحدة البصرية:
                      </span>
                      <p className="text-muted-foreground mt-1">
                        {entry.ucvaOD && `UCVA OD: ${entry.ucvaOD}`}
                        {entry.ucvaOD && entry.ucvaOS && " | "}
                        {entry.ucvaOS && `UCVA OS: ${entry.ucvaOS}`}
                      </p>
                      {(entry.bcvaOD || entry.bcvaOS) && (
                        <p className="text-muted-foreground">
                          {entry.bcvaOD && `BCVA OD: ${entry.bcvaOD}`}
                          {entry.bcvaOD && entry.bcvaOS && " | "}
                          {entry.bcvaOS && `BCVA OS: ${entry.bcvaOS}`}
                        </p>
                      )}
                    </div>
                  )}
                {isExam &&
                  (entry.sphereOD ||
                    entry.sphereOS ||
                    entry.cylinderOD ||
                    entry.cylinderOS) && (
                    <div className="text-sm pt-2 border-t border-border">
                      <span className="font-semibold text-foreground">
                        الانكسار:
                      </span>
                      {entry.sphereOD && (
                        <p className="text-muted-foreground mt-1">
                          OD: {entry.sphereOD} / {entry.cylinderOD || "-"} x{" "}
                          {entry.axisOD || "-"}
                        </p>
                      )}
                      {entry.sphereOS && (
                        <p className="text-muted-foreground">
                          OS: {entry.sphereOS} / {entry.cylinderOS || "-"} x{" "}
                          {entry.axisOS || "-"}
                        </p>
                      )}
                    </div>
                  )}
                {isExam && (entry.iopOD || entry.iopOS) && (
                  <div className="text-sm pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      ضغط العين:
                    </span>
                    <p className="text-muted-foreground mt-1">
                      {entry.iopOD && `OD: ${entry.iopOD}`}
                      {entry.iopOD && entry.iopOS && " | "}
                      {entry.iopOS && `OS: ${entry.iopOS}`}
                    </p>
                  </div>
                )}

                {/* Followup fields */}
                {!isExam && (entry.vaOD || entry.vaOS) && (
                  <div className="text-sm pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      الحدة البصرية:
                    </span>
                    <p className="text-muted-foreground mt-1">
                      OD: {entry.vaOD || "-"} | OS: {entry.vaOS || "-"}
                    </p>
                  </div>
                )}
                {!isExam &&
                  (() => {
                    const hasRef = (s: any) => s && s !== "----";
                    const odS = hasRef(entry.refOD?.s);
                    const osS = hasRef(entry.refOS?.s);
                    const v = (val: any) => (val && val !== "----" ? val : "-");
                    if (!odS && !osS) return null;
                    return (
                      <div className="text-sm pt-2 border-t border-border">
                        <span className="font-semibold text-foreground">
                          الانكسار:
                        </span>
                        {odS && (
                          <p className="text-muted-foreground mt-1">
                            OD: {v(entry.refOD.s)} / {v(entry.refOD.c)} x{" "}
                            {v(entry.refOD.axis ?? entry.refOD.a)}
                          </p>
                        )}
                        {osS && (
                          <p className="text-muted-foreground">
                            OS: {v(entry.refOS.s)} / {v(entry.refOS.c)} x{" "}
                            {v(entry.refOS.axis ?? entry.refOS.a)}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                {!isExam && (entry.iopOD || entry.iopOS) && (
                  <div className="text-sm pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      ضغط العين:
                    </span>
                    <p className="text-muted-foreground mt-1">
                      {entry.iopOD && `OD: ${entry.iopOD}`}
                      {entry.iopOD && entry.iopOS && " | "}
                      {entry.iopOS && `OS: ${entry.iopOS}`}
                    </p>
                  </div>
                )}
                {!isExam && entry.notes && (
                  <div className="text-sm pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      ملاحظات:
                    </span>
                    <p className="text-muted-foreground mt-1">{entry.notes}</p>
                  </div>
                )}
                {!isExam && entry.treatment && (
                  <div className="text-sm pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      العلاج:
                    </span>
                    <p className="text-muted-foreground mt-1">
                      {entry.treatment}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {surgeries.length > 0 && (
        <Card className="border-border/80 bg-background/92 shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle>العمليات الجراحية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {surgeries.map((surgery: any) => (
              <div
                key={surgery.id}
                className="rounded-2xl border border-border bg-muted/70 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">عملية #{surgery.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(surgery.surgeryDate)}
                  </span>
                </div>
                {surgery.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {surgery.notes}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {followups.length > 0 && (
        <Card className="border-border/80 bg-background/92 shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle>متابعات ما بعد العملية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {followups.map((followup: any) => (
              <div
                key={followup.id}
                className="rounded-2xl border border-border bg-muted/70 p-4 space-y-2"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">متابعة #{followup.id}</span>
                  <span className="text-xs font-medium text-primary">
                    {formatDate(followup.followupDate)}
                  </span>
                </div>
                {(followup.visualAcuityOD || followup.visualAcuityOS) && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">
                      الإبصار:
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {followup.visualAcuityOD &&
                        `OD: ${followup.visualAcuityOD}`}
                      {followup.visualAcuityOD &&
                        followup.visualAcuityOS &&
                        " | "}
                      {followup.visualAcuityOS &&
                        `OS: ${followup.visualAcuityOS}`}
                    </span>
                  </div>
                )}
                {(followup.iopOD || followup.iopOS) && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">
                      ضغط العين:
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {followup.iopOD && `OD: ${followup.iopOD}`}
                      {followup.iopOD && followup.iopOS && " | "}
                      {followup.iopOS && `OS: ${followup.iopOS}`}
                    </span>
                  </div>
                )}
                {followup.findings && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">
                      الملاحظات:
                    </span>
                    <p className="text-muted-foreground mt-1">
                      {formatDisplayValue(followup.findings)}
                    </p>
                  </div>
                )}
                {followup.prescription && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">الوصفة:</span>
                    <p className="text-muted-foreground mt-1">
                      {formatDisplayValue(followup.prescription)}
                    </p>
                  </div>
                )}
                {followup.status && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">الحالة:</span>
                    <span className="ml-2 text-muted-foreground">
                      {followup.status}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {followupSheets.length > 0 && (
        <Card className="border-border/80 bg-background/92 shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle>ملاحظات المتابعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {followupSheets.map((sheet: any) => (
              <div
                key={sheet.id}
                className="rounded-2xl border border-border bg-muted/70 p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">ملف متابعة #{sheet.id}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {sheet.sheetType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      إصدار {sheet.version}
                    </span>
                  </div>
                </div>
                {Array.isArray(sheet.items) && sheet.items.length > 0 ? (
                  <div className="space-y-2">
                    {sheet.items.map((item: any, idx: number) => (
                      <div
                        key={item.id || idx}
                        className="border-l-2 border-primary/50 pl-3 py-1 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {item.followupName || `متابعة ${idx + 1}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.followupDate)}
                          </span>
                        </div>
                        {(item.vaOD || item.vaOS) && (
                          <p className="text-muted-foreground text-xs mt-1">
                            الحدة: {item.vaOD && `OD: ${item.vaOD}`}
                            {item.vaOD && item.vaOS && " | "}
                            {item.vaOS && `OS: ${item.vaOS}`}
                          </p>
                        )}
                        {(item.sphereOD || item.sphereOS) && (
                          <p className="text-muted-foreground text-xs">
                            الانكسار:{" "}
                            {item.sphereOD &&
                              `OD: ${item.sphereOD}/${item.cylinderOD || "-"}`}
                            {item.sphereOD && item.sphereOS && " | "}
                            {item.sphereOS &&
                              `OS: ${item.sphereOS}/${item.cylinderOS || "-"}`}
                          </p>
                        )}
                        {(item.iopOD || item.iopOS) && (
                          <p className="text-muted-foreground text-xs">
                            ضغط العين: {item.iopOD && `OD: ${item.iopOD}`}
                            {item.iopOD && item.iopOS && " | "}
                            {item.iopOS && `OS: ${item.iopOS}`}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-muted-foreground text-xs mt-1">
                            ملاحظات: {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    لا توجد بيانات
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
