import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, Shield, UserCheck, UserRound, UserX } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { toast } from "sonner";
import { cn, formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { PAGE_PERMISSION_DEFINITIONS } from "@/lib/page-permissions";
type UserRole = "admin" | "doctor" | "nurse" | "technician" | "reception" | "manager" | "accountant";
type UserBranch = "examinations" | "surgery" | "both";
type TeamPermissionsMap = Record<UserRole, string[]>;

interface User {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  branch: UserBranch;
  shift: 1 | 2;
  isActive: boolean;
  createdAt: Date;
  lastSignedIn?: Date | string | null;
}

type UserForm = {
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  branch: UserBranch;
  shift: 1 | 2;
  writeToMssql: boolean;
};

const ROLE_TABS: { value: string; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "manager", label: "مدير" },
  { value: "doctor", label: "طبيب" },
  { value: "reception", label: "استقبال" },
  { value: "nurse", label: "ممرض" },
  { value: "technician", label: "فني" },
  { value: "accountant", label: "محاسب" },
  { value: "admin", label: "مسؤول" },
];

function initialsFromUser(name: string | null | undefined, username: string) {
  const base = String(name ?? username ?? "?")
    .trim()
    .replace(/\s+/g, " ");
  if (!base) return "؟";
  const parts = base.split(" ");
  if (parts.length >= 2)
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase().slice(0, 4);
  return base.slice(0, 2).toUpperCase();
}

function roleLabelAr(role: UserRole): string {
  const m: Record<UserRole, string> = {
    admin: "مسؤول",
    manager: "مدير",
    doctor: "طبيب",
    nurse: "ممرض",
    technician: "فني",
    reception: "استقبال",
    accountant: "محاسب",
  };
  return m[role] ?? role;
}

function roleBadgeClass(role: UserRole): string {
  const map: Record<UserRole, string> = {
    manager: "bg-rose-100 text-rose-900 border-0 dark:bg-rose-950/50 dark:text-rose-100",
    doctor: "bg-sky-100 text-sky-900 border-0 dark:bg-sky-950/55 dark:text-sky-100",
    reception: "bg-emerald-100 text-emerald-900 border-0 dark:bg-emerald-950/55 dark:text-emerald-100",
    nurse: "bg-violet-100 text-violet-900 border-0 dark:bg-violet-950/55 dark:text-violet-100",
    technician: "bg-amber-100 text-amber-900 border-0 dark:bg-amber-950/50 dark:text-amber-100",
    accountant: "bg-cyan-100 text-cyan-900 border-0 dark:bg-cyan-950/50 dark:text-cyan-100",
    admin: "bg-slate-200 text-slate-900 border-0 dark:bg-slate-800 dark:text-slate-100",
  };
  return map[role] ?? "bg-muted text-foreground border-0";
}

function toDateKey(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.split("T")[0] ?? "";
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? value.toISOString().split("T")[0] : "";
  }
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d.toISOString().split("T")[0] : "";
}

function branchLabelAr(b: UserBranch): string {
  const m: Record<UserBranch, string> = {
    examinations: "فحوصات",
    surgery: "عمليات",
    both: "فحوصات وعمليات",
  };
  return m[b] ?? String(b);
}

function shiftLabelAr(s: 1 | 2): string {
  return s === 2 ? "مساء (2)" : "صباح (1)";
}

/** Checkbox list — synced with Admin Permissions (`lib/page-permissions`). */
const PAGE_PERMISSIONS = PAGE_PERMISSION_DEFINITIONS;

const DEFAULT_ROLE: UserRole = "doctor";
const DEFAULT_BRANCH: UserBranch = "examinations";
const DEFAULT_SHIFT: 1 | 2 = 1;
const MSSQL_WRITE_PERMISSION = "/ops/mssql-add";
const stripPermissionAccessSuffix = (permission: string) =>
  String(permission ?? "").replace(/:(r|rw)$/i, "");
