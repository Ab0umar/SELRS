import { useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  PlusCircle,
  UserCheck,
  UserX,
} from "lucide-react";
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

type Doctor = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  doctorCode: string | null;
  isActive: boolean;
  createdAt: Date;
};

function DoctorCodeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: internalDoctors } =
    trpc.externalDoctors.listInternalDoctors.useQuery();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Map to internal doctor..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— None —</SelectItem>
        {(internalDoctors ?? []).map((d: any) => (
          <SelectItem key={d.id} value={d.code ?? d.id}>
            {d.name} {d.code ? `(${d.code})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CreateDoctorForm({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [showPw, setShowPw] = useState(false);

  const create = trpc.externalDoctors.createDoctor.useMutation({
    onSuccess: () => {
      toast.success("Doctor created");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  const resolvedCode =
    doctorCode === "__none__" ? undefined : doctorCode || undefined;

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h3 className="font-semibold text-foreground">Create External Doctor</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Full Name *
          </label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dr. Ahmed Mohamed"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Username *
          </label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="dr.ahmed"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Password *
          </label>
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPw ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@clinic.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Phone
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">
            Internal Doctor Mapping
          </label>
          <DoctorCodeSelect value={doctorCode} onChange={setDoctorCode} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={create.isPending || !username || !password || !fullName}
          onClick={() =>
            create.mutate({
              username,
              password,
              fullName,
              email: email || undefined,
              phone: phone || undefined,
              doctorCode: resolvedCode,
            })
          }
        >
          {create.isPending ? "Creating..." : "Create"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ResetPasswordForm({
  doctorId,
  onDone,
}: {
  doctorId: number;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const reset = trpc.externalDoctors.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="relative flex-1">
        <Input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="pr-9 text-xs h-8"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {showPw ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </button>
      </div>
      <Button
        size="sm"
        className="h-8 text-xs"
        disabled={reset.isPending || !password}
        onClick={() => reset.mutate({ id: doctorId, newPassword: password })}
      >
        {reset.isPending ? "..." : "Reset"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 text-xs"
        onClick={onDone}
      >
        Cancel
      </Button>
    </div>
  );
}

function EditDoctorCodeForm({
  doc,
  onDone,
}: {
  doc: Doctor;
  onDone: () => void;
}) {
  const [doctorCode, setDoctorCode] = useState(doc.doctorCode ?? "");
  const update = trpc.externalDoctors.updateDoctor.useMutation({
    onSuccess: () => {
      toast.success("Doctor code updated");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  const resolvedCode = doctorCode === "__none__" ? null : doctorCode || null;
  return (
    <div className="mt-2 flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Internal Doctor Mapping
        </label>
        <DoctorCodeSelect value={doctorCode} onChange={setDoctorCode} />
      </div>
      <Button
        size="sm"
        className="h-9 text-xs"
        disabled={update.isPending}
        onClick={() => update.mutate({ id: doc.id, doctorCode: resolvedCode })}
      >
        {update.isPending ? "..." : "Save"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-9 text-xs"
        onClick={onDone}
      >
        Cancel
      </Button>
    </div>
  );
}

export default function ExternalDoctors() {
  const [creating, setCreating] = useState(false);
  const [resetingId, setResetingId] = useState<number | null>(null);
  const [editingCodeId, setEditingCodeId] = useState<number | null>(null);

  const { data, isLoading, refetch } =
    trpc.externalDoctors.listDoctors.useQuery();
  const toggleActive = trpc.externalDoctors.updateDoctor.useMutation({
    onSuccess: () => {
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 pb-4" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            الأطباء الخارجيون
          </h1>
          <p className="text-sm text-muted-foreground">
            إدارة حسابات الأطباء في البوابة الخارجية وربطها بسجل الأطباء
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin-hub/external-doctors/referrals">الإحالات</Link>
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setCreating((v) => !v)}
          >
            <PlusCircle className="size-4" />
            إضافة طبيب
          </Button>
        </div>
      </div>

      {creating && (
        <CreateDoctorForm
          onDone={() => {
            setCreating(false);
            void refetch();
          }}
        />
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          لا توجد حسابات أطباء خارجيين حتى الآن.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {(data as Doctor[]).map((doc) => (
            <div
              key={doc.id}
              className="p-4 transition-colors hover:bg-muted/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {doc.fullName}
                    </p>
                    <Badge
                      variant={doc.isActive ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {doc.isActive ? "نشط" : "معطّل"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    @{doc.username}
                  </p>
                  {doc.email && (
                    <p className="text-xs text-muted-foreground">{doc.email}</p>
                  )}
                  {doc.phone && (
                    <p className="text-xs text-muted-foreground">{doc.phone}</p>
                  )}
                  {doc.doctorCode && (
                    <p className="text-xs text-primary font-mono">
                      مرتبط بالكود: {doc.doctorCode}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      setEditingCodeId(editingCodeId === doc.id ? null : doc.id)
                    }
                  >
                    <Pencil className="size-3.5" />
                    ربط الطبيب
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      setResetingId(resetingId === doc.id ? null : doc.id)
                    }
                  >
                    <KeyRound className="size-3.5" />
                    إعادة كلمة المرور
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      toggleActive.mutate({
                        id: doc.id,
                        isActive: !doc.isActive,
                      })
                    }
                  >
                    {doc.isActive ? (
                      <UserX className="size-3.5" />
                    ) : (
                      <UserCheck className="size-3.5" />
                    )}
                    {doc.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                </div>
              </div>
              {editingCodeId === doc.id && (
                <EditDoctorCodeForm
                  doc={doc}
                  onDone={() => {
                    setEditingCodeId(null);
                    void refetch();
                  }}
                />
              )}
              {resetingId === doc.id && (
                <ResetPasswordForm
                  doctorId={doc.id}
                  onDone={() => setResetingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
