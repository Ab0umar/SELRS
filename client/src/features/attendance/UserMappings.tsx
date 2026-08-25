import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Pencil, X, Link2, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMobile";

const ROLE_AR: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مدير",
  doctor: "طبيب",
  nurse: "ممرض",
  reception: "استقبال",
  technician: "تقني",
  accountant: "محاسب",
};

export default function UserMappings() {
  const isMobile = useIsMobile();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  const query = (trpc as any).attendance.listUserMappings.useQuery();
  const empQuery = (trpc as any).attendance.employeesList.useQuery();

  const setMapping = (trpc as any).attendance.setUserMapping.useMutation({
    onSuccess: () => {
      query.refetch();
      setEditingId(null);
      toast.success("تم الحفظ");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isLoading = query.isLoading || empQuery.isLoading;
  if (isLoading)
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );

  const rows: any[] = query.data ?? [];
  const employees: any[] = empQuery.data?.employees ?? [];

  // empCds already linked to another user (to prevent double-linking)
  const usedEmpCds = new Set(rows.filter((r) => r.empCd).map((r) => r.empCd));

  const empLabel = (empCd: string) => {
    const emp = employees.find((e: any) => e.empCd === empCd);
    return emp ? `${emp.fullName || emp.empCd} (${emp.empCd})` : empCd;
  };

  return (
    <div className="p-4" dir="rtl">
      <p className="mb-4 text-sm text-muted-foreground">
        اربط كل مستخدم بموظفه المقابل في جهاز البصمة حتى تظهر له بيانات حضوره في
        صفحة "حضوري".
      </p>
      {isMobile ? (
        <div className="space-y-2">
          {rows.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-border bg-background p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {u.name || u.username}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {u.username} · {ROLE_AR[u.role] ?? u.role}
                  </div>
                </div>
                {u.empCd ? (
                  <Badge
                    variant="outline"
                    className="border-success/40 bg-success/10 text-success gap-1"
                  >
                    <Link2 className="h-3 w-3" />
                    مرتبط
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-muted text-muted-foreground gap-1"
                  >
                    <LinkIcon className="h-3 w-3" />
                    غير مرتبط
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2">
                {editingId === u.id ? (
                  <>
                    <select
                      autoFocus
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    >
                      <option value="">— بدون ربط —</option>
                      {employees.map((emp: any) => {
                        const alreadyTaken =
                          usedEmpCds.has(emp.empCd) && emp.empCd !== u.empCd;
                        return (
                          <option
                            key={emp.empCd}
                            value={emp.empCd}
                            disabled={alreadyTaken}
                          >
                            {emp.fullName || emp.empCd} ({emp.empCd})
                            {alreadyTaken ? " — مرتبط بمستخدم آخر" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 shrink-0 text-success"
                      disabled={setMapping.isPending}
                      onClick={() =>
                        setMapping.mutate({
                          userId: u.id,
                          empCd: editVal || null,
                        })
                      }
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 shrink-0 text-destructive"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex-1 text-sm ${u.empCd ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {u.empCd ? empLabel(u.empCd) : "بدون ربط"}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 shrink-0"
                      onClick={() => {
                        setEditingId(u.id);
                        setEditVal(u.empCd ?? "");
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-right font-medium">المستخدم</th>
              <th className="px-3 py-2 text-right font-medium">الدور</th>
              <th className="px-3 py-2 text-right font-medium">
                موظف البصمة المرتبط
              </th>
              <th className="px-3 py-2 text-right font-medium">الحالة</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2">
                  <div className="font-medium">{u.name || u.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.username}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {ROLE_AR[u.role] ?? u.role}
                </td>
                <td className="px-3 py-2">
                  {editingId === u.id ? (
                    <select
                      autoFocus
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm w-56"
                    >
                      <option value="">— بدون ربط —</option>
                      {employees.map((emp: any) => {
                        const alreadyTaken =
                          usedEmpCds.has(emp.empCd) && emp.empCd !== u.empCd;
                        return (
                          <option
                            key={emp.empCd}
                            value={emp.empCd}
                            disabled={alreadyTaken}
                          >
                            {emp.fullName || emp.empCd} ({emp.empCd})
                            {alreadyTaken ? " — مرتبط بمستخدم آخر" : ""}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <span
                      className={
                        u.empCd ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {u.empCd ? empLabel(u.empCd) : "—"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {u.empCd ? (
                    <Badge
                      variant="outline"
                      className="border-success/40 bg-success/10 text-success gap-1"
                    >
                      <Link2 className="h-3 w-3" />
                      مرتبط
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-muted text-muted-foreground gap-1"
                    >
                      <LinkIcon className="h-3 w-3" />
                      غير مرتبط
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  {editingId === u.id ? (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-success"
                        disabled={setMapping.isPending}
                        onClick={() =>
                          setMapping.mutate({
                            userId: u.id,
                            empCd: editVal || null,
                          })
                        }
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingId(u.id);
                        setEditVal(u.empCd ?? "");
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