const normalizePermissionIdsForCheckbox = (pageIds: string[]) =>
  Array.from(new Set(pageIds.map(stripPermissionAccessSuffix).filter(Boolean)));
const permissionListsEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
};

function permissionBaseSet(paths: string[]): Set<string> {
  return new Set(normalizePermissionIdsForCheckbox(paths));
}

export default function AdminUsers() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const usersQuery = trpc.medical.getAllUsers.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const teamPermissionsQuery = trpc.medical.getTeamPermissions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const createUserMutation = trpc.medical.createUser.useMutation({
    onSuccess: () => {
      toast.success("User added successfully.");
      utils.medical.getAllUsers.invalidate();
    },
  });

  const updateUserMutation = trpc.medical.updateUser.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully.");
      utils.medical.getAllUsers.invalidate();
    },
  });

  const setUserPermissionsMutation = trpc.medical.setUserPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissions updated successfully.");
      // Invalidate all users' permission caches so they get updated permissions on next query
      utils.medical.getMyPermissions.invalidate();
      utils.medical.getUserPermissionState.invalidate();
      // Invalidate system settings so pricing and other permission-checked settings reload
      utils.medical.getSystemSetting.invalidate();
    },
  });

  const deleteUserMutation = trpc.medical.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully.");
      utils.medical.getAllUsers.invalidate();
    },
  });

  const users = (usersQuery.data ?? []) as User[];

  const [newUser, setNewUser] = useState<UserForm>({
    username: "",
    password: "",
    name: "",
    email: "",
    role: DEFAULT_ROLE,
    branch: DEFAULT_BRANCH,
    shift: DEFAULT_SHIFT,
    writeToMssql: false,
  });

  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserForm>({
    username: "",
    password: "",
    name: "",
    email: "",
    role: DEFAULT_ROLE,
    branch: DEFAULT_BRANCH,
    shift: DEFAULT_SHIFT,
    writeToMssql: false,
  });
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const userStateQuery = trpc.medical.getUserPageState.useQuery(
    { page: "admin-users" },
    { refetchOnWindowFocus: false }
  );
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();
  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHydrateUserStateRef = useRef(false);
  const lastPermissionSyncRef = useRef("");
  const isSaving = createUserMutation.isPending || updateUserMutation.isPending || setUserPermissionsMutation.isPending;

  const permissionStateQuery = trpc.medical.getUserPermissionState.useQuery(
    { userId: editUserId ?? 0 },
    {
      enabled: Boolean(editUserId) && isEditOpen,
      refetchOnWindowFocus: false,
    }
  );

  const roleDefaults = useMemo<TeamPermissionsMap>(() => {
    const data = teamPermissionsQuery.data;
    return {
      admin: data?.admin ?? [],
      manager: data?.manager ?? [],
      accountant: data?.accountant ?? [],
      doctor: data?.doctor ?? [],
      nurse: data?.nurse ?? [],
      technician: data?.technician ?? [],
      reception: data?.reception ?? [],
    };
  }, [teamPermissionsQuery.data]);

  const getRoleDefaults = (role: UserRole) =>
    normalizePermissionIdsForCheckbox(roleDefaults[role] ?? []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const data = (userStateQuery.data as any)?.data;
    if (!data) return;
    if (didHydrateUserStateRef.current) return;
    if (data.searchTerm !== undefined) setSearchTerm(data.searchTerm ?? "");
    if (data.statusFilter !== undefined) setStatusFilter(data.statusFilter ?? "all");
    if (data.roleFilter !== undefined && data.roleFilter !== null) {
      const rf = String(data.roleFilter);
      const allowed = new Set(ROLE_TABS.map((r) => r.value));
      if (allowed.has(rf)) setRoleFilter(rf as UserRole | "all");
    }
    didHydrateUserStateRef.current = true;
  }, [userStateQuery.data]);

  useEffect(() => {
    if (usersQuery.isLoading) return;
    if (users.length === 0) return;
    if (searchTerm.trim().length > 0) return;
    if (statusFilter === "inactive" && users.some((u) => u.isActive)) {
      setStatusFilter("all");
    }
  }, [usersQuery.isLoading, users, searchTerm, statusFilter]);

  useEffect(() => {
    if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    userStateTimerRef.current = setTimeout(() => {
      const payload = { searchTerm, statusFilter, roleFilter };
      saveUserStateMutation.mutate({ page: "admin-users", data: payload });
    }, 600);
    return () => {
      if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    };
  }, [searchTerm, statusFilter, roleFilter, saveUserStateMutation]);

  if (!isAuthenticated) return null;

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-[1440px] space-y-4 px-2 py-6 text-right sm:px-0" dir="rtl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">You do not have permission to access this page. Admin role is required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveUser = async () => {
    const username = newUser.username.trim();
    const password = newUser.password;
    const name = newUser.name.trim();

    if (!username || !password || !name) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        username,
        password,
        name,
        email: newUser.email.trim() ? newUser.email.trim() : undefined,
        role: newUser.role,
        branch: newUser.branch,
        shift: newUser.shift,
        writeToMssql: newUser.writeToMssql,
      });

      setNewUser({
        username: "",
        password: "",
        name: "",
        email: "",
        role: DEFAULT_ROLE,
        branch: DEFAULT_BRANCH,
        shift: DEFAULT_SHIFT,
        writeToMssql: false,
      });
      setIsCreateOpen(false);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save user."));
    }
  };

  const handleEdit = (u: User) => {
    lastPermissionSyncRef.current = "";
    setEditUserId(u.id);
    setEditUser({
      username: u.username,
      password: "",
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role,
      branch: u.branch,
      shift: u.shift ?? DEFAULT_SHIFT,
      writeToMssql: false,
    });
    setEditPermissions(getRoleDefaults(u.role));
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUserMutation.mutateAsync({ userId: id });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to delete user."));
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await updateUserMutation.mutateAsync({
        userId: u.id,
        updates: { isActive: !u.isActive },
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to update user status."));
    }
  };

  useEffect(() => {
    if (!isEditOpen || !permissionStateQuery.data) return;
    const incomingPages = normalizePermissionIdsForCheckbox(permissionStateQuery.data.pageIds);
    const signature = JSON.stringify({
      userId: editUserId,
      role: editUser.role,
      hasOverride: permissionStateQuery.data.hasOverride,
      hasInheritExtrasMarker: permissionStateQuery.data.hasInheritExtrasMarker,
      hasExplicitEmptyOverride: permissionStateQuery.data.hasExplicitEmptyOverride,
      pages: incomingPages.slice().sort(),
    });
    if (lastPermissionSyncRef.current === signature) return;
    lastPermissionSyncRef.current = signature;

    if (permissionStateQuery.data.hasExplicitEmptyOverride) {
      setEditPermissions([]);
      setEditUser((prev) => (prev.writeToMssql ? { ...prev, writeToMssql: false } : prev));
      return;
    }

    if (!permissionStateQuery.data.hasOverride) {
      const defaults = getRoleDefaults(editUser.role);
      const nextWriteToMssql = defaults.includes(MSSQL_WRITE_PERMISSION);
      setEditPermissions((prev) => (permissionListsEqual(prev, defaults) ? prev : defaults));
      setEditUser((prev) =>
        prev.writeToMssql === nextWriteToMssql ? prev : { ...prev, writeToMssql: nextWriteToMssql },
      );
      return;
    }

    if (permissionStateQuery.data.hasInheritExtrasMarker) {
      const merged = normalizePermissionIdsForCheckbox([...getRoleDefaults(editUser.role), ...incomingPages]);
      const nextWriteToMssql = merged.includes(MSSQL_WRITE_PERMISSION);
      setEditPermissions((prev) => (permissionListsEqual(prev, merged) ? prev : merged));
      setEditUser((prev) =>
        prev.writeToMssql === nextWriteToMssql ? prev : { ...prev, writeToMssql: nextWriteToMssql },
      );
      return;
    }

    const nextWriteToMssql = incomingPages.includes(MSSQL_WRITE_PERMISSION);
    setEditPermissions((prev) => (permissionListsEqual(prev, incomingPages) ? prev : incomingPages));
    setEditUser((prev) =>
      prev.writeToMssql === nextWriteToMssql ? prev : { ...prev, writeToMssql: nextWriteToMssql },
    );
  }, [permissionStateQuery.data, isEditOpen, editUserId, editUser.role]);

  const togglePermission = (pageId: string) => {
    setEditPermissions((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
  };

  const handleSaveEdit = async () => {
    if (!editUserId) return;
    const username = editUser.username.trim();
    const name = editUser.name.trim();
    if (!username || !name) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }

    try {
      const updates: Record<string, unknown> = {
        username,
        name,
        email: editUser.email.trim() ? editUser.email.trim() : null,
        role: editUser.role,
        branch: editUser.branch,
        shift: editUser.shift,
      };

      if (editUser.password) {
        updates.password = editUser.password;
      }

      await updateUserMutation.mutateAsync({
        userId: editUserId,
        updates,
      });

      const finalPermissions = editUser.writeToMssql
        ? Array.from(new Set([...editPermissions, MSSQL_WRITE_PERMISSION]))
        : editPermissions.filter((id) => id !== MSSQL_WRITE_PERMISSION);

      const defaultsNorm = getRoleDefaults(editUser.role);
      const roleBases = permissionBaseSet(defaultsNorm);
      const editBases = permissionBaseSet(finalPermissions);
      const sameAsRole =
        roleBases.size === editBases.size && [...roleBases].every((b) => editBases.has(b));

      if (sameAsRole) {
        await setUserPermissionsMutation.mutateAsync({
          userId: editUserId,
          pageIds: [],
          whenEmpty: "inherit",
        });
      } else {
        const roleSubsetOfEdit = [...roleBases].every((x) => editBases.has(x));
        const strictSuperset = roleSubsetOfEdit && editBases.size > roleBases.size;

        if (strictSuperset) {
          const extras = finalPermissions.filter((id) => !roleBases.has(stripPermissionAccessSuffix(id)));
          await setUserPermissionsMutation.mutateAsync({
            userId: editUserId,
            pageIds: extras,
            nonEmptyStorage: "inherit_extras",
          });
        } else {
          await setUserPermissionsMutation.mutateAsync({
            userId: editUserId,
            pageIds: finalPermissions,
            nonEmptyStorage: "replace",
          });
        }
      }

      setIsEditOpen(false);
      setEditUserId(null);
      setEditUser({
        username: "",
        password: "",
        name: "",
        email: "",
        role: DEFAULT_ROLE,
        branch: DEFAULT_BRANCH,
        shift: DEFAULT_SHIFT,
        writeToMssql: false,
      });
      setEditPermissions([]);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save changes."));
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return users.filter((u) => {
      const hay = [u.name, u.username, u.email]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());
      const matchesTerm = !term || hay.some((h) => h.includes(term));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? u.isActive : !u.isActive);

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      return matchesTerm && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  const usersTotal = users.length;
  const usersActive = users.filter((u) => u.isActive).length;
  const usersInactive = usersTotal - usersActive;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-4 text-right" dir="rtl">
      <PageHeader
        title="المستخدمين"
        subtitle="User Management — إضافة حسابات وإدارة الأدوار والصلاحيات"
        icon={<Shield className="h-5 w-5" />}
        action={
          <Button
            type="button"
            size="sm"
            className="selrs-gradient-btn gap-2 text-white"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">مستخدم جديد</span>
          </Button>
        }
      />
      <div className={cn(STAT_CARDS_MOBILE_ROW, "gap-2 sm:grid sm:grid-cols-3 sm:gap-4")}>
        <StatCard
          title="إجمالي المستخدمين"
          value={usersTotal}
          icon={UserRound}
          iconColor="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
        />
        <StatCard
          title="نشط"
          value={usersActive}
          icon={UserCheck}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />
        <StatCard
          title="غير نشط"
          value={usersInactive}
          icon={UserX}
          iconColor="bg-red-100 text-red-700 dark:bg-red-950/55 dark:text-red-300"
        />
      </div>

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="space-y-1 border-b border-border/70 pb-4">
          <CardTitle className="text-base">المستخدمين</CardTitle>
          <CardDescription>عرض وفلترة وفق الدور وحالة النشاط</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="بحث بالاسم أو البريد أو اسم المستخدم…" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
              >
                <SelectTrigger className="h-10 w-full border-muted bg-background sm:w-[160px]" dir="rtl">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="active">نشط فقط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
              <FilterBar
                filters={ROLE_TABS}
                selected={roleFilter}
                onSelect={(v) => setRoleFilter(v as UserRole | "all")}
                className="max-w-[min(100%,640px)] sm:justify-end"
              />
            </div>
          </div>

          {/* Mobile cards — hidden on sm+ */}
          <div className="sm:hidden">
            {usersQuery.isLoading && (
              <div className="py-10 text-center text-muted-foreground">جاري تحميل المستخدمين…</div>
            )}
            {!usersQuery.isLoading && filteredUsers.length === 0 && (
              <div className="py-10 text-center text-muted-foreground">لا توجد نتائج مطابقة.</div>
            )}
            <div className="grid grid-cols-1 gap-2">
            {filteredUsers.map((u) => {
              const initials = initialsFromUser(u.name, u.username);
              const lastRaw = u.lastSignedIn as unknown;
              const lastKey = toDateKey(lastRaw);
              const createdKey = toDateKey(u.createdAt as unknown);
              return (
                <div key={u.id} className="rounded-xl border border-border/80 bg-card p-2.5" dir="rtl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="تعديل" onClick={() => handleEdit(u)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="حذف"
                        onClick={() => void handleDelete(u.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0 text-right">
                        <div className="truncate font-semibold leading-tight">{u.name ?? u.username}</div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground tabular-nums" dir="ltr">
                          @{u.username}
                        </div>
                      </div>
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-black text-primary"
                        aria-hidden
                      >
                        {initials}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 w-full max-w-[9.5rem] text-xs font-semibold",
                        u.isActive
                          ? "border-emerald-500/50 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300"
                          : "border-muted-foreground/35 bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                      onClick={() => void handleToggleActive(u)}
                    >
                      {u.isActive ? "نشط" : "غير نشط"}
                    </Button>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                    <div className="text-muted-foreground">البريد</div>
                    <div className="truncate text-right" dir="ltr">{u.email?.trim() ? u.email : "—"}</div>
                    <div className="text-muted-foreground">الدور</div>
                    <div className="text-right">
                      <Badge className={cn("font-semibold text-[10px]", roleBadgeClass(u.role))}>{roleLabelAr(u.role)}</Badge>
                    </div>
                    <div className="text-muted-foreground">الفرع / الوردية</div>
                    <div className="text-right">{branchLabelAr(u.branch)} · {shiftLabelAr(u.shift)}</div>
                    <div className="text-muted-foreground">آخر دخول</div>
                    <div className="text-right tabular-nums">{lastKey ? formatDateLabel(lastKey) : "—"}</div>
                    <div className="text-muted-foreground">تاريخ الإنشاء</div>
                    <div className="text-right tabular-nums">{createdKey ? formatDateLabel(createdKey) : "—"}</div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Desktop table — hidden on mobile */}
          <div className="hidden overflow-x-auto rounded-lg border border-border/80 sm:block">
            <Table className="min-w-[900px] text-right">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right font-semibold">الاسم</TableHead>
                  <TableHead className="text-right font-semibold">البريد</TableHead>
                  <TableHead className="text-right font-semibold">الدور</TableHead>
                  <TableHead className="text-right font-semibold">الحالة</TableHead>
                  <TableHead className="text-right font-semibold">آخر دخول</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap">تاريخ الإنشاء</TableHead>
                  <TableHead className="w-[120px] text-center font-semibold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      جاري تحميل المستخدمين…
                    </TableCell>
                  </TableRow>
                )}
                {!usersQuery.isLoading && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      لا توجد نتائج مطابقة.
                    </TableCell>
                  </TableRow>
                )}
                {filteredUsers.map((u) => {
                  const initials = initialsFromUser(u.name, u.username);
                  const lastRaw = u.lastSignedIn as unknown;
                  const lastKey = toDateKey(lastRaw);
                  const createdKey = toDateKey(u.createdAt as unknown);
                  return (
                    <TableRow key={u.id} className="hover:bg-primary/[0.04]">
                      <TableCell className="align-middle">
                        <div className="flex items-center justify-end gap-3">
                          <div className="min-w-0 text-right">
                            <div className="font-semibold leading-tight">{u.name ?? u.username}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums" dir="ltr">
                              @{u.username}
                              <span className="mx-1 text-border">·</span>
                              {branchLabelAr(u.branch)} · {shiftLabelAr(u.shift)}
                            </div>
                          </div>
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-black text-primary"
                            aria-hidden
                          >
                            {initials}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] align-middle">
                        <span className="block truncate text-sm" dir="ltr" title={u.email ?? ""}>
                          {u.email?.trim() ? u.email : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap">
                        <Badge className={cn("font-semibold", roleBadgeClass(u.role))}>{roleLabelAr(u.role)}</Badge>
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 font-semibold",
                            u.isActive
                              ? "border-emerald-500/50 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300"
                              : "border-muted-foreground/35 bg-muted/50 text-muted-foreground hover:bg-muted",
                          )}
                          title="تبديل حالة النشاط"
                          onClick={() => void handleToggleActive(u)}
                        >
                          {u.isActive ? "نشط" : "غير نشط"}
                        </Button>
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap text-sm tabular-nums">
                        {lastKey ? (
                          formatDateLabel(lastKey)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap text-sm tabular-nums">
                        {createdKey ? formatDateLabel(createdKey) : "—"}
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <div className="flex justify-center gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="تعديل" onClick={() => handleEdit(u)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="حذف"
                            onClick={() => void handleDelete(u.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setNewUser({
              username: "",
              password: "",
              name: "",
              email: "",
              role: DEFAULT_ROLE,
              branch: DEFAULT_BRANCH,
              shift: DEFAULT_SHIFT,
              writeToMssql: false,
            });
          }
        }}
      >
        <DialogContent className="max-w-xl text-right sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">اسم المستخدم</label>
              <Input
                placeholder="اسم الدخول (إنجليزي)"
                value={newUser.username}
                className="text-right"
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">كلمة المرور</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newUser.password}
                className="text-right"
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">الاسم الكامل</label>
              <Input
                placeholder="اسم الموظف"
                value={newUser.name}
                className="text-right"
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">البريد (اختياري)</label>
              <Input
                type="email"
                placeholder="name@domain.com"
                value={newUser.email}
                className="text-right"
                dir="ltr"
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">الدور</label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مسؤول</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="doctor">طبيب</SelectItem>
                  <SelectItem value="nurse">ممرض</SelectItem>
                  <SelectItem value="technician">فني</SelectItem>
                  <SelectItem value="reception">استقبال</SelectItem>
                  <SelectItem value="accountant">محاسب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">الفرع</label>
              <Select value={newUser.branch} onValueChange={(value) => setNewUser({ ...newUser, branch: value as UserBranch })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="examinations">فحوصات</SelectItem>
                  <SelectItem value="surgery">عمليات</SelectItem>
                  <SelectItem value="both">كلاهما</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">الوردية</label>
              <Select
                value={String(newUser.shift)}
                onValueChange={(value) => setNewUser({ ...newUser, shift: Number(value) === 2 ? 2 : 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوردية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{shiftLabelAr(1)}</SelectItem>
                  <SelectItem value="2">{shiftLabelAr(2)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                checked={newUser.writeToMssql}
                onCheckedChange={(checked) => setNewUser({ ...newUser, writeToMssql: Boolean(checked) })}
              />
              <label className="text-sm font-medium">كتابة على MSSQL</label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            الصلاحيات الافتراضية للدور <strong>{roleLabelAr(newUser.role)}</strong>: عدد الشاشات {getRoleDefaults(newUser.role).length}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" className="selrs-gradient-btn text-white gap-2" disabled={isSaving} onClick={() => void handleSaveUser()}>
              <Plus className="h-4 w-4" />
              إضافة
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم والصلاحيات</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">اسم المستخدم</label>
              <Input
                placeholder="اسم الدخول"
                value={editUser.username}
                className="text-right"
                onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">كلمة المرور</label>
              <Input
                type="password"
                placeholder="اتركها فارغة إن لم يتغير"
                value={editUser.password}
                className="text-right"
                onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">الاسم الكامل</label>
              <Input
                placeholder="اسم الموظف"
                value={editUser.name}
                className="text-right"
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">البريد</label>
              <Input
                type="email"
                placeholder="name@domain.com"
                value={editUser.email}
                className="text-right"
                dir="ltr"
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">الدور</label>
              <Select
                value={editUser.role}
                onValueChange={(value) => {
                  const nextRole = value as UserRole;
                  setEditUser({ ...editUser, role: nextRole });
                  setEditPermissions(getRoleDefaults(nextRole));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مسؤول</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="doctor">طبيب</SelectItem>
                  <SelectItem value="nurse">ممرض</SelectItem>
                  <SelectItem value="technician">فني</SelectItem>
                  <SelectItem value="reception">استقبال</SelectItem>
                  <SelectItem value="accountant">محاسب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">الفرع</label>
              <Select
                value={editUser.branch}
                onValueChange={(value) =>
                  setEditUser({ ...editUser, branch: value as UserBranch })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="examinations">فحوصات</SelectItem>
                  <SelectItem value="surgery">عمليات</SelectItem>
                  <SelectItem value="both">كلاهما</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">الوردية</label>
              <Select
                value={String(editUser.shift)}
                onValueChange={(value) =>
                  setEditUser({ ...editUser, shift: Number(value) === 2 ? 2 : 1 })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوردية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{shiftLabelAr(1)}</SelectItem>
                  <SelectItem value="2">{shiftLabelAr(2)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Checkbox
                checked={editUser.writeToMssql}
                onCheckedChange={(checked) =>
                  setEditUser({ ...editUser, writeToMssql: Boolean(checked) })
                }
              />
              <label className="text-sm font-medium">كتابة على MSSQL</label>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">الصلاحيات (الشاشات)</label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {permissionStateQuery.isLoading ? "…" : editPermissions.length}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-lg p-3 max-h-56 overflow-y-auto">
              {PAGE_PERMISSIONS.map((page) => (
                <label
                  key={page.id}
                  className="flex items-center gap-2 rounded border border-border px-2 py-1 text-[13px] leading-tight cursor-pointer"
                >
                  <Checkbox
                    checked={editPermissions.includes(page.id)}
                    onCheckedChange={() => togglePermission(page.id)}
                  />
                  <span>{page.label}</span>
                </label>
              ))}
            </div>
            {permissionStateQuery.isError && (
              <p className="text-xs text-red-600 mt-2">تعذر تحميل الصلاحيات.</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => void handleSaveEdit()} className="selrs-gradient-btn text-white" disabled={isSaving}>
              حفظ
            </Button>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}






