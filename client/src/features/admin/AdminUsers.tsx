import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit2, Shield, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { toast } from "sonner";
import { cn, formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  PAGE_PERMISSION_DEFINITIONS,
  getPagePermissionGroup,
} from "@/lib/page-permissions";
import { ROUTES } from "../../../../shared/routes";
import {
  getUserRiskActionCopy,
  type UserRiskAction,
} from "./admin-users-actions";
type UserRole =
  | "admin"
  | "doctor"
  | "nurse"
  | "technician"
  | "reception"
  | "manager"
  | "accountant"
  | "worker"
  | "supervisor";
type UserBranch = "examinations" | "surgery" | "both";
type TeamPermissionsMap = Partial<Record<UserRole, string[]>>;

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
  { value: "worker", label: "عامل" },
  { value: "supervisor", label: "مشرف" },
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
    worker: "عامل",
    supervisor: "مشرف",
  };
  return m[role] ?? role;
}

function roleBadgeClass(role: UserRole): string {
  const map: Record<UserRole, string> = {
    manager: "bg-destructive/10 text-destructive border-0",
    doctor: "bg-primary/10 text-primary border-0",
    reception: "bg-success/15 text-foreground border-0",
    nurse: "bg-secondary/15 text-primary border-0",
    technician: "bg-warning/20 text-warning border-0",
    accountant: "bg-primary/15 text-primary border-0",
    admin: "bg-border text-foreground border-0",
    worker: "bg-muted text-muted-foreground border-0",
    supervisor: "bg-warning/20 text-warning border-0",
  };
  return map[role] ?? "bg-muted text-muted-foreground border-0";
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
    examinations: "طنطا",
    surgery: "كفرالشيخ",
    both: "الفرعان",
  };
  return m[b] ?? String(b);
}

function shiftLabelAr(s: 1 | 2): string {
  return s === 2 ? "مساء (2)" : "صباح (1)";
}

/** Checkbox list synced with Admin Permissions (`lib/page-permissions`). */
const PAGE_PERMISSIONS = PAGE_PERMISSION_DEFINITIONS;

const DEFAULT_ROLE: UserRole = "doctor";
const DEFAULT_BRANCH: UserBranch = "examinations";
const DEFAULT_SHIFT: 1 | 2 = 1;
const MSSQL_WRITE_PERMISSION = ROUTES.opsMssqlAdd;
const stripPermissionAccessSuffix = (permission: string) =>
  String(permission ?? "").replace(/:(r|rw)$/i, "");
const normalizeAdminPermissionPath = (permission: string) => {
  const value = String(permission ?? "");
  const aliases: Record<string, string> = {
    "/admin": "/admin-hub",
    "/admin/api-tools": "/admin-hub/api",
    "/admin/data-source-audit": "/admin-hub/audit",
    "/admin/notification-settings": "/admin-hub/notifications",
    "/admin/pentacam": "/admin-hub/pentacam-linking",
  };
  if (aliases[value]) return aliases[value];
  if (value.startsWith("/admin/")) {
    return `/admin-hub${value.slice("/admin".length)}`;
  }
  return value;
};
const normalizePermissionIdsForCheckbox = (pageIds: string[]) =>
  Array.from(
    new Set(
      pageIds
        .map(stripPermissionAccessSuffix)
        .map(normalizeAdminPermissionPath)
        .filter(Boolean),
    ),
  );
const permissionListsEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
};

function permissionBaseSet(paths: string[]): Set<string> {
  return new Set(normalizePermissionIdsForCheckbox(paths));
}

function getUserDisplayName(u: Pick<User, "name" | "username">): string {
  return String(u.name?.trim() || u.username || "المستخدم");
}

type PendingRiskAction = {
  action: UserRiskAction;
  user: User;
};

