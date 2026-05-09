import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PAGE_PERMISSION_DEFINITIONS as PAGE_PERMISSIONS, PERMISSION_SECTIONS, type PermissionSection } from "@/lib/page-permissions";

type TeamRole =
  | "admin"
  | "manager"
  | "accountant"
  | "doctor"
  | "nurse"
  | "technician"
  | "reception";

type AccessLevel = "none" | "r" | "rw";
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
const ROLE_UI_ORDER: TeamRole[] = ["manager", "doctor", "reception", "nurse", "technician", "accountant", "admin"];

const ROLE_FILTER_OPTIONS = ROLE_UI_ORDER.map((r) => ({ value: r, label: ROLE_LABELS_AR[r] }));

function getLevel(permissions: string[], pageId: string): AccessLevel {
  const rw = permissions.find((e) => e === `${pageId}:rw`);
  if (rw) return "rw";
  const r = permissions.find((e) => e === `${pageId}:r` || e === pageId);
  if (r) return "r";
  return "none";
}

function setLevel(permissions: string[], pageId: string, level: AccessLevel): string[] {
  const filtered = permissions.filter((e) => e !== pageId && e !== `${pageId}:r` && e !== `${pageId}:rw`);
  if (level === "r") return [...filtered, pageId, `${pageId}:r`];
  if (level === "rw") return [...filtered, pageId, `${pageId}:rw`];
  return filtered;
}

export default function AdminPermissions() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [permissions, setPermissions] = useState<TeamPermissionsMap>(DEFAULT_TEAM_PERMISSIONS);
  const [selectedRole, setSelectedRole] = useState<TeamRole>("manager");
  const [selectedSection, setSelectedSection] = useState<PermissionSection>(PERMISSION_SECTIONS[0]);

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

  if (!isAuthenticated || user?.role !== "admin") return null;

  const rolePerms = permissions[selectedRole] ?? [];
  const sectionPerms = PAGE_PERMISSIONS.filter((p) => p.group === selectedSection);

  const handleChangeLevel = (pageId: string, level: AccessLevel) => {
    setPermissions((prev) => ({
      ...prev,
      [selectedRole]: setLevel(prev[selectedRole] ?? [], pageId, level),
    }));
  };

  const SECTION_FILTER_OPTIONS = PERMISSION_SECTIONS.map((s) => ({ value: s, label: s }));

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-4 text-right" dir="rtl">
      <PageHeader
        title="الصلاحيات"
        subtitle="إدارة صلاحيات الأدوار"
        icon={<Shield className="h-5 w-5" />}
      />

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="space-y-1 border-b border-border/70">
          <CardTitle className="text-base">{ROLE_LABELS_AR[selectedRole]}</CardTitle>
          <CardDescription>
            التخزين الحالي للنظام: <strong>عرض فقط</strong> (قراءة) أو <strong>عرض + كتابة</strong> (تعديل كامل). حقول الإنشاء
            والتعديل والحذف مرتبطة معاً لتعكس وضع الكتابة الكامل.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {/* Role selector */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground">الدور</span>
            <FilterBar
              filters={ROLE_FILTER_OPTIONS}
              selected={selectedRole}
              onSelect={(v) => setSelectedRole(v as TeamRole)}
              className="max-w-[min(100%,920px)]"
            />
          </div>

          {/* Section tabs */}
          <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
            <span className="text-xs font-semibold text-muted-foreground">القسم</span>
            <FilterBar
              filters={SECTION_FILTER_OPTIONS}
              selected={selectedSection}
              onSelect={(v) => setSelectedSection(v as PermissionSection)}
              className="max-w-full"
            />
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {sectionPerms.map((perm) => {
              const level = getLevel(rolePerms, perm.id);
              const canView = level === "r" || level === "rw";
              const canWrite = level === "rw";
              const toggleWriteRow = (on: boolean) => {
                if (on) handleChangeLevel(perm.id, "rw");
                else handleChangeLevel(perm.id, level !== "none" ? "r" : "none");
              };
              return (
                <div key={perm.id} className="rounded-xl border border-border/80 bg-card px-4 py-3" dir="rtl">
                  <div className="mb-2 font-medium leading-snug">{perm.label}</div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <div className="mb-1 text-muted-foreground">عرض</div>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={canView}
                          onCheckedChange={(c) => {
                            const v = Boolean(c);
                            if (!v) handleChangeLevel(perm.id, "none");
                            else handleChangeLevel(perm.id, canWrite ? "rw" : "r");
                          }}
                          aria-label="عرض"
                        />
                      </div>
                    </div>
                    {(["إنشاء", "تعديل", "حذف"] as const).map((col) => (
                      <div key={col}>
                        <div className="mb-1 text-muted-foreground">{col}</div>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={canWrite}
                            onCheckedChange={(c) => toggleWriteRow(Boolean(c))}
                            aria-label={col}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border/80 sm:block">
            <Table dir="rtl" className="min-w-[720px] text-right text-sm">
              <TableHeader>
                <TableRow className="bg-muted/45">
                  <TableHead className="min-w-[200px] px-4 py-3 font-bold">الصفحة</TableHead>
                  <TableHead className="w-28 px-2 py-3 text-center font-bold">عرض</TableHead>
                  <TableHead className="w-28 px-2 py-3 text-center font-bold">إنشاء</TableHead>
                  <TableHead className="w-28 px-2 py-3 text-center font-bold">تعديل</TableHead>
                  <TableHead className="w-28 px-2 py-3 text-center font-bold">حذف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionPerms.map((perm) => {
                  const level = getLevel(rolePerms, perm.id);
                  const canView = level === "r" || level === "rw";
                  const canWrite = level === "rw";
                  const toggleWriteRow = (on: boolean) => {
                    if (on) handleChangeLevel(perm.id, "rw");
                    else handleChangeLevel(perm.id, level !== "none" ? "r" : "none");
                  };
                  const writeCheckboxProps = {
                    checked: canWrite,
                    onCheckedChange: (c: unknown) => toggleWriteRow(Boolean(c)),
                    "aria-label": "عمليات الكتابة",
                  } as const;

                  return (
                    <TableRow key={perm.id} className="border-border/80 hover:bg-primary/[0.04]">
                      <TableCell className="max-w-[360px] px-4 py-3 align-middle font-medium leading-snug">
                        {perm.label}
                      </TableCell>
                      <TableCell className="py-3 text-center align-middle">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={canView}
                            onCheckedChange={(c) => {
                              const v = Boolean(c);
                              if (!v) handleChangeLevel(perm.id, "none");
                              else handleChangeLevel(perm.id, canWrite ? "rw" : "r");
                            }}
                            aria-label="عرض"
                          />
                        </div>
                      </TableCell>
                      {[0, 1, 2].map((i) => (
                        <TableCell key={i} className="py-3 text-center align-middle">
                          <div className="flex justify-center">
                            <Checkbox {...writeCheckboxProps} />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
            <Button
              type="button"
              className="selrs-gradient-btn text-white"
              onClick={() => void saveMutation.mutateAsync(permissions)}
              disabled={saveMutation.isPending || permissionsQuery.isLoading}
            >
              {saveMutation.isPending ? "جاري الحفظ…" : "حفظ الصلاحيات"}
            </Button>
            <p className="text-xs text-muted-foreground">
              المرجع: عدم التفعيل يعني «لا وصول». «عرض» يعادل R. تفعيل أي عمود إنشاء/تعديل/حذف يفعّل R&amp;W لذلك الدور لهذه الصفحة.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
