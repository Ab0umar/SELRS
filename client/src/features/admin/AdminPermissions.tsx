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

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--bento-shadow-soft)]">
        <div className="border-b border-border/60 px-4 pt-4 sm:px-6">
          <div
            role="tablist"
            aria-label="الأدوار الوظيفية"
            className="flex gap-1 overflow-x-auto"
          >
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
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "-mb-px inline-flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    selected
                      ? "border-primary font-bold text-primary"
                      : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{ROLE_LABELS_AR[role]}</span>
                  <span
                    className={cn(
                      "min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] tabular-nums",
                      selected
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <section className="min-w-0">
          <div className="flex flex-col gap-3 px-5 py-4 sm:px-7 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-bold">
                {ROLE_LABELS_AR[selectedRole]}
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {activeCount} من {PAGE_PERMISSIONS.length} صفحة
              </span>
              {hasUnsavedChanges ? (
                <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                  غير محفوظ
                </span>
              ) : null}
              <span className="hidden text-xs text-muted-foreground sm:inline">
                التعديل الكامل يشمل الإنشاء والتعديل والحذف.
              </span>
            </div>
            <div className="flex gap-2">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="بحث باسم الصفحة أو المسار"
                className="w-full sm:w-64"
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

          <div className="divide-y divide-border/50">
            {groupedPermissions.map(([group, groupPermissions]) => (
              <section key={group} className="px-5 py-6 sm:px-7">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <h3 className="text-xs font-bold tracking-wide text-muted-foreground">
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
                            className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/70"
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

          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border/60 bg-card/95 px-5 py-3 backdrop-blur sm:px-7">
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs",
                hasUnsavedChanges
                  ? "font-semibold text-warning"
                  : "text-muted-foreground",
              )}
            >
              <span
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

}
