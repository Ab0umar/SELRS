import { useState } from "react";
import { PlusCircle, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

function CreateReferralForm({ onDone }: { onDone: () => void }) {
  const { data: doctors } = trpc.externalDoctors.listDoctors.useQuery();
  const [doctorId, setDoctorId] = useState("");
  const [patientCode, setPatientCode] = useState("");

  const create = trpc.externalDoctors.createReferral.useMutation({
    onSuccess: () => {
      toast.success("Referral created");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  const activeDoctors = (doctors ?? []).filter((d: any) => d.isActive);

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h3 className="font-semibold text-foreground">Add Referral</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Doctor *
          </label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {activeDoctors.map((d: any) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.fullName} (@{d.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Patient Code *
          </label>
          <Input
            value={patientCode}
            onChange={(e) => setPatientCode(e.target.value.trim())}
            placeholder="e.g. 0093"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={create.isPending || !doctorId || !patientCode}
          onClick={() =>
            create.mutate({ externalDoctorId: Number(doctorId), patientCode })
          }
        >
          {create.isPending ? "Adding..." : "Add"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function ExternalDoctorReferrals() {
  const [creating, setCreating] = useState(false);
  const { data, isLoading, refetch } =
    trpc.externalDoctors.listReferrals.useQuery();

  const toggle = trpc.externalDoctors.toggleReferral.useMutation({
    onSuccess: () => void refetch(),
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.externalDoctors.deleteReferral.useMutation({
    onSuccess: () => {
      toast.success("Referral deleted");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" dir="ltr">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Patient Referrals
            </h1>
            <p className="text-sm text-muted-foreground">
              Control which patients each external doctor can view
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin-hub/external-doctors">Doctors</Link>
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setCreating((v) => !v)}
            >
              <PlusCircle className="size-4" />
              Add Referral
            </Button>
          </div>
        </div>

        {creating && (
          <CreateReferralForm
            onDone={() => {
              setCreating(false);
              void refetch();
            }}
          />
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            No referrals yet. Add one above.
          </div>
        )}

        {data && data.length > 0 && (
          <div className="space-y-2">
            {data.map((r: any) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {r.patientName ?? r.patientCode}
                    </p>
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.patientCode}
                    </span>
                    <Badge
                      variant={r.isActive ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    → {r.doctorName ?? "Unknown"} (@{r.doctorUsername ?? "?"})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      toggle.mutate({ id: r.id, isActive: !r.isActive })
                    }
                  >
                    {r.isActive ? (
                      <>
                        <ToggleRight className="size-3.5" /> Deactivate
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="size-3.5" /> Activate
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Delete this referral?"))
                        del.mutate({ id: r.id });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