export default function AdminUsers() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const usersQuery = trpc.medical.getAllUsers.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const teamPermissionsQuery = trpc.medical.getTeamPermissions.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    },
  );

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

  const setUserPermissionsMutation =
    trpc.medical.setUserPermissions.useMutation({
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingRiskAction, setPendingRiskAction] =
    useState<PendingRiskAction | null>(null);
  const userStateQuery = trpc.medical.getUserPageState.useQuery(
    { page: "admin-users" },
    { refetchOnWindowFocus: false },
  );
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();
  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHydrateUserStateRef = useRef(false);
  const lastPermissionSyncRef = useRef("");
  const isSaving =
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    setUserPermissionsMutation.isPending;

  const permissionStateQuery = trpc.medical.getUserPermissionState.useQuery(
    { userId: editUserId ?? 0 },
    {
      enabled: Boolean(editUserId) && isEditOpen,
      refetchOnWindowFocus: false,
    },
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
      worker: (data as any)?.worker ?? [],
      supervisor: (data as any)?.supervisor ?? [],
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
    if (data.statusFilter !== undefined)
      setStatusFilter(data.statusFilter ?? "all");
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
      <div
        className="mx-auto w-full max-w-[1440px] space-y-4 px-2 py-6 text-right sm:px-0"
        dir="rtl"
      >
        <Card className="border-destructive/30 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              You do not have permission to access this page. Admin role is
              required.
            </p>
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

  const handleResetUserPermissionsToRole = async (u: User) => {
    try {
      await setUserPermissionsMutation.mutateAsync({
        userId: u.id,
        pageIds: [],
        whenEmpty: "inherit",
      });
      toast.success("User permissions were reset to role defaults.");
      await utils.medical.getUserPermissionState.invalidate();
      await utils.medical.getMyPermissions.invalidate();
    } catch (error) {
      toast.error(
        getTrpcErrorMessage(error, "Failed to reset user permissions."),
      );
    }
  };

  const requestRiskAction = (action: UserRiskAction, targetUser: User) => {
    setPendingRiskAction({ action, user: targetUser });
  };

  const confirmPendingRiskAction = async () => {
    if (!pendingRiskAction) return;
    const { action, user: targetUser } = pendingRiskAction;
    if (action === "delete") {
      await handleDelete(targetUser.id);
    } else if (action === "reset-permissions") {
      await handleResetUserPermissionsToRole(targetUser);
    } else {
      await handleToggleActive(targetUser);
    }
    setPendingRiskAction(null);
  };

  useEffect(() => {
    if (!isEditOpen || !permissionStateQuery.data) return;
    const incomingPages = normalizePermissionIdsForCheckbox(
      permissionStateQuery.data.pageIds,
    );
    const signature = JSON.stringify({
      userId: editUserId,
      role: editUser.role,
      hasOverride: permissionStateQuery.data.hasOverride,
      hasInheritExtrasMarker: permissionStateQuery.data.hasInheritExtrasMarker,
      hasExplicitEmptyOverride:
        permissionStateQuery.data.hasExplicitEmptyOverride,
      pages: incomingPages.slice().sort(),
    });
    if (lastPermissionSyncRef.current === signature) return;
    lastPermissionSyncRef.current = signature;

    if (permissionStateQuery.data.hasExplicitEmptyOverride) {
      setEditPermissions([]);
      setEditUser((prev) =>
        prev.writeToMssql ? { ...prev, writeToMssql: false } : prev,
      );
      return;
    }

    if (!permissionStateQuery.data.hasOverride) {
      const defaults = getRoleDefaults(editUser.role);
      const nextWriteToMssql = defaults.includes(MSSQL_WRITE_PERMISSION);
      setEditPermissions((prev) =>
        permissionListsEqual(prev, defaults) ? prev : defaults,
      );
      setEditUser((prev) =>
        prev.writeToMssql === nextWriteToMssql
          ? prev
          : { ...prev, writeToMssql: nextWriteToMssql },
      );
      return;
    }

    if (permissionStateQuery.data.hasInheritExtrasMarker) {
      const merged = normalizePermissionIdsForCheckbox([
        ...getRoleDefaults(editUser.role),
        ...incomingPages,
      ]);
      const nextWriteToMssql = merged.includes(MSSQL_WRITE_PERMISSION);
      setEditPermissions((prev) =>
        permissionListsEqual(prev, merged) ? prev : merged,
      );
      setEditUser((prev) =>
        prev.writeToMssql === nextWriteToMssql
          ? prev
          : { ...prev, writeToMssql: nextWriteToMssql },
      );
      return;
    }

    const nextWriteToMssql = incomingPages.includes(MSSQL_WRITE_PERMISSION);
    setEditPermissions((prev) =>
      permissionListsEqual(prev, incomingPages) ? prev : incomingPages,
    );
    setEditUser((prev) =>
      prev.writeToMssql === nextWriteToMssql
        ? prev
        : { ...prev, writeToMssql: nextWriteToMssql },
    );
  }, [permissionStateQuery.data, isEditOpen, editUserId, editUser.role]);

  const togglePermission = (pageId: string) => {
    setEditPermissions((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId],
    );
  };

  const handleRestoreRolePermissions = async () => {
    if (!editUserId) return;
    try {
      await setUserPermissionsMutation.mutateAsync({
        userId: editUserId,
        pageIds: [],
        whenEmpty: "inherit",
      });
      const defaults = getRoleDefaults(editUser.role);
      const nextMssql = defaults.includes(MSSQL_WRITE_PERMISSION);
      lastPermissionSyncRef.current = "";
      setEditPermissions(defaults);
      setEditUser((prev) =>
        prev.writeToMssql === nextMssql
          ? prev
          : { ...prev, writeToMssql: nextMssql },
      );
      await utils.medical.getUserPermissionState.invalidate();
      await permissionStateQuery.refetch();
      toast.success("تمت استعادة صلاحيات الدور الافتراضية لهذا المستخدم.");
    } catch (error) {
      toast.error(
        getTrpcErrorMessage(error, "تعذر استعادة الصلاحيات الافتراضية."),
      );
    }
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
        roleBases.size === editBases.size &&
        [...roleBases].every((b) => editBases.has(b));

      if (sameAsRole) {
        await setUserPermissionsMutation.mutateAsync({
          userId: editUserId,
          pageIds: [],
          whenEmpty: "inherit",
        });
      } else {
        const roleSubsetOfEdit = [...roleBases].every((x) => editBases.has(x));
        const strictSuperset =
          roleSubsetOfEdit && editBases.size > roleBases.size;

        if (strictSuperset) {
          const extras = finalPermissions.filter(
            (id) => !roleBases.has(stripPermissionAccessSuffix(id)),
          );
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
  const selectedUser =
    filteredUsers.find((candidate) => candidate.id === selectedUserId) ??
    filteredUsers[0] ??
    null;
  const pendingRiskCopy = pendingRiskAction
    ? getUserRiskActionCopy({
        action: pendingRiskAction.action,
        displayName: getUserDisplayName(pendingRiskAction.user),
        isActive: pendingRiskAction.user.isActive,
      })
    : null;

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-5 pb-4 text-right"
      dir="rtl"
    >
      <PageHeader
        title="المستخدمين"
        subtitle="إضافة حسابات الموظفين وإدارة الأدوار والصلاحيات"
        icon={<Shield className="h-5 w-5" />}
        action={
          <Button
            type="button"
            size="sm"
            className="selrs-gradient-btn gap-2 text-primary-foreground"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">مستخدم جديد</span>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-[var(--bento-shadow-soft)]">
          <p className="text-xs font-medium text-muted-foreground">الإجمالي</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {usersTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" /> نشط
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {usersActive}
          </p>
        </div>
        <div className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <span className="size-1.5 rounded-full bg-destructive" /> غير نشط
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {usersInactive}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--bento-shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="بحث بالاسم أو اسم الدخول…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as UserRole | "all")}
            >
              <SelectTrigger className="h-10 w-[150px] bg-background">
                <SelectValue placeholder="الدور" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_TABS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "all" | "active" | "inactive")
              }
            >
              <SelectTrigger className="h-10 w-[140px] bg-background">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px] text-right">
            <TableHeader>
              <TableRow className="border-b-border/60 hover:bg-transparent">
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  المستخدم
                </TableHead>
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  الدور
                </TableHead>
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  الفرع
                </TableHead>
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  الوردية
                </TableHead>
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  آخر دخول
                </TableHead>
                <TableHead className="h-11 text-center font-semibold text-muted-foreground">
                  الحالة
                </TableHead>
                <TableHead className="h-11 w-14" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10">
                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4].map((item) => (
                        <div
                          key={item}
                          className="h-8 animate-pulse rounded-md bg-muted"
                        />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
              {!usersQuery.isLoading && filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-14 text-center text-sm text-muted-foreground"
                  >
                    لا توجد حسابات مطابقة.
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredUsers.map((account) => {
                const lastKey = toDateKey(account.lastSignedIn);
                return (
                  <TableRow
                    key={account.id}
                    onClick={() => setSelectedUserId(account.id)}
                    className="cursor-pointer transition-colors hover:bg-primary/5"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initialsFromUser(account.name, account.username)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {account.name ?? account.username}
                          </span>
                          <span
                            className="block truncate text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            @{account.username}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] font-semibold",
                          roleBadgeClass(account.role),
                        )}
                      >
                        {roleLabelAr(account.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branchLabelAr(account.branch)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {shiftLabelAr(account.shift)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {lastKey ? formatDateLabel(lastKey) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                          account.isActive
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            account.isActive
                              ? "bg-success"
                              : "bg-muted-foreground/50",
                          )}
                        />
                        {account.isActive ? "نشط" : "موقوف"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        aria-label={`إدارة ${account.name ?? account.username}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedUserId(account.id);
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      >
        <SheetContent
          side="left"
          className="w-full overflow-y-auto p-0 sm:max-w-lg"
        >
          {selectedUser ? (
            <>
              <SheetHeader className="space-y-3 border-b border-border/60 px-6 pb-5 pt-6 text-right">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {initialsFromUser(selectedUser.name, selectedUser.username)}
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-lg font-bold">
                      {selectedUser.name ?? selectedUser.username}
                    </SheetTitle>
                    <p
                      className="mt-0.5 truncate text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      @{selectedUser.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold",
                      roleBadgeClass(selectedUser.role),
                    )}
                  >
                    {roleLabelAr(selectedUser.role)}
                  </Badge>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                      selectedUser.isActive
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        selectedUser.isActive
                          ? "bg-success"
                          : "bg-muted-foreground/50",
                      )}
                    />
                    {selectedUser.isActive ? "حساب نشط" : "حساب موقوف"}
                  </span>
                </div>
              </SheetHeader>

              <div className="space-y-7 px-6 py-6">
                <section>
                  <h3 className="mb-3 text-sm font-bold">بيانات الحساب</h3>
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        البريد الإلكتروني
                      </dt>
                      <dd className="mt-1 text-sm font-medium" dir="ltr">
                        {selectedUser.email?.trim() || "غير محدد"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        الدور الوظيفي
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {roleLabelAr(selectedUser.role)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">الفرع</dt>
                      <dd className="mt-1 text-sm font-medium">
                        {branchLabelAr(selectedUser.branch)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">الوردية</dt>
                      <dd className="mt-1 text-sm font-medium">
                        {shiftLabelAr(selectedUser.shift)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        آخر دخول
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {toDateKey(selectedUser.lastSignedIn)
                          ? formatDateLabel(toDateKey(selectedUser.lastSignedIn))
                          : "لم يدخل بعد"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        تاريخ الإنشاء
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {toDateKey(selectedUser.createdAt)
                          ? formatDateLabel(toDateKey(selectedUser.createdAt))
                          : "غير محدد"}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-bold">الصلاحيات</h3>
                  <p className="text-xs text-muted-foreground">
                    تُدار من تعديل الحساب، ويمكن الرجوع إلى افتراضيات الدور.
                  </p>
                </section>

                <section className="space-y-2 border-t border-border/60 pt-5">
                  <h3 className="mb-1 text-sm font-bold">إجراءات</h3>
                  <Button
                    type="button"
                    className="w-full gap-2"
                    onClick={() => handleEdit(selectedUser)}
                  >
                    <Edit2 className="h-4 w-4" /> تعديل الحساب
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => requestRiskAction("toggle-active", selectedUser)}
                  >
                    {selectedUser.isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() =>
                      requestRiskAction("reset-permissions", selectedUser)
                    }
                    disabled={setUserPermissionsMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4" /> استعادة صلاحيات الدور
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => requestRiskAction("delete", selectedUser)}
                  >
                    <Trash2 className="h-4 w-4" /> حذف الحساب
                  </Button>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

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
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">كلمة المرور</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newUser.password}
                className="text-right"
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">الاسم الكامل</label>
              <Input
                placeholder="اسم الموظف"
                value={newUser.name}
                className="text-right"
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
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
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">الدور</label>
              <Select
                value={newUser.role}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, role: value as UserRole })
                }
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
                  <SelectItem value="worker">عامل</SelectItem>
                  <SelectItem value="supervisor">مشرف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">الفرع</label>
              <Select
                value={newUser.branch}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, branch: value as UserBranch })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="examinations">طنطا</SelectItem>
                  <SelectItem value="surgery">كفرالشيخ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-sm font-semibold">الوردية</label>
              <Select
                value={String(newUser.shift)}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, shift: Number(value) === 2 ? 2 : 1 })
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
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                checked={newUser.writeToMssql}
                onCheckedChange={(checked) =>
                  setNewUser({ ...newUser, writeToMssql: Boolean(checked) })
                }
              />
              <label className="text-sm font-medium">كتابة على MSSQL</label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            الصلاحيات الافتراضية للدور{" "}
            <strong>{roleLabelAr(newUser.role)}</strong>: عدد الشاشات{" "}
            {getRoleDefaults(newUser.role).length}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              className="selrs-gradient-btn text-primary-foreground gap-2"
              disabled={isSaving}
              onClick={() => void handleSaveUser()}
            >
              <Plus className="h-4 w-4" />
              إضافة
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          className="max-h-[92vh] max-w-[1100px] overflow-y-auto text-right"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-xl">
              تعديل الحساب والصلاحيات
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section>
              <div className="mb-3 text-sm font-bold">بيانات الحساب</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    اسم المستخدم
                  </label>
                  <Input
                    placeholder="اسم الدخول"
                    value={editUser.username}
                    className="text-right"
                    onChange={(e) =>
                      setEditUser({ ...editUser, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    كلمة المرور
                  </label>
                  <Input
                    type="password"
                    placeholder="اتركها فارغة إن لم يتغير"
                    value={editUser.password}
                    className="text-right"
                    onChange={(e) =>
                      setEditUser({ ...editUser, password: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    الاسم الكامل
                  </label>
                  <Input
                    placeholder="اسم الموظف"
                    value={editUser.name}
                    className="text-right"
                    onChange={(e) =>
                      setEditUser({ ...editUser, name: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    البريد
                  </label>
                  <Input
                    type="email"
                    placeholder="name@domain.com"
                    value={editUser.email}
                    className="text-right"
                    dir="ltr"
                    onChange={(e) =>
                      setEditUser({ ...editUser, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    الدور
                  </label>
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
                      <SelectItem value="worker">عامل</SelectItem>
                      <SelectItem value="supervisor">مشرف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    الفرع
                  </label>
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
                      <SelectItem value="examinations">طنطا</SelectItem>
                      <SelectItem value="surgery">كفرالشيخ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    الوردية
                  </label>
                  <Select
                    value={String(editUser.shift)}
                    onValueChange={(value) =>
                      setEditUser({
                        ...editUser,
                        shift: Number(value) === 2 ? 2 : 1,
                      })
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
                      setEditUser({
                        ...editUser,
                        writeToMssql: Boolean(checked),
                      })
                    }
                  />
                  <label className="text-sm font-medium">كتابة على MSSQL</label>
                </div>
              </div>
            </section>

            <section className="min-w-0 border-t border-border pt-5 lg:border-t-0 lg:border-r lg:pr-7 lg:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="block text-sm font-semibold">
                  الصلاحيات (الشاشات)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {permissionStateQuery.isLoading
                      ? "…"
                      : editPermissions.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    disabled={
                      setUserPermissionsMutation.isPending || !editUserId
                    }
                    onClick={() => void handleRestoreRolePermissions()}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    استعادة افتراضيات الدور
                  </Button>
                </div>
              </div>
              <div className="grid max-h-[520px] grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
                {PAGE_PERMISSIONS.map((page, idx) => {
                  const prevEntry =
                    idx > 0 ? PAGE_PERMISSIONS[idx - 1] : undefined;
                  const prevGroup = prevEntry
                    ? getPagePermissionGroup(prevEntry)
                    : undefined;
                  const groupLabel = getPagePermissionGroup(page);
                  const showGroupHeader = Boolean(
                    groupLabel && groupLabel !== prevGroup,
                  );
                  return (
                    <Fragment key={page.id}>
                      {showGroupHeader ? (
                        <div className="col-span-full sticky top-0 z-10 border-b border-border bg-background py-2 text-xs font-bold text-foreground">
                          {groupLabel}
                        </div>
                      ) : null}
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-[13px] leading-tight hover:bg-muted/30">
                        <Checkbox
                          checked={editPermissions.includes(page.id)}
                          onCheckedChange={() => togglePermission(page.id)}
                        />
                        <span>{page.label}</span>
                      </label>
                    </Fragment>
                  );
                })}
              </div>
              {permissionStateQuery.isError && (
                <p className="text-xs text-destructive mt-2">
                  تعذر تحميل الصلاحيات.
                </p>
              )}
            </section>
          </div>

          <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-border bg-background px-6 pt-4">
            <Button
              onClick={() => void handleSaveEdit()}
              className="selrs-gradient-btn text-primary-foreground"
              disabled={isSaving}
            >
              حفظ
            </Button>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingRiskAction)}
        onOpenChange={(open) => {
          if (!open) setPendingRiskAction(null);
        }}
      >
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>{pendingRiskCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {pendingRiskCopy?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRiskAction ? (
            <div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm">
              <div className="font-semibold">
                {getUserDisplayName(pendingRiskAction.user)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {roleLabelAr(pendingRiskAction.user.role)}،{" "}
                {branchLabelAr(pendingRiskAction.user.branch)}،{" "}
                {shiftLabelAr(pendingRiskAction.user.shift)}
              </div>
            </div>
          ) : null}
          <AlertDialogFooter className="sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                pendingRiskCopy?.tone === "danger"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : pendingRiskCopy?.tone === "warning"
                    ? "bg-warning text-warning-foreground hover:bg-warning/90"
                    : "selrs-gradient-btn text-primary-foreground",
              )}
              disabled={isSaving}
              onClick={() => void confirmPendingRiskAction()}
            >
              {pendingRiskCopy?.confirmLabel ?? "تأكيد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
