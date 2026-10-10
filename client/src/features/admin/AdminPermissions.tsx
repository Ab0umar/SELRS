import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { handleTabListKeys } from "@/lib/tabKeys";
import {
  PAGE_PERMISSION_DEFINITIONS as PAGE_PERMISSIONS,
  PERMISSION_SECTIONS,
  type PermissionSection,
} from "@/lib/page-permissions";
import {
  getAccessLevelCopy,
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
  permissionLabel,
  disabled = false,
  onClick,
}: {
  level: AccessLevel;
  selected: boolean;
  compact?: boolean;
  permissionLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const copy = getAccessLevelCopy(level);
  return (
    <Button variant="bare"
      type="button"
      aria-pressed={selected}
      aria-label={`${permissionLabel}: ${copy.label}`}
      title={copy.detail}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-center text-[13px] font-bold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-primary/35 bg-background text-primary shadow-sm"
          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:border-border",
        compact ? "px-2 py-1" : "sm:min-h-11",
      )}
    >
      {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
      <span>{copy.label}</span>
    </Button>
  );
}

export default function AdminPermissions() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [permissions, setPermissions] = useState<TeamPermissionsMap>(
    DEFAULT_TEAM_PERMISSIONS,
  );
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
    <div className="mx-auto w-full max-w-[1500px] pb-10 text-start" dir="rtl">
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
              permissionsQuery.isError ||
              !permissionsQuery.data ||
              !hasUnsavedChanges
            }
            aria-busy={saveMutation.isPending}
          >
            {saveMutation.isPending ? "جاري الحفظ…" : "حفظ التغييرات"}
          </Button>
        }
      />

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--bento-shadow-soft)]">
        <div className="border-b border-border/60 px-4 pt-4 sm:px-6">
          <div
            role="tablist"
            aria-label="الأدوار الوظيفية"
            onKeyDown={(event) =>
              handleTabListKeys(
                event,
                ROLE_UI_ORDER,
                selectedRole,
                setSelectedRole,
                (role) => `admin-permissions-tab-${role}`,
              )
            }
            className="flex gap-1 overflow-x-auto"
          >
            {ROLE_UI_ORDER.map((role) => {
              const selected = selectedRole === role;
              const count = PAGE_PERMISSIONS.filter(
                (permission) =>
                  getLevel(permissions[role] ?? [], permission.id) !== "none",
              ).length;
              return (
                <Button variant="bare"
                  key={role}
                  type="button"
                  id={`admin-permissions-tab-${role}`}
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  aria-selected={selected}
                  aria-controls="admin-permissions-panel"
                  disabled={
                    permissionsQuery.isLoading ||
                    permissionsQuery.isError ||
                    !permissionsQuery.data
                  }
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selected
                      ? "border-primary font-bold text-primary"
                      : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{ROLE_LABELS_AR[role]}</span>
                  <span
                    className={cn(
                      "min-w-6 rounded-full px-1.5 py-0.5 text-center text-[13px] tabular-nums",
                      selected
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        <section
          id="admin-permissions-panel"
          role="tabpanel"
          aria-labelledby={`admin-permissions-tab-${selectedRole}`}
          className="min-w-0"
        >
          {permissionsQuery.isLoading ||
          (!permissionsQuery.isError && !permissionsQuery.data) ? (
            <div
              role="status"
              aria-live="polite"
              className="px-6 py-16 text-center text-sm text-muted-foreground"
            >
              جارٍ تحميل صلاحيات الأدوار…
            </div>
          ) : permissionsQuery.isError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-destructive/30 bg-destructive/5 px-5 py-6 text-sm sm:px-7"
            >
              <p className="text-destructive">
                تعذر تحميل صلاحيات الأدوار. أعد المحاولة للمتابعة.
              </p>
              <Button
                type="button"
                variant="outline"
                className="border-destructive/50 text-destructive"
                onClick={() => void permissionsQuery.refetch()}
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <>
              {saveMutation.isError ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/5 px-5 py-3 text-sm sm:px-7"
                >
                  <p className="text-destructive">
                    تعذر حفظ الصلاحيات. ما زالت تغييراتك محفوظة في هذه الصفحة.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive"
                    onClick={() => void saveMutation.mutateAsync(permissions)}
                    disabled={saveMutation.isPending}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 px-5 py-4 sm:px-7 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-bold">
                    {ROLE_LABELS_AR[selectedRole]}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {activeCount} من {PAGE_PERMISSIONS.length} صفحة
                  </span>
                  {hasUnsavedChanges ? (
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-text">
                      غير محفوظ
                    </span>
                  ) : null}
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    التعديل الكامل يشمل الإنشاء والتعديل والحذف.
                  </span>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <label className="w-full sm:w-64">
                    <span className="sr-only">البحث في الصلاحيات</span>
                    <SearchBar
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="بحث باسم الصفحة أو المسار"
                      className="w-full"
                    />
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(event) =>
                      setSelectedSection(event.target.value as SectionFilter)
                    }
                    aria-label="تصفية الصلاحيات حسب القسم"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
                  >
                    {SECTION_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {groupedPermissions.map(([group, groupPermissions]) => (
                  <section key={group} className="px-5 py-6 sm:px-7">
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <h3 className="text-xs font-bold text-muted-foreground">
                        {group}
                      </h3>
                      <span className="text-xs text-muted-foreground/70">
                        {groupPermissions.length} صفحة
                      </span>
                    </div>
                    <div className="divide-y divide-border/50 rounded-xl border border-border/60">
                      {groupPermissions.map((permission) => {
                        const level = getLevel(rolePerms, permission.id);
                        return (
                          <div
                            key={permission.id}
                            className="grid gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(200px,1fr)_330px] sm:items-center sm:px-5"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground">
                                {permission.label}
                              </div>
                              <div
                                className="mt-0.5 truncate font-mono text-[13px] text-muted-foreground/70"
                                dir="ltr"
                              >
                                {permission.id}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
                              {ACCESS_LEVELS.map((nextLevel) => (
                                <PermissionLevelButton
                                  key={nextLevel}
                                  level={nextLevel}
                                  selected={level === nextLevel}
                                  compact
                                  permissionLabel={permission.label}
                                  disabled={
                                    permissionsQuery.isLoading ||
                                    permissionsQuery.isError ||
                                    !permissionsQuery.data ||
                                    saveMutation.isPending
                                  }
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
                  <div
                    role="status"
                    className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-muted-foreground"
                  >
                    <p>لا توجد صفحات مطابقة للفلاتر الحالية.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedSection("all");
                      }}
                    >
                      مسح الفلاتر
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="sticky bottom-0 flex flex-col items-stretch justify-between gap-3 border-t border-border/60 bg-card/95 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:flex-row sm:items-center sm:px-7">
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    hasUnsavedChanges
                      ? "font-semibold text-warning-text"
                      : "text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 rounded-full",
                      hasUnsavedChanges ? "bg-warning" : "bg-success",
                    )}
                  />
                  {hasUnsavedChanges
                    ? "لديك تغييرات لم تُحفظ بعد"
                    : "كل التغييرات محفوظة"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={!hasUnsavedChanges || saveMutation.isPending}
                  onClick={() => setPermissions(serverPermissions)}
                >
                  تراجع عن التغييرات
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
