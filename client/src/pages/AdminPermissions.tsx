import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  PAGE_PERMISSION_DEFINITIONS as PAGE_PERMISSIONS,
  PERMISSION_SECTIONS,
  type PermissionSection,
} from "@/lib/page-permissions";
import {
  getAccessLevelCopy,
  getWriteAccessColumns,
  type PermissionAccessLevel,
} from "./admin-permissions-ui";

type TeamRole =
  | "admin"
  | "manager"
  | "accountant"
  | "doctor"
  | "nurse"
  | "technician"
  | "reception";

type AccessLevel = PermissionAccessLevel;
type TeamPermissionsMap = Record<TeamRole, string[]>;

const DEFAULT_TEAM_PERMISSIONS: TeamPermissionsMap = {
  admin: [],
  manager: [],
  accountant: [],
  doctor: [],
  nurse: [],
  technician: [],
  reception: [],
};

const ROLE_LABELS_AR: Record<TeamRole, string> = {
  admin: "مسؤول",
  manager: "مدير",
  accountant: "محاسب",
  doctor: "طبيب",
  nurse: "ممرض",
  technician: "فني",
  reception: "استقبال",
};

/** ترتيب عرض يشبه البروتو: أدوار التشغيل ثم الدعم ثم المسؤول */
const ROLE_UI_ORDER: TeamRole[] = [
  "manager",
  "doctor",
  "reception",
  "nurse",
  "technician",
  "accountant",
  "admin",
];

const ROLE_FILTER_OPTIONS = ROLE_UI_ORDER.map((r) => ({
  value: r,
  label: ROLE_LABELS_AR[r],
}));
const ACCESS_LEVELS: AccessLevel[] = ["none", "r", "rw"];

function getLevel(permissions: string[], pageId: string): AccessLevel {
  const rw = permissions.find((e) => e === `${pageId}:rw`);
  if (rw) return "rw";
  const r = permissions.find((e) => e === `${pageId}:r` || e === pageId);
  if (r) return "r";
  return "none";
}

function setLevel(
  permissions: string[],
  pageId: string,
  level: AccessLevel,
): string[] {
  const filtered = permissions.filter(
    (e) => e !== pageId && e !== `${pageId}:r` && e !== `${pageId}:rw`,
  );
  if (level === "r") return [...filtered, pageId, `${pageId}:r`];
  if (level === "rw") return [...filtered, pageId, `${pageId}:rw`];
  return filtered;
}

function normalizePermissionsSignature(value: TeamPermissionsMap): string {
  return JSON.stringify(
    ROLE_UI_ORDER.reduce<Record<string, string[]>>((acc, role) => {
      acc[role] = [...(value[role] ?? [])].sort();
      return acc;
    }, {}),
  );
}

function PermissionLevelButton({
  level,
  selected,
  compact = false,
  onClick,
}: {
  level: AccessLevel;
  selected: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const copy = getAccessLevelCopy(level);
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={copy.detail}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-center text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:border-border",
        compact ? "min-h-8 px-2 py-1" : "sm:min-h-9",
      )}
    >
      {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
      <span>{copy.label}</span>
    </button>
  );
}

