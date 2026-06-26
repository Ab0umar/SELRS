import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { RefreshCw, Trash2 } from "lucide-react";
type DupRow = {
  id: number;
  file_name: string | null;
  s3_key: string | null;
  patient_id: number | null;
  created_at: string | null;
  dup_id: number;
  dup_file_name: string | null;
  dup_s3_key: string | null;
  dup_patient_id: number | null;
  dup_created_at: string | null;
  patient_name: string | null;
  patientCode: string | null;
};

type DupGroup = {
  baseName: string;
  original: { id: number; file_name: string | null; s3_key: string | null; patient_id: number | null; created_at: string | null };
  duplicates: { id: number; file_name: string | null; s3_key: string | null; patient_id: number | null; created_at: string | null }[];
  patient_name: string | null;
  patientCode: string | null;
};

function baseName(filePath: string | null): string {
  if (!filePath) return "";
  return filePath.split("/").pop() ?? filePath;
}

function groupDuplicates(rows: DupRow[]): DupGroup[] {
  const grouped = new Map<number, DupGroup>();
  for (const row of rows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        baseName: baseName(row.file_name),
        original: { id: row.id, file_name: row.file_name, s3_key: row.s3_key, patient_id: row.patient_id, created_at: String(row.created_at ?? "") },
        duplicates: [],
        patient_name: row.patient_name,
        patientCode: row.patientCode,
      });
    }
    grouped.get(row.id)!.duplicates.push({
      id: row.dup_id,
      file_name: row.dup_file_name,
      s3_key: row.dup_s3_key,
      patient_id: row.dup_patient_id,
      created_at: String(row.dup_created_at ?? ""),
    });
  }
  return Array.from(grouped.values());
}

export default function AdminPentacamDuplicates() {
  const [deleteS3, setDeleteS3] = useState(true);
  const [deleteLocal, setDeleteLocal] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const dupsQuery = trpc.medical.findDuplicateSrv100Uploads.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const deleteMutation = trpc.medical.deleteSrv100UploadsByIds.useMutation({
    onSuccess: (result) => {
      toast.success(`تم حذف ${result.deleted} سجل${result.s3Deleted ? ` (S3: ${result.s3Deleted})` : ""}`);
      setSelected(new Set());
      void dupsQuery.refetch();
    },
    onError: (err) => toast.error(getTrpcErrorMessage(err, "فشل الحذف")),
  });

  const groups = useMemo(() => groupDuplicates((dupsQuery.data ?? []) as DupRow[]), [dupsQuery.data]);

  const allDupIds = useMemo(() => groups.flatMap((g) => g.duplicates.map((d) => d.id)), [groups]);

  const toggleAll = () => {
    if (selected.size === allDupIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allDupIds));
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    if (!selected.size) return;
    deleteMutation.mutate({
      ids: Array.from(selected),
      deleteFromS3: deleteS3,
      deleteLocalFile: deleteLocal,
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold">المكررات في srv100_uploads</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => dupsQuery.refetch()}
          disabled={dupsQuery.isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${dupsQuery.isFetching ? "animate-spin" : ""}`} />
          تحديث
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={deleteS3} onChange={(e) => setDeleteS3(e.target.checked)} />
            حذف من S3
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={deleteLocal} onChange={(e) => setDeleteLocal(e.target.checked)} />
            حذف من الجهاز المحلي
          </label>
        </div>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف المحددة ({selected.size})
          </Button>
        )}
      </div>

      {dupsQuery.isLoading && <p className="text-xs text-muted-foreground">جاري البحث...</p>}
      {!dupsQuery.isLoading && groups.length === 0 && (
        <p className="text-xs text-muted-foreground">لا توجد مكررات</p>
      )}

      {groups.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full min-w-[700px] border-collapse text-xs text-right">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b border-border/50 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.size === allDupIds.length && allDupIds.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="border-b border-border/50 px-3 py-2 font-medium">اسم الملف</th>
                <th className="border-b border-border/50 px-3 py-2 font-medium">المريض</th>
                <th className="border-b border-border/50 px-3 py-2 font-medium">ID الأصل</th>
                <th className="border-b border-border/50 px-3 py-2 font-medium">ID المكرر</th>
                <th className="border-b border-border/50 px-3 py-2 font-medium">تاريخ المكرر</th>
                <th className="border-b border-border/50 px-3 py-2 font-medium">S3 Key</th>
                <th className="border-b border-border/50 px-3 py-2 font-medium">حذف</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) =>
                group.duplicates.map((dup, i) => (
                  <tr key={dup.id} className="hover:bg-muted/30 transition-colors">
                    <td className="border-b border-border/20 px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={selected.has(dup.id)}
                        onChange={() => toggle(dup.id)}
                      />
                    </td>
                    <td className="border-b border-border/20 px-3 py-1.5 font-mono" dir="ltr">
                      {i === 0 ? group.baseName : ""}
                    </td>
                    <td className="border-b border-border/20 px-3 py-1.5">
                      {group.patient_name ? `${group.patient_name}${group.patientCode ? ` (${group.patientCode})` : ""}` : "—"}
                    </td>
                    <td className="border-b border-border/20 px-3 py-1.5 tabular-nums" dir="ltr">
                      {group.original.id}
                    </td>
                    <td className="border-b border-border/20 px-3 py-1.5 tabular-nums" dir="ltr">
                      {dup.id}
                    </td>
                    <td className="border-b border-border/20 px-3 py-1.5 tabular-nums" dir="ltr">
                      {dup.created_at ? new Date(dup.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="border-b border-border/20 px-3 py-1.5 font-mono text-[10px] max-w-[180px] truncate" dir="ltr" title={dup.s3_key ?? ""}>
                      {dup.s3_key ?? "—"}
                    </td>
                    <td className="border-b border-border/20 px-3 py-1.5">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        disabled={deleteMutation.isPending}
                        onClick={() =>
                          deleteMutation.mutate({
                            ids: [dup.id],
                            deleteFromS3: deleteS3,
                            deleteLocalFile: deleteLocal,
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
