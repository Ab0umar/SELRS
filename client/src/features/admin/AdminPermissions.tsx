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
import { SearchBar } from "@/components/shared/SearchBar";
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
type SectionFilter = PermissionSection | "all";

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
        "inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-center text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        selected
          ? "border-primary/35 bg-background text-primary shadow-sm"
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
  const [selectedSection, setSelectedSection] = useState<SectionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
  const sectionPerms =
    selectedSection === "all"
      ? PAGE_PERMISSIONS
      : PAGE_PERMISSIONS.filter((p) => p.group === selectedSection);
  const visiblePermissions = sectionPerms.filter((permission) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      !query ||
      permission.label.toLowerCase().includes(query) ||
      permission.id.toLowerCase().includes(query)
    );
  });
  const hasUnsavedChanges =
    normalizePermissionsSignature(permissions) !==
    normalizePermissionsSignature(serverPermissions);

  const handleChangeLevel = (pageId: string, level: AccessLevel) => {
    setPermissions((prev) => ({
      ...prev,
      [selectedRole]: setLevel(prev[selectedRole] ?? [], pageId, level),
    }));
  };

  const SECTION_FILTER_OPTIONS = [
    { value: "all", label: "الكل" },
    ...PERMISSION_SECTIONS.map((s) => ({
      value: s,
      label: s,
    })),
  ];
  const writeAccessColumns = getWriteAccessColumns();
  const groupedPermissions = (() => {
    const groups = new Map<string, typeof visiblePermissions>();
    for (const permission of visiblePermissions) {
      const items = groups.get(permission.group) ?? [];
      items.push(permission);
      groups.set(permission.group, items);
    }
    return Array.from(groups.entries());
  })();

  const activeCount = PAGE_PERMISSIONS.filter(
    (permission) => getLevel(rolePerms, permission.id) !== "none",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1500px] pb-10 text-right" dir="rtl">
      <PageHeader
        title="صلاحيات الأدوار"
        subtitle="اختر دورًا ثم حدّد ما يمكنه عرضه أو تعديله"
        icon={<Shield className="h-5 w-5 text-primary" />}
        action={
          <Button
            type="button"
            className="h-10 gap-2 px-5"
            onClick={() => void saveMutation.mutateAsync(permissions)}
            disabled={
              saveMutation.isPending ||
              permissionsQuery.isLoading ||
              !hasUnsavedChanges
            }
          >
            {saveMutation.isPending ? "جاري الحفظ…" : "حفظ التغييرات"}
          </Button>
        }
      />

      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-background lg:grid lg:min-h-[680px] lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/25 p-3 lg:border-b-0 lg:border-l">
          <div className="mb-2 px-2 py-2">
            <div className="text-xs font-semibold text-muted-foreground">
              الأدوار
            </div>
            <div className="mt-1 text-sm text-foreground">
              اختر دورًا للمراجعة
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-1">
            {ROLE_UI_ORDER.map((role) => {
              const selected = selectedRole === role;
              const count = PAGE_PERMISSIONS.filter(
                (permission) =>
                  getLevel(permissions[role] ?? [], permission.id) !== "none",
              ).length;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "flex min-h-11 items-center justify-between rounded-md px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-background",
                  )}
                >
                  <span>{ROLE_LABELS_AR[role]}</span>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      selected
                        ? "text-primary-foreground/75"
                        : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="sticky top-0 z-20 border-b border-border bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">
                    {ROLE_LABELS_AR[selectedRole]}
                  </h2>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {activeCount} من {PAGE_PERMISSIONS.length} صفحة
                  </span>
                  {hasUnsavedChanges ? (
                    <span className="rounded-md bg-warning/15 px-2 py-1 text-xs font-semibold text-warning">
                      غير محفوظ
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  التعديل الكامل يشمل عمليات الإنشاء والتعديل والحذف المتاحة في
                  الصفحة.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(240px,360px)_200px]">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="بحث باسم الصفحة أو المسار"
                />
                <select
                  value={selectedSection}
                  onChange={(event) =>
                    setSelectedSection(event.target.value as SectionFilter)
                  }
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                >
                  {SECTION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {groupedPermissions.map(([group, groupPermissions]) => (
              <section key={group} className="px-4 py-5 sm:px-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-foreground">{group}</h3>
                  <span className="text-xs text-muted-foreground">
                    {groupPermissions.length} صفحة
                  </span>
                </div>
                <div className="divide-y divide-border rounded-md border border-border">
                  {groupPermissions.map((permission) => {
                    const level = getLevel(rolePerms, permission.id);
                    return (
                      <div
                        key={permission.id}
                        className="grid gap-3 px-3 py-3 hover:bg-muted/20 sm:grid-cols-[minmax(200px,1fr)_330px] sm:items-center sm:px-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {permission.label}
                          </div>
                          <div
                            className="mt-0.5 truncate text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {permission.id}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/50 p-1">
                          {ACCESS_LEVELS.map((nextLevel) => (
                            <PermissionLevelButton
                              key={nextLevel}
                              level={nextLevel}
                              selected={level === nextLevel}
                              compact
                              onClick={() =>
                                handleChangeLevel(permission.id, nextLevel)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            {groupedPermissions.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                لا توجد صفحات مطابقة للبحث.
              </div>
            ) : null}
          </div>

          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background px-4 py-3 sm:px-6">
            <span className="text-xs text-muted-foreground">
              {hasUnsavedChanges
                ? "لديك تغييرات لم تُحفظ بعد"
                : "كل التغييرات محفوظة"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasUnsavedChanges}
              onClick={() => setPermissions(serverPermissions)}
            >
              تراجع عن التغييرات
            </Button>
          </div>
        </section>
      </div>
    </div>
  );

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
            className="selrs-gradient-btn text-primary-foreground h-9 px-6 font-bold shadow-sm"
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
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold h-5 bg-background"
                >
                  {
                    SECTION_FILTER_OPTIONS.find(
                      (o) => o.value === selectedSection,
                    )?.label
                  }
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
                  ? "border-warning/50 bg-warning/10 text-warning/90 animate-pulse"
                  : "border-border/60 bg-muted/40 text-muted-foreground",
              )}
            >
              {hasUnsavedChanges
                ? "توجد تغييرات غير محفوظة"
                : "البيانات محفوظة ومزامنة"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <aside className="lg:col-span-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
              <div className="mb-3 px-2 text-xs font-black text-muted-foreground">
                الدور الوظيفي
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {ROLE_UI_ORDER.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2.5 text-right text-sm font-bold transition-colors",
                      selectedRole === role
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5",
                    )}
                  >
                    <span>{ROLE_LABELS_AR[role]}</span>
                    <span className="text-[10px] opacity-70">
                      {
                        (permissions[role] ?? []).filter(
                          (p) => p.endsWith(":rw") || !p.includes(":"),
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </div>
            </aside>
            <div className="lg:col-span-9 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Role selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                    القسم
                  </span>
                </div>

                {/* Section tabs */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                    نطاق مراجعة الصفحات
                  </span>
                  <FilterBar
                    filters={SECTION_FILTER_OPTIONS}
                    selected={selectedSection}
                    onSelect={(v) => setSelectedSection(v as SectionFilter)}
                    className="max-w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="ابحث باسم الصفحة أو المسار..."
                  />
                </div>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {visiblePermissions.map((perm) => {
                const level = getLevel(rolePerms, perm.id);
                return (
                  <div
                    key={perm.id}
                    className="rounded-lg border border-border/80 bg-card px-3 py-3"
                    dir="rtl"
                  >
                    <div className="mb-3 space-y-1">
                      <div className="font-medium leading-snug">
                        {perm.label}
                      </div>
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
                <TableHeader className="sticky top-0 z-10 bg-primary/5 backdrop-blur-sm shadow-sm">
                  <TableRow className="hover:bg-transparent border-b-primary/10 h-12">
                    <TableHead className="min-w-[200px] px-6 font-bold text-primary">
                      الصفحة والموديول
                    </TableHead>
                    <TableHead className="w-32 px-2 text-center font-bold text-primary">
                      لا وصول
                    </TableHead>
                    <TableHead className="w-32 px-2 text-center font-bold text-primary">
                      عرض فقط
                    </TableHead>
                    {writeAccessColumns.map((column) => (
                      <TableHead
                        key={column}
                        className="w-40 px-2 py-3 text-center font-bold text-primary"
                      >
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePermissions.map((perm, idx) => {
                    const level = getLevel(rolePerms, perm.id);

                    return (
                      <TableRow
                        key={perm.id}
                        className={cn(
                          "group transition-colors hover:bg-primary/[0.03]",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                        )}
                      >
                        <TableCell className="max-w-[360px] px-6 py-4 align-middle font-bold leading-snug">
                          <div className="space-y-1">
                            <div className="text-sm group-hover:text-primary transition-colors">
                              {perm.label}
                            </div>
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
                تعديل كامل يعادل صلاحية (Read & Write) ويشمل جميع إجراءات
                الكتابة والحذف المتاحة في الموديول. التغييرات لا تصبح فعالة إلا
                بعد الضغط على زر الحفظ أعلاه.
              </p>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="تأكيد"
                  className="rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                  onClick={() => {
                    setPermissions(serverPermissions);
                    setConfirmReset(false);
                  }}
                >
                  تأكيد
                </button>
                <button
                  type="button"
                  aria-label="إلغاء"
                  className="rounded bg-muted text-muted-foreground hover:bg-border"
                  onClick={() => setConfirmReset(false)}
                >
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