export default function AdminPermissions() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [permissions, setPermissions] = useState<TeamPermissionsMap>(
    DEFAULT_TEAM_PERMISSIONS,
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TeamRole>("manager");
  const [selectedSection, setSelectedSection] = useState<PermissionSection>(
    PERMISSION_SECTIONS[0],
  );

  const permissionsQuery = trpc.medical.getTeamPermissions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const saveMutation = trpc.medical.setTeamPermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث صلاحيات الأدوار.");
      void utils.medical.getTeamPermissions.invalidate();
      void utils.medical.getMyPermissions.invalidate();
    },
    onError: () => {
      toast.error("تعذر حفظ الصلاحيات.");
    },
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (!permissionsQuery.data) return;
    setPermissions({
      admin: permissionsQuery.data.admin ?? [],
      manager: permissionsQuery.data.manager ?? [],
      accountant: permissionsQuery.data.accountant ?? [],
      doctor: permissionsQuery.data.doctor ?? [],
      nurse: permissionsQuery.data.nurse ?? [],
      technician: permissionsQuery.data.technician ?? [],
      reception: permissionsQuery.data.reception ?? [],
    });
  }, [permissionsQuery.data]);

  const serverPermissions = useMemo<TeamPermissionsMap>(
    () => ({
      admin: permissionsQuery.data?.admin ?? [],
      manager: permissionsQuery.data?.manager ?? [],
      accountant: permissionsQuery.data?.accountant ?? [],
      doctor: permissionsQuery.data?.doctor ?? [],
      nurse: permissionsQuery.data?.nurse ?? [],
      technician: permissionsQuery.data?.technician ?? [],
      reception: permissionsQuery.data?.reception ?? [],
    }),
    [permissionsQuery.data],
  );

  if (!isAuthenticated || user?.role !== "admin") return null;

  const rolePerms = permissions[selectedRole] ?? [];
  const sectionPerms = PAGE_PERMISSIONS.filter(
    (p) => p.group === selectedSection,
  );
  const hasUnsavedChanges =
    normalizePermissionsSignature(permissions) !==
    normalizePermissionsSignature(serverPermissions);

  const handleChangeLevel = (pageId: string, level: AccessLevel) => {
    setPermissions((prev) => ({
      ...prev,
      [selectedRole]: setLevel(prev[selectedRole] ?? [], pageId, level),
    }));
  };

  const SECTION_FILTER_OPTIONS = PERMISSION_SECTIONS.map((s) => ({
    value: s,
    label: s,
  }));
  const writeAccessColumns = getWriteAccessColumns();

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-5 pb-10 text-right"
      dir="rtl"
    >
      <PageHeader
        title="الصلاحيات"
        subtitle="إدارة صلاحيات الوصول للأدوار المختلفة في النظام"
        icon={<Shield className="h-5 w-5 text-primary" />}
        action={
          <Button
            type="button"
            className="selrs-gradient-btn text-white h-9 px-6 font-bold shadow-sm"
            onClick={() => void saveMutation.mutateAsync(permissions)}
            disabled={
              saveMutation.isPending ||
              permissionsQuery.isLoading ||
              !hasUnsavedChanges
            }
          >
            {saveMutation.isPending ? "جاري الحفظ…" : "حفظ التعديلات"}
          </Button>
        }
      />

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="space-y-1 border-b border-border/60 bg-muted/5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-black">
                  مصفوفة الوصول: {ROLE_LABELS_AR[selectedRole]}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold h-5 bg-background">
                  {SECTION_FILTER_OPTIONS.find(o => o.value === selectedSection)?.label}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                حدد مستوى الوصول لكل صفحة (قراءة فقط أو تعديل كامل).
              </CardDescription>
            </div>
            <div
              className={cn(
                "w-fit rounded-lg border px-3 py-1 text-[11px] font-bold shadow-sm",
                hasUnsavedChanges
                  ? "border-amber-200 bg-amber-50 text-amber-700 animate-pulse"
                  : "border-border/60 bg-muted/40 text-muted-foreground",
              )}
            >
              {hasUnsavedChanges ? "توجد تغييرات غير محفوظة" : "البيانات محفوظة ومزامنة"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-12 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Role selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">الدور الوظيفي المستهدف</span>
                  <FilterBar
                    filters={ROLE_FILTER_OPTIONS}
                    selected={selectedRole}
                    onSelect={(v) => setSelectedRole(v as TeamRole)}
                    className="max-w-full"
                  />
                </div>

                {/* Section tabs */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">نطاق مراجعة الصفحات</span>
                  <FilterBar
                    filters={SECTION_FILTER_OPTIONS}
                    selected={selectedSection}
                    onSelect={(v) => setSelectedSection(v as PermissionSection)}
                    className="max-w-full"
                  />
                </div>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {sectionPerms.map((perm) => {
                const level = getLevel(rolePerms, perm.id);
                return (
                  <div
                    key={perm.id}
                    className="rounded-lg border border-border/80 bg-card px-3 py-3"
                    dir="rtl"
                  >
                    <div className="mb-3 space-y-1">
                      <div className="font-medium leading-snug">{perm.label}</div>
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        {getAccessLevelCopy(level).detail}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {ACCESS_LEVELS.map((nextLevel) => (
                        <PermissionLevelButton
                          key={nextLevel}
                          level={nextLevel}
                          selected={level === nextLevel}
                          onClick={() => handleChangeLevel(perm.id, nextLevel)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="lg:col-span-12 hidden overflow-hidden rounded-xl border border-border/80 bg-background sm:block">
              <Table dir="rtl" className="min-w-[760px] text-right text-sm">
                <TableHeader className="sticky top-0 z-10 bg-sky-50/90 backdrop-blur-sm shadow-sm">
                  <TableRow className="hover:bg-transparent border-b-primary/10 h-12">
                    <TableHead className="min-w-[200px] px-6 font-bold text-sky-900">الصفحة والموديول</TableHead>
                    <TableHead className="w-32 px-2 text-center font-bold text-sky-900">لا وصول</TableHead>
                    <TableHead className="w-32 px-2 text-center font-bold text-sky-900">عرض فقط</TableHead>
                    {writeAccessColumns.map((column) => (
                      <TableHead
                        key={column}
                        className="w-40 px-2 py-3 text-center font-bold text-sky-900"
                      >
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionPerms.map((perm, idx) => {
                    const level = getLevel(rolePerms, perm.id);

                    return (
                      <TableRow
                        key={perm.id}
                        className={cn(
                          "group transition-colors hover:bg-primary/[0.03]",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                        )}
                      >
                        <TableCell className="max-w-[360px] px-6 py-4 align-middle font-bold leading-snug">
                          <div className="space-y-1">
                            <div className="text-sm group-hover:text-primary transition-colors">{perm.label}</div>
                            <div className="text-[10px] font-medium leading-relaxed text-muted-foreground/70">
                              {getAccessLevelCopy(level).detail}
                            </div>
                          </div>
                        </TableCell>
                        {ACCESS_LEVELS.map((nextLevel) => (
                          <TableCell
                            key={nextLevel}
                            className="px-2 py-2 text-center align-middle"
                          >
                            <PermissionLevelButton
                              level={nextLevel}
                              selected={level === nextLevel}
                              compact
                              onClick={() =>
                                handleChangeLevel(perm.id, nextLevel)
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70 pt-6">
             <div className="flex items-center gap-3">
               <Shield className="h-8 w-8 text-primary/20" />
               <p className="text-[11px] leading-relaxed text-muted-foreground max-w-xl">
                تعديل كامل يعادل صلاحية (Read & Write) ويشمل جميع إجراءات الكتابة والحذف المتاحة في الموديول. 
                التغييرات لا تصبح فعالة إلا بعد الضغط على زر الحفظ أعلاه.
              </p>
             </div>
             {confirmReset ? (
              <div className="flex items-center gap-1">
                <button type="button" aria-label="تأكيد"
                  className="rounded bg-destructive px-2 py-1 text-xs font-medium text-white hover:bg-destructive/80"
                  onClick={() => { setPermissions(serverPermissions); setConfirmReset(false); }}>
                  تأكيد
                </button>
                <button type="button" aria-label="إلغاء"
                  className="rounded bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-border"
                  onClick={() => setConfirmReset(false)}>
                  إلغاء
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-9 px-6 font-bold text-xs border-dashed"
                onClick={() => setConfirmReset(true)}
                disabled={!hasUnsavedChanges}
              >
                تجاهل التعديلات
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
