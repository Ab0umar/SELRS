import { Fragment } from "react";
import {
  ChevronDown,
  ChevronUp,
  Lock,
  LockOpen,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { type PatientDraft, type PatientRow, type PatientStatus, type RowSaveState } from "@/hooks/admin-patients/adminPatientsShared";

type AdminPatientsTableProps = {
  allVisibleSelected: boolean;
  currentPage: number;
  deletePatientPending: boolean;
  deletePatientFromMssqlPending: boolean;
  doctorSelectOptions: string[];
  getDraft: (patient: PatientRow) => PatientDraft;
  hasMore: boolean;
  isExpanded: (patientId: number) => boolean;
  isManualLockEnabled: (patient: PatientRow) => boolean;
  nextCursor: unknown;
  onDeleteFromMssql: (patient: PatientRow) => void;
  onDeletePatient: (patient: PatientRow) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSavePatientRow: (patient: PatientRow) => void;
  onSetDraftField: (patient: PatientRow, field: keyof PatientDraft, value: string) => void;
  onToggleExpanded: (patientId: number) => void;
  onToggleManualLock: (patient: PatientRow) => void;
  onToggleSelectAllVisible: (checked: boolean) => void;
  onToggleSelectedPatient: (patientId: number, checked: boolean) => void;
  pageSize: number;
  patientsLoading: boolean;
  rowSaveState: Record<string, RowSaveState>;
  savePatientPageStatePending: boolean;
  selectedPatients: Set<number>;
  serviceCodeToLabel: Map<string, string>;
  setPageSize: (value: number) => void;
  updatePatientPending: boolean;
  visiblePatients: PatientRow[];
};

function AdminPatientTransactions({ patientId, serviceCodeToLabel }: { patientId: number; serviceCodeToLabel: Map<string, string> }) {
  const entriesQuery = trpc.medical.getPatientServiceEntries.useQuery(
    { patientId },
    { refetchOnWindowFocus: false, staleTime: 30_000 },
  );
  const rows = Array.isArray(entriesQuery.data) ? entriesQuery.data : [];

  if (entriesQuery.isLoading) return <div className="text-xs text-muted-foreground">جاري التحميل…</div>;
  if (rows.length === 0) return <div className="text-xs text-muted-foreground">لا توجد تعاملات</div>;

  return (
    <div className="space-y-1 text-right text-xs" dir="rtl">
      {rows.map((entry) => {
        const rawEntry = entry as unknown as {
          id?: string | number;
          serviceCode?: string;
          serviceName?: string | null;
          serviceDate?: string | Date | null;
        };
        const code = String(rawEntry.serviceCode ?? "").trim().toLowerCase();
        const name = String(serviceCodeToLabel.get(code) ?? rawEntry.serviceName ?? code ?? "-").trim();
        const date = rawEntry.serviceDate ? new Date(rawEntry.serviceDate).toLocaleDateString("ar-EG") : "";
        return (
          <div key={String(rawEntry.id ?? `${patientId}-${code}`)} className="rounded-lg border bg-card p-2">
            <div className="flex flex-col items-end gap-0.5" dir="rtl">
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground">({code || "-"})</span>
              <span>{date || "-"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_LABEL_AR: Record<PatientStatus, string> = {
  new: "جديد",
  followup: "متابعة",
  archived: "أرشيف",
};

export function AdminPatientsTable({
  allVisibleSelected,
  currentPage,
  deletePatientPending,
  deletePatientFromMssqlPending,
  doctorSelectOptions,
  getDraft,
  hasMore,
  isExpanded,
  isManualLockEnabled,
  nextCursor,
  onDeleteFromMssql,
  onDeletePatient,
  onNextPage,
  onPreviousPage,
  onSavePatientRow,
  onSetDraftField,
  onToggleExpanded,
  onToggleManualLock,
  onToggleSelectAllVisible,
  onToggleSelectedPatient,
  pageSize,
  patientsLoading,
  rowSaveState,
  savePatientPageStatePending,
  selectedPatients,
  serviceCodeToLabel,
  setPageSize,
  updatePatientPending,
  visiblePatients,
}: AdminPatientsTableProps) {
  const colSpan = 10;

  return (
    <>
      {/* Mobile cards */}
      <div className="grid grid-cols-2 gap-2 sm:hidden" dir="rtl">
        {patientsLoading ? (
          <div className="py-10 text-center text-muted-foreground">جاري تحميل المرضى…</div>
        ) : visiblePatients.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">لا توجد نتائج مطابقة.</div>
        ) : (
          visiblePatients.map((patient) => {
            const draft = getDraft(patient);
            const rowKey = String(patient.__rowKey ?? patient.id);
            const status = rowSaveState[rowKey];
            const isUnsavedRow = status?.state === "unsaved" || status?.state === "error";
            const doctorChoices = [...new Set([draft.treatingDoctor.trim(), ...doctorSelectOptions].filter(Boolean))].sort((a, b) =>
              a.localeCompare(b, "ar"),
            );
            const statusTone =
              draft.status === "followup"
                ? "border-amber-300/70 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                : draft.status === "archived"
                  ? "border-slate-300/70 bg-muted text-muted-foreground"
                  : "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100";

            return (
              <div
                key={rowKey}
                className={cn(
                  "rounded-lg border border-border/80 bg-card p-2",
                  isUnsavedRow ? "border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/20" : undefined,
                )}
              >
                {/* Header row: checkbox + code + name */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedPatients.has(patient.id)}
                    onCheckedChange={(checked) => onToggleSelectedPatient(patient.id, Boolean(checked))}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">{patient.patientCode ?? "—"}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0 rounded-lg"
                        onClick={() => onToggleExpanded(patient.id)}
                        title="توسيع السجل"
                      >
                        {isExpanded(patient.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <Input
                      value={draft.fullName}
                      onChange={(event) => onSetDraftField(patient, "fullName", event.target.value)}
                      className="rounded-lg text-right text-sm"
                      placeholder="الاسم"
                    />
                  </div>
                </div>

                {/* Info grid */}
                <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                  <div className="text-muted-foreground">الطبيب</div>
                  <div>
                    <Select
                      value={draft.treatingDoctor || "__empty__"}
                      onValueChange={(value) => onSetDraftField(patient, "treatingDoctor", value === "__empty__" ? "" : value)}
                    >
                      <SelectTrigger className="h-7 rounded-lg text-xs">
                        <SelectValue placeholder="اختر طبيباً" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty__">—</SelectItem>
                        {doctorChoices.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-muted-foreground">نوع الخدمة</div>
                  <div>
                    <Select value={draft.serviceType} onValueChange={(value) => onSetDraftField(patient, "serviceType", value)}>
                      <SelectTrigger className="h-7 rounded-lg text-xs">
                        <SelectValue placeholder="نوع الشيت" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultant">استشاري</SelectItem>
                        <SelectItem value="specialist">أخصائي</SelectItem>
                        <SelectItem value="lasik">ليزك</SelectItem>
                        <SelectItem value="external">خارجي</SelectItem>
                        <SelectItem value="surgery">عمليات مركزي</SelectItem>
                        <SelectItem value="surgery_external">عمليات خارجي</SelectItem>
                        <SelectItem value="pentacam_c">Pentacam C</SelectItem>
                        <SelectItem value="pentacam_ex">Pentacam Ex</SelectItem>
                        <SelectItem value="pentacam_ex_c">Pentacam Ex.C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-muted-foreground">الحالة</div>
                  <div>
                    <Select value={draft.status} onValueChange={(v) => onSetDraftField(patient, "status", v as PatientStatus)}>
                      <SelectTrigger className={cn("h-7 rounded-lg text-xs font-semibold", statusTone)}>
                        <SelectValue>{STATUS_LABEL_AR[draft.status]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STATUS_LABEL_AR) as Array<[PatientStatus, string]>).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Expanded transactions */}
                {isExpanded(patient.id) ? (
                  <div className="mt-2 space-y-2 rounded-xl border border-border/70 bg-muted/20 p-2">
                    <AdminPatientTransactions patientId={patient.id} serviceCodeToLabel={serviceCodeToLabel} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-lg text-xs"
                      disabled={deletePatientFromMssqlPending}
                      onClick={() => onDeleteFromMssql(patient)}
                    >
                      حذف من MSSQL
                    </Button>
                  </div>
                ) : null}

                {/* Actions row */}
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={
                      isManualLockEnabled(patient)
                        ? "rounded-lg border-orange-200 bg-orange-500 text-xs font-bold text-white shadow-sm hover:bg-orange-600"
                        : "rounded-lg border-amber-200 bg-amber-100 text-xs font-bold text-amber-900 hover:bg-amber-200"
                    }
                    onClick={() => onToggleManualLock(patient)}
                    disabled={savePatientPageStatePending}
                  >
                    {isManualLockEnabled(patient) ? (
                      <>ON <Lock className="ms-1 h-3 w-3" aria-hidden /></>
                    ) : (
                      <>OFF <LockOpen className="ms-1 h-3 w-3" aria-hidden /></>
                    )}
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-lg border-primary/30 bg-primary/5 px-3 text-xs text-primary hover:bg-primary/10"
                      disabled={updatePatientPending}
                      onClick={() => onSavePatientRow(patient)}
                    >
                      {status?.state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                      حفظ
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-lg px-3 text-xs"
                      onClick={() => onDeletePatient(patient)}
                      disabled={deletePatientPending}
                    >
                      <Trash2 className="me-1 h-3.5 w-3.5" aria-hidden />
                      حذف
                    </Button>
                  </div>
                </div>
                {status?.state === "unsaved" ? <div className="mt-1 text-right text-xs text-amber-600">لم يُحفَظ</div> : null}
                {status?.state === "saving" ? <div className="mt-1 text-right text-xs text-blue-600">جاري الحفظ…</div> : null}
                {status?.state === "saved" ? <div className="mt-1 text-right text-xs text-secondary">تم الحفظ</div> : null}
                {status?.state === "error" ? <div className="mt-1 text-right text-xs text-red-600">خطأ</div> : null}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border sm:block" dir="rtl">
        <Table className="text-right">
          <TableHeader>
            <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 py-4 text-center">
                <Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => onToggleSelectAllVisible(Boolean(checked))} />
              </TableHead>
              <TableHead className="py-4 font-semibold">الكود</TableHead>
              <TableHead className="min-w-[200px] py-4 font-semibold">الاسم</TableHead>
              <TableHead className="min-w-[200px] py-4 font-semibold">الطبيب</TableHead>
              <TableHead className="py-4 font-semibold">تاريخ الميلاد</TableHead>
              <TableHead className="w-[88px] py-4 font-semibold">العمر</TableHead>
              <TableHead className="min-w-[170px] py-4 font-semibold">نوع الخدمة</TableHead>
              <TableHead className="py-4 font-semibold">الحالة</TableHead>
              <TableHead className="py-4 font-semibold">القفل</TableHead>
              <TableHead className="min-w-[160px] py-4 font-semibold">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patientsLoading ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-12 text-center text-muted-foreground">
                  جاري تحميل المرضى…
                </TableCell>
              </TableRow>
            ) : null}
            {!patientsLoading && visiblePatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-12 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة.
                </TableCell>
              </TableRow>
            ) : null}
            {!patientsLoading
              ? visiblePatients.map((patient) => {
                  const draft = getDraft(patient);
                  const rowKey = String(patient.__rowKey ?? patient.id);
                  const status = rowSaveState[rowKey];
                  const isUnsavedRow = status?.state === "unsaved" || status?.state === "error";
                  const doctorChoices = [...new Set([draft.treatingDoctor.trim(), ...doctorSelectOptions].filter(Boolean))].sort((a, b) =>
                    a.localeCompare(b, "ar"),
                  );

                  const statusTone =
                    draft.status === "followup"
                      ? "border-amber-300/70 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      : draft.status === "archived"
                        ? "border-slate-300/70 bg-muted text-muted-foreground"
                        : "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100";

                  return (
                    <Fragment key={rowKey}>
                      <TableRow className={cn("border-border/70", isUnsavedRow ? "bg-amber-50/70 dark:bg-amber-950/20" : undefined)}>
                        <TableCell className="py-3 text-center">
                          <Checkbox
                            checked={selectedPatients.has(patient.id)}
                            onCheckedChange={(checked) => onToggleSelectedPatient(patient.id, Boolean(checked))}
                          />
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground" dir="ltr">
                          {patient.patientCode ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-stretch gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg"
                                onClick={() => onToggleExpanded(patient.id)}
                                title="توسيع السجل"
                              >
                                {isExpanded(patient.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <Input
                                value={draft.fullName}
                                onChange={(event) => onSetDraftField(patient, "fullName", event.target.value)}
                                className="min-w-0 rounded-lg text-right"
                              />
                            </div>
                            {isExpanded(patient.id) ? (
                              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2">
                                <AdminPatientTransactions patientId={patient.id} serviceCodeToLabel={serviceCodeToLabel} />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full rounded-lg text-xs"
                                  disabled={deletePatientFromMssqlPending}
                                  onClick={() => onDeleteFromMssql(patient)}
                                >
                                  حذف من MSSQL
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[210px]">
                          <Select
                            value={draft.treatingDoctor || "__empty__"}
                            onValueChange={(value) =>
                              onSetDraftField(patient, "treatingDoctor", value === "__empty__" ? "" : value)
                            }
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="اختر طبيباً" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__empty__">—</SelectItem>
                              {doctorChoices.map((name) => (
                                <SelectItem key={name} value={name}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell dir="ltr" className="tabular-nums">
                          <Input
                            type="text"
                            value={draft.dateOfBirth}
                            onChange={(event) => onSetDraftField(patient, "dateOfBirth", event.target.value)}
                            className="w-[136px] rounded-lg"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={draft.age}
                            onChange={(event) => onSetDraftField(patient, "age", event.target.value)}
                            className="w-[72px] rounded-lg tabular-nums text-center"
                            dir="ltr"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={draft.serviceType} onValueChange={(value) => onSetDraftField(patient, "serviceType", value)}>
                            <SelectTrigger className="min-w-[150px] rounded-lg">
                              <SelectValue placeholder="نوع الشيت" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="consultant">استشاري</SelectItem>
                              <SelectItem value="specialist">أخصائي</SelectItem>
                              <SelectItem value="lasik">ليزك</SelectItem>
                              <SelectItem value="external">خارجي</SelectItem>
                              <SelectItem value="surgery">عمليات مركزي</SelectItem>
                              <SelectItem value="surgery_external">عمليات خارجي</SelectItem>
                              <SelectItem value="pentacam_c">Pentacam C</SelectItem>
                              <SelectItem value="pentacam_ex">Pentacam Ex</SelectItem>
                              <SelectItem value="pentacam_ex_c">Pentacam Ex.C</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <Select value={draft.status} onValueChange={(v) => onSetDraftField(patient, "status", v as PatientStatus)}>
                            <SelectTrigger className={cn("h-10 justify-center rounded-lg font-semibold", statusTone)}>
                              <SelectValue>{STATUS_LABEL_AR[draft.status]}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(STATUS_LABEL_AR) as Array<[PatientStatus, string]>).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={
                              isManualLockEnabled(patient)
                                ? "rounded-lg border-orange-200 bg-orange-500 font-bold text-white shadow-sm hover:bg-orange-600"
                                : "rounded-lg border-amber-200 bg-amber-100 font-bold text-amber-900 hover:bg-amber-200"
                            }
                            onClick={() => onToggleManualLock(patient)}
                            disabled={savePatientPageStatePending}
                          >
                            {isManualLockEnabled(patient) ? (
                              <>
                                ON <Lock className="ms-2 h-3.5 w-3.5" aria-hidden />
                              </>
                            ) : (
                              <>
                                OFF <LockOpen className="ms-2 h-3.5 w-3.5" aria-hidden />
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                className="gap-2 rounded-lg border-primary/30 bg-primary/5 px-4 text-primary hover:bg-primary/10"
                                disabled={updatePatientPending}
                                onClick={() => onSavePatientRow(patient)}
                              >
                                {status?.state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                                حفظ
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-lg px-4"
                                onClick={() => onDeletePatient(patient)}
                                disabled={deletePatientPending}
                              >
                                <Trash2 className="me-2 h-4 w-4" aria-hidden />
                                حذف
                              </Button>
                            </div>
                            {status?.state === "unsaved" ? (
                              <span className="text-xs text-amber-600">لم يُحفَظ</span>
                            ) : null}
                            {status?.state === "saving" ? (
                              <span className="text-xs text-blue-600">جاري الحفظ…</span>
                            ) : null}
                            {status?.state === "saved" ? (
                              <span className="text-xs text-secondary">تم الحفظ</span>
                            ) : null}
                            {status?.state === "error" ? (
                              <span className="text-xs text-red-600">خطأ</span>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })
              : null}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2" dir="rtl">
        <div className="text-sm tabular-nums text-muted-foreground">صفحة {currentPage}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[120px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 للصفحة</SelectItem>
              <SelectItem value="50">50 للصفحة</SelectItem>
              <SelectItem value="100">100 للصفحة</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" className="rounded-lg" onClick={onPreviousPage} disabled={currentPage === 1}>
            السابق
          </Button>
          <Button type="button" variant="outline" className="rounded-lg" onClick={onNextPage} disabled={!hasMore || !nextCursor}>
            التالي
          </Button>
        </div>
      </div>
    </>
  );
}
