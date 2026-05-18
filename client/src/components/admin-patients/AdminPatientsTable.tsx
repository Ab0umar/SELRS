import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { type PatientDraft, type PatientRow, type RowSaveState } from "@/hooks/admin-patients/adminPatientsShared";

type AdminPatientsTableProps = {
  allVisibleSelected: boolean;
  currentPage: number;
  deletePatientPending: boolean;
  deletePatientFromMssqlPending: boolean;
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
    { refetchOnWindowFocus: false, staleTime: 300000 },
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

const SERVICE_TYPE_SELECT_CONTENT = (
  <>
    <SelectItem value="consultant">استشاري</SelectItem>
    <SelectItem value="specialist">أخصائي</SelectItem>
    <SelectItem value="lasik">ليزك</SelectItem>
    <SelectItem value="external">خارجي</SelectItem>
    <SelectItem value="surgery">عمليات مركزي</SelectItem>
    <SelectItem value="surgery_external">عمليات خارجي</SelectItem>
    <SelectItem value="pentacam_c">Pentacam C</SelectItem>
    <SelectItem value="pentacam_ex">Pentacam Ex</SelectItem>
    <SelectItem value="pentacam_ex_c">Pentacam Ex.C</SelectItem>
  </>
);

type AdminPatientItemProps = {
  patient: PatientRow;
  draft: PatientDraft;
  status: RowSaveState | undefined;
  selected: boolean;
  expanded: boolean;
  manualLockEnabled: boolean;
  deletePatientPending: boolean;
  deletePatientFromMssqlPending: boolean;
  savePatientPageStatePending: boolean;
  updatePatientPending: boolean;
  serviceCodeToLabel: Map<string, string>;
  onDeleteFromMssql: (patient: PatientRow) => void;
  onDeletePatient: (patient: PatientRow) => void;
  onSavePatientRow: (patient: PatientRow) => void;
  onSetDraftField: (patient: PatientRow, field: keyof PatientDraft, value: string) => void;
  onToggleExpanded: (patientId: number) => void;
  onToggleManualLock: (patient: PatientRow) => void;
  onToggleSelectedPatient: (patientId: number, checked: boolean) => void;
};

const arePatientItemPropsEqual = (prev: AdminPatientItemProps, next: AdminPatientItemProps) =>
  prev.patient === next.patient &&
  prev.selected === next.selected &&
  prev.expanded === next.expanded &&
  prev.manualLockEnabled === next.manualLockEnabled &&
  prev.deletePatientPending === next.deletePatientPending &&
  prev.deletePatientFromMssqlPending === next.deletePatientFromMssqlPending &&
  prev.savePatientPageStatePending === next.savePatientPageStatePending &&
  prev.updatePatientPending === next.updatePatientPending &&
  prev.status?.state === next.status?.state &&
  prev.draft.fullName === next.draft.fullName &&
  prev.draft.treatingDoctor === next.draft.treatingDoctor &&
  prev.draft.serviceType === next.draft.serviceType;

const AdminPatientCard = memo(function AdminPatientCard({
  patient, draft, status, selected, expanded, manualLockEnabled, deletePatientPending, deletePatientFromMssqlPending, savePatientPageStatePending, updatePatientPending, serviceCodeToLabel, onDeleteFromMssql, onDeletePatient, onSavePatientRow, onSetDraftField, onToggleExpanded, onToggleManualLock, onToggleSelectedPatient,
}: AdminPatientItemProps) {
  const isUnsavedRow = status?.state === "unsaved" || status?.state === "error";
  return (
    <div className={cn("rounded-lg border border-border/80 bg-card p-2", isUnsavedRow ? "border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/20" : undefined)}>
      <div className="flex items-start gap-2">
        <Checkbox checked={selected} onCheckedChange={(checked) => onToggleSelectedPatient(patient.id, Boolean(checked))} className="mt-1 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">{patient.patientCode ?? "—"}</span>
            <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={() => onToggleExpanded(patient.id)} title="توسيع السجل">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Input value={draft.fullName} onChange={(event) => onSetDraftField(patient, "fullName", event.target.value)} className="rounded-lg text-right text-sm" placeholder="الاسم" />
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs">
        <div className="text-muted-foreground">الطبيب</div>
        <div className="text-foreground">
          <Input
            value={draft.treatingDoctor}
            onChange={(event) => onSetDraftField(patient, "treatingDoctor", event.target.value)}
            className="h-7 rounded-lg text-xs text-foreground"
            placeholder="اسم الطبيب"
          />
        </div>
        <div className="text-muted-foreground">نوع الخدمة</div>
        <div className="text-foreground">
          <Select value={draft.serviceType} onValueChange={(value) => onSetDraftField(patient, "serviceType", value)}>
            <SelectTrigger className="h-7 rounded-lg text-xs text-foreground"><SelectValue placeholder="نوع الشيت" /></SelectTrigger>
            <SelectContent>{SERVICE_TYPE_SELECT_CONTENT}</SelectContent>
          </Select>
        </div>
      </div>
      {expanded ? (
        <div className="mt-2 space-y-2 rounded-xl border border-border/70 bg-muted/20 p-2">
          <AdminPatientTransactions patientId={patient.id} serviceCodeToLabel={serviceCodeToLabel} />
          <Button type="button" variant="outline" size="sm" className="w-full rounded-lg text-xs" disabled={deletePatientFromMssqlPending} onClick={() => onDeleteFromMssql(patient)}>حذف من MSSQL</Button>
        </div>
      ) : null}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" className={manualLockEnabled ? "rounded-lg border-orange-200 bg-orange-500 text-xs font-bold text-white shadow-sm hover:bg-orange-600" : "rounded-lg border-amber-200 bg-amber-100 text-xs font-bold text-amber-900 hover:bg-amber-200"} onClick={() => onToggleManualLock(patient)} disabled={savePatientPageStatePending}>
          {manualLockEnabled ? <>ON <Lock className="ms-1 h-3 w-3" aria-hidden /></> : <>OFF <LockOpen className="ms-1 h-3 w-3" aria-hidden /></>}
        </Button>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-primary/30 bg-primary/5 px-3 text-xs text-primary hover:bg-primary/10" disabled={updatePatientPending} onClick={() => onSavePatientRow(patient)}>
            {status?.state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />} حفظ
          </Button>
          <Button variant="destructive" size="sm" className="rounded-lg px-3 text-xs" onClick={() => onDeletePatient(patient)} disabled={deletePatientPending}><Trash2 className="me-1 h-3.5 w-3.5" aria-hidden />حذف</Button>
        </div>
      </div>
    </div>
  );
}, arePatientItemPropsEqual);

const AdminPatientRow = memo(function AdminPatientRow({
  patient, draft, status, selected, expanded, manualLockEnabled, deletePatientPending, deletePatientFromMssqlPending, savePatientPageStatePending, updatePatientPending, serviceCodeToLabel, onDeleteFromMssql, onDeletePatient, onSavePatientRow, onSetDraftField, onToggleExpanded, onToggleManualLock, onToggleSelectedPatient,
}: AdminPatientItemProps) {
  const isUnsavedRow = status?.state === "unsaved" || status?.state === "error";
  return (
    <Fragment>
      <TableRow className={cn("border-border/70", isUnsavedRow ? "bg-amber-50/70 dark:bg-amber-950/20" : undefined)}>
        <TableCell className="py-3 text-center"><Checkbox checked={selected} onCheckedChange={(checked) => onToggleSelectedPatient(patient.id, Boolean(checked))} /></TableCell>
        <TableCell className="tabular-nums text-muted-foreground" dir="ltr">{patient.patientCode ?? "—"}</TableCell>
        <TableCell>
          <div className="flex flex-col items-stretch gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-lg" onClick={() => onToggleExpanded(patient.id)} title="توسيع السجل">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
              <Input value={draft.fullName} onChange={(event) => onSetDraftField(patient, "fullName", event.target.value)} className="min-w-0 rounded-lg text-right" />
            </div>
            {expanded ? <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2"><AdminPatientTransactions patientId={patient.id} serviceCodeToLabel={serviceCodeToLabel} /><Button type="button" variant="outline" size="sm" className="w-full rounded-lg text-xs" disabled={deletePatientFromMssqlPending} onClick={() => onDeleteFromMssql(patient)}>حذف من MSSQL</Button></div> : null}
          </div>
        </TableCell>
        <TableCell className="min-w-[210px]"><Input value={draft.treatingDoctor} onChange={(event) => onSetDraftField(patient, "treatingDoctor", event.target.value)} className="rounded-lg text-right" placeholder="اسم الطبيب" /></TableCell>
        <TableCell><Select value={draft.serviceType} onValueChange={(value) => onSetDraftField(patient, "serviceType", value)}><SelectTrigger className="min-w-[150px] rounded-lg"><SelectValue placeholder="نوع الشيت" /></SelectTrigger><SelectContent>{SERVICE_TYPE_SELECT_CONTENT}</SelectContent></Select></TableCell>
        <TableCell><Button type="button" size="sm" variant="outline" className={manualLockEnabled ? "rounded-lg border-orange-200 bg-orange-500 font-bold text-white shadow-sm hover:bg-orange-600" : "rounded-lg border-amber-200 bg-amber-100 font-bold text-amber-900 hover:bg-amber-200"} onClick={() => onToggleManualLock(patient)} disabled={savePatientPageStatePending}>{manualLockEnabled ? <>ON <Lock className="ms-2 h-3.5 w-3.5" aria-hidden /></> : <>OFF <LockOpen className="ms-2 h-3.5 w-3.5" aria-hidden /></>}</Button></TableCell>
        <TableCell><div className="flex flex-col items-end gap-2"><div className="flex flex-wrap items-center gap-2"><Button variant="outline" className="gap-2 rounded-lg border-primary/30 bg-primary/5 px-4 text-primary hover:bg-primary/10" disabled={updatePatientPending} onClick={() => onSavePatientRow(patient)}>{status?.state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}حفظ</Button><Button variant="destructive" size="sm" className="rounded-lg px-4" onClick={() => onDeletePatient(patient)} disabled={deletePatientPending}><Trash2 className="me-2 h-4 w-4" aria-hidden />حذف</Button></div></div></TableCell>
      </TableRow>
    </Fragment>
  );
}, arePatientItemPropsEqual);

function AdminPatientsTableComponent({
  allVisibleSelected,
  currentPage,
  deletePatientPending,
  deletePatientFromMssqlPending,
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
  const colSpan = 8;
  const desktopTableRef = useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 639px)").matches,
  );
  const [mobileCardPage, setMobileCardPage] = useState(1);
  const [tableScrollMargin, setTableScrollMargin] = useState(0);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobileViewport(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setMobileCardPage(1);
  }, [visiblePatients.length]);
  useEffect(() => {
    if (isMobileViewport) return;
    const hostScrollElement = desktopTableRef.current?.closest("main");
    setScrollElement(hostScrollElement instanceof HTMLElement ? hostScrollElement : null);
    const syncMargin = () => {
      const element = desktopTableRef.current;
      const scroller = hostScrollElement instanceof HTMLElement ? hostScrollElement : null;
      if (!element || !scroller) return;
      const next = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      setTableScrollMargin(next);
    };
    syncMargin();
    hostScrollElement?.addEventListener("scroll", syncMargin);
    window.addEventListener("resize", syncMargin);
    return () => {
      hostScrollElement?.removeEventListener("scroll", syncMargin);
      window.removeEventListener("resize", syncMargin);
    };
  }, [isMobileViewport, visiblePatients.length, pageSize]);

  const rowVirtualizer = useVirtualizer({
    count: visiblePatients.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 74,
    overscan: 8,
    scrollMargin: tableScrollMargin,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const effectiveScrollMargin = rowVirtualizer.options.scrollMargin ?? 0;
  const paddingTop = virtualRows.length > 0 ? Math.max(0, virtualRows[0].start - effectiveScrollMargin) : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const MOBILE_CARDS_PER_PAGE = 20;
  const mobileCardsTotalPages = Math.ceil(visiblePatients.length / MOBILE_CARDS_PER_PAGE);
  const mobileCardsStartIdx = (mobileCardPage - 1) * MOBILE_CARDS_PER_PAGE;
  const mobileCardsEndIdx = Math.min(mobileCardsStartIdx + MOBILE_CARDS_PER_PAGE, visiblePatients.length);
  const paginatedMobileCards = visiblePatients.slice(mobileCardsStartIdx, mobileCardsEndIdx);

  return (
    <>
      {/* Mobile cards */}
      {isMobileViewport ? (
      <div className="space-y-4" dir="rtl">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3" dir="rtl">
          {patientsLoading ? (
            <div className="col-span-full py-10 text-center text-muted-foreground">جاري تحميل المرضى…</div>
          ) : visiblePatients.length === 0 ? (
            <div className="col-span-full py-10 text-center text-muted-foreground">لا توجد نتائج مطابقة.</div>
          ) : (
            paginatedMobileCards.map((patient) => {
            const draft = getDraft(patient);
            const rowKey = String(patient.__rowKey ?? patient.id);
            const status = rowSaveState[rowKey];
            return (
              <AdminPatientCard
                key={rowKey}
                patient={patient}
                draft={draft}
                status={status}
                selected={selectedPatients.has(patient.id)}
                expanded={isExpanded(patient.id)}
                manualLockEnabled={isManualLockEnabled(patient)}
                deletePatientPending={deletePatientPending}
                deletePatientFromMssqlPending={deletePatientFromMssqlPending}
                savePatientPageStatePending={savePatientPageStatePending}
                updatePatientPending={updatePatientPending}
                serviceCodeToLabel={serviceCodeToLabel}
                onDeleteFromMssql={onDeleteFromMssql}
                onDeletePatient={onDeletePatient}
                onSavePatientRow={onSavePatientRow}
                onSetDraftField={onSetDraftField}
                onToggleExpanded={onToggleExpanded}
                onToggleManualLock={onToggleManualLock}
                onToggleSelectedPatient={onToggleSelectedPatient}
              />
            );
            })
          )}
        </div>
        {visiblePatients.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2" dir="rtl">
            <div className="text-sm tabular-nums text-muted-foreground">صفحة {mobileCardPage} من {mobileCardsTotalPages}</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setMobileCardPage(Math.max(1, mobileCardPage - 1))}
                disabled={mobileCardPage === 1}
              >
                السابق
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setMobileCardPage(Math.min(mobileCardsTotalPages, mobileCardPage + 1))}
                disabled={mobileCardPage === mobileCardsTotalPages}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>
      ) : null}

      {/* Desktop table */}
      {!isMobileViewport ? (
      <div ref={desktopTableRef} className="w-full rounded-xl border border-border" dir="rtl">
        <Table className="w-full table-auto text-right">
          <TableHeader>
            <TableRow className="sticky top-0 z-10 border-b bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 py-4 text-center">
                <Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => onToggleSelectAllVisible(Boolean(checked))} />
              </TableHead>
              <TableHead className="py-4 font-semibold">الكود</TableHead>
              <TableHead className="min-w-[200px] py-4 font-semibold">الاسم</TableHead>
              <TableHead className="min-w-[200px] py-4 font-semibold">الطبيب</TableHead>
              <TableHead className="min-w-[170px] py-4 font-semibold">نوع الخدمة</TableHead>
              <TableHead className="py-4 font-semibold">القفل</TableHead>
              <TableHead className="min-w-[160px] py-4 font-semibold">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
        </Table>

        <div className="w-full overflow-x-auto">
          <Table className="w-full table-auto text-right">
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
            {!patientsLoading && visiblePatients.length > 0 ? (
              <>
                {paddingTop > 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="p-0">
                      <div style={{ height: paddingTop }} />
                    </TableCell>
                  </TableRow>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const patient = visiblePatients[virtualRow.index];
                  if (!patient) return null;
                  const draft = getDraft(patient);
                  const rowKey = String(patient.__rowKey ?? patient.id);
                  const status = rowSaveState[rowKey];
                  return (
                    <AdminPatientRow
                      key={rowKey}
                      patient={patient}
                      draft={draft}
                      status={status}
                      selected={selectedPatients.has(patient.id)}
                      expanded={isExpanded(patient.id)}
                      manualLockEnabled={isManualLockEnabled(patient)}
                      deletePatientPending={deletePatientPending}
                      deletePatientFromMssqlPending={deletePatientFromMssqlPending}
                      savePatientPageStatePending={savePatientPageStatePending}
                      updatePatientPending={updatePatientPending}
                      serviceCodeToLabel={serviceCodeToLabel}
                      onDeleteFromMssql={onDeleteFromMssql}
                      onDeletePatient={onDeletePatient}
                      onSavePatientRow={onSavePatientRow}
                      onSetDraftField={onSetDraftField}
                      onToggleExpanded={onToggleExpanded}
                      onToggleManualLock={onToggleManualLock}
                      onToggleSelectedPatient={onToggleSelectedPatient}
                    />
                  );
                })}
                {paddingBottom > 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="p-0">
                      <div style={{ height: paddingBottom }} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </>
            ) : null}
          </TableBody>
        </Table>
        </div>
      </div>
      ) : null}

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

export const AdminPatientsTable = memo(AdminPatientsTableComponent);
