import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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

const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  manager: "Manager",
  accountant: "Accountant",
  doctor: "Doctor",
  nurse: "Nurse",
  technician: "Technician",
  reception: "Reception",
};

const PAGE_PERMISSIONS = [
  { id: "/dashboard", label: "Dashboard" },
  { id: "/patient-data/edit", label: "Edit Patient Data (Dashboard / Examination)" },
  { id: "/patients", label: "Patients" },
  { id: "/patients/:id", label: "Patient Details" },
  { id: "/patient-file", label: "Medical File" },
  { id: "/examination", label: "Examinations" },
  { id: "/operations", label: "Operations / Operation List" },
  { id: "/operations/accounts", label: "Operations - Accounts" },
  { id: "/medical-reports", label: "Medical Reports" },
  { id: "/patient-summary", label: "Patient Summary Report" },
  { id: "/sheets/consultant/:id", label: "Consultant Sheet" },
  { id: "/sheets/specialist/:id", label: "Specialist Sheet" },
  { id: "/sheets/lasik/:id", label: "Lasik Sheet" },
  { id: "/sheets/external/:id", label: "External Sheet" },
  { id: "/medications", label: "Medications & Tests" },
  { id: "/prescription", label: "Prescription" },
  { id: "/refraction/:id", label: "Refraction Page" },
  { id: "/tests", label: "Tests Management" },
  { id: "/request-tests", label: "Request Tests" },
  { id: "/quick-entry", label: "Quick Patient Entry" },
  { id: "/doctor/patient/:id", label: "Doctor Patient View" },
  { id: "/visits", label: "Patient Visits" },
  { id: "/followup/:id", label: "Followup Form" },
  { id: "/followups", label: "Followups List" },
  { id: "/new-cases", label: "New Cases" },
  { id: "/admin/users", label: "Admin Users" },
  { id: "/admin/permissions", label: "Admin Permissions" },
  { id: "/admin/doctors", label: "Admin Doctors" },
  { id: "/admin/settings", label: "Admin Settings" },
  { id: "/admin/sheets", label: "Admin Sheets" },
  { id: "/admin/sheet-designer", label: "Admin Sheet Designer" },
  { id: "/admin/migrations", label: "Admin Migrations" },
  { id: "/admin/status", label: "Admin Status" },
  { id: "/admin/api-tools", label: "Admin API Tools" },
  { id: "/admin/settings/pricing-rules", label: "Appointments Pricing Rules (Page)" },
  { id: "appointments_pricing_v1", label: "Appointments Pricing Rules (Key)" },
  { id: "/ops/mssql-add", label: "MSSQL Adding (Create Patient Sync)" },
] as const;

const ROLE_ORDER: TeamRole[] = [
  "admin",
  "manager",
  "accountant",
  "doctor",
  "nurse",
  "technician",
  "reception",
];

function getLevel(permissions: string[], pageId: string): AccessLevel {
  const rw = permissions.find((e) => e === `${pageId}:rw`);
  if (rw) return "rw";
  const r = permissions.find((e) => e === `${pageId}:r` || e === pageId);
  if (r) return "r";
  return "none";
}

function setLevel(permissions: string[], pageId: string, level: AccessLevel): string[] {
  const filtered = permissions.filter(
    (e) => e !== pageId && e !== `${pageId}:r` && e !== `${pageId}:rw`
  );
  if (level === "r") return [...filtered, pageId, `${pageId}:r`];
  if (level === "rw") return [...filtered, pageId, `${pageId}:rw`];
  return filtered;
}

function AccessToggle({
  level,
  onChange,
}: {
  level: AccessLevel;
  onChange: (l: AccessLevel) => void;
}) {
  const base = "px-1.5 py-0.5 text-[10px] font-semibold border transition-colors focus:outline-none";
  const active = "bg-slate-700 text-white border-slate-700";
  const inactive = "bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600";

  return (
    <div className="inline-flex rounded overflow-hidden border border-slate-200">
      <button
        type="button"
        className={`${base} ${level === "none" ? active : inactive} rounded-l`}
        onClick={() => onChange("none")}
        title="No access"
      >
        -
      </button>
      <button
        type="button"
        className={`${base} ${level === "r" ? "bg-blue-600 text-white border-blue-600" : inactive} border-l`}
        onClick={() => onChange("r")}
        title="Read only"
      >
        R
      </button>
      <button
        type="button"
        className={`${base} ${level === "rw" ? "bg-emerald-600 text-white border-emerald-600" : inactive} border-l rounded-r`}
        onClick={() => onChange("rw")}
        title="Read & Write"
      >
        R&W
      </button>
    </div>
  );
}

export default function AdminPermissions() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [permissions, setPermissions] = useState<TeamPermissionsMap>(DEFAULT_TEAM_PERMISSIONS);
  const permissionsQuery = trpc.medical.getTeamPermissions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const saveMutation = trpc.medical.setTeamPermissions.useMutation({
    onSuccess: () => {
      toast.success("Role permissions updated");
      utils.medical.getTeamPermissions.invalidate();
    },
    onError: () => {
      toast.error("Failed to update role permissions");
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

  const handleChange = (role: TeamRole, pageId: string, level: AccessLevel) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: setLevel(prev[role] ?? [], pageId, level),
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-[1400px] border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Set access level per role: <span className="font-semibold text-blue-600">R</span> = read-only, <span className="font-semibold text-emerald-600">R&W</span> = read &amp; write, <span className="font-semibold text-slate-500">-</span> = no access.
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/90">
                  <th className="p-2 text-left whitespace-nowrap">Page</th>
                  {ROLE_ORDER.map((role) => (
                    <th key={role} className="p-2 text-center whitespace-nowrap">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAGE_PERMISSIONS.map((perm) => (
                  <tr key={perm.id} className="border-b last:border-b-0 hover:bg-slate-50/50">
                    <td className="p-2 font-medium whitespace-nowrap">{perm.label}</td>
                    {ROLE_ORDER.map((role) => (
                      <td key={`${perm.id}-${role}`} className="p-2 text-center">
                        <AccessToggle
                          level={getLevel(permissions[role], perm.id)}
                          onChange={(level) => handleChange(role, perm.id, level)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button
              onClick={() => void saveMutation.mutateAsync(permissions)}
              disabled={saveMutation.isPending || permissionsQuery.isLoading}
            >
              {saveMutation.isPending ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
