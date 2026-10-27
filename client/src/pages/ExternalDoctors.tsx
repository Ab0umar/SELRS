import { useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  PlusCircle,
  RefreshCw,
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

type InternalDoctor = {
  id: number;
  code: string | null;
  name: string;
};

function DoctorCodeSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const internalDoctorsQuery =
    trpc.externalDoctors.listInternalDoctors.useQuery();

  return (
    <div className="space-y-1">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-label="ربط الطبيب الداخلي"
          disabled={
            internalDoctorsQuery.isLoading || internalDoctorsQuery.isError
          }
        >
          <SelectValue placeholder="اختر الطبيب الداخلي" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">بدون ربط</SelectItem>
          {(internalDoctorsQuery.data as InternalDoctor[] | undefined)?.map(
            (doctor) => (
              <SelectItem
                key={doctor.id}
                value={doctor.code ?? String(doctor.id)}
              >
                {doctor.name} {doctor.code ? `(${doctor.code})` : ""}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
      {internalDoctorsQuery.isLoading && (
        <p className="text-xs text-muted-foreground" role="status">
          جارٍ تحميل الأطباء الداخليين…
        </p>
      )}
      {internalDoctorsQuery.isError && (
        <div className="flex flex-wrap items-center gap-2 text-xs" role="alert">
          <span className="text-destructive">
            تعذر تحميل قائمة الأطباء الداخليين.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => void internalDoctorsQuery.refetch()}
            disabled={internalDoctorsQuery.isFetching}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {internalDoctorsQuery.isFetching
              ? "جارٍ المحاولة…"
              : "إعادة المحاولة"}
          </Button>
        </div>
      )}
    </div>
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
      toast.success("تم إنشاء حساب الطبيب");
      onDone();
    },
    onError: (e) => toast.error(`تعذر إنشاء حساب الطبيب: ${e.message}`),
  });

  const resolvedCode =
    doctorCode === "__none__" ? undefined : doctorCode || undefined;

  return (
    <form
      className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          username,
          password,
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          doctorCode: resolvedCode,
        });
      }}
      aria-busy={create.isPending}
    >
      <h2 className="font-semibold text-foreground">إضافة طبيب خارجي</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="external-doctor-full-name"
            className="text-xs font-medium text-muted-foreground"
          >
            الاسم الكامل <span aria-hidden="true">*</span>
          </label>
          <Input
            id="external-doctor-full-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="د. أحمد محمد"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="external-doctor-username"
            className="text-xs font-medium text-muted-foreground"
          >
            اسم المستخدم <span aria-hidden="true">*</span>
          </label>
          <Input
            id="external-doctor-username"
            required
            minLength={3}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="dr.ahmed"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="external-doctor-password"
            className="text-xs font-medium text-muted-foreground"
          >
            كلمة المرور <span aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <Input
              id="external-doctor-password"
              required
              minLength={6}
              autoComplete="new-password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              className="pe-10"
            />
            <Button variant="bare"
              type="button"
              aria-label={showPw ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              aria-pressed={showPw}
              title={showPw ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              onClick={() => setShowPw((v) => !v)}
              className="absolute end-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {showPw ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="external-doctor-email"
            className="text-xs font-medium text-muted-foreground"
          >
            البريد الإلكتروني
          </label>
          <Input
            id="external-doctor-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@clinic.com"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="external-doctor-phone"
            className="text-xs font-medium text-muted-foreground"
          >
            الهاتف
          </label>
          <Input
            id="external-doctor-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label
            htmlFor="external-doctor-mapping"
            className="text-xs font-medium text-muted-foreground"
          >
            ربط الطبيب الداخلي
          </label>
          <DoctorCodeSelect
            id="external-doctor-mapping"
            value={doctorCode}
            onChange={setDoctorCode}
          />
        </div>
      </div>
      {create.error && (
        <p className="text-sm text-destructive" role="alert">
          تعذر إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={create.isPending}>
          {create.isPending ? "جارٍ الإنشاء…" : "إنشاء الحساب"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
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
      toast.success("تمت إعادة تعيين كلمة المرور");
      onDone();
    },
    onError: (e) => toast.error(`تعذر إعادة تعيين كلمة المرور: ${e.message}`),
  });

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        reset.mutate({ id: doctorId, newPassword: password });
      }}
      aria-busy={reset.isPending}
    >
      <div className="relative min-w-[14rem] flex-1 space-y-1">
        <label htmlFor={`reset-password-${doctorId}`} className="sr-only">
          كلمة المرور الجديدة
        </label>
        <Input
          id={`reset-password-${doctorId}`}
          required
          minLength={6}
          autoComplete="new-password"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور الجديدة"
          className="pe-9 text-xs"
        />
        <Button variant="bare"
          type="button"
          aria-label={
            showPw ? "إخفاء كلمة المرور الجديدة" : "إظهار كلمة المرور الجديدة"
          }
          aria-pressed={showPw}
          title={
            showPw ? "إخفاء كلمة المرور الجديدة" : "إظهار كلمة المرور الجديدة"
          }
          onClick={() => setShowPw((v) => !v)}
          className="absolute end-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {showPw ? (
            <EyeOff className="size-3" aria-hidden="true" />
          ) : (
            <Eye className="size-3" aria-hidden="true" />
          )}
        </Button>
      </div>
      <Button type="submit" size="sm" disabled={reset.isPending}>
        {reset.isPending ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        إلغاء
      </Button>
      {reset.error && (
        <p className="basis-full text-sm text-destructive" role="alert">
          تعذر تحديث كلمة المرور. حاول مرة أخرى.
        </p>
      )}
    </form>
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
      toast.success("تم تحديث ربط الطبيب");
      onDone();
    },
    onError: (e) => toast.error(`تعذر تحديث ربط الطبيب: ${e.message}`),
  });
  const resolvedCode = doctorCode === "__none__" ? null : doctorCode || null;

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({ id: doc.id, doctorCode: resolvedCode });
      }}
      aria-busy={update.isPending}
    >
      <div className="min-w-[14rem] flex-1 space-y-1">
        <label
          htmlFor={`doctor-mapping-${doc.id}`}
          className="text-xs font-medium text-muted-foreground"
        >
          ربط الطبيب الداخلي
        </label>
        <DoctorCodeSelect
          id={`doctor-mapping-${doc.id}`}
          value={doctorCode}
          onChange={setDoctorCode}
        />
      </div>
      <Button type="submit" size="sm" disabled={update.isPending}>
        {update.isPending ? "جارٍ الحفظ…" : "حفظ الربط"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        إلغاء
      </Button>
      {update.error && (
        <p className="basis-full text-sm text-destructive" role="alert">
          تعذر تحديث الربط. حاول مرة أخرى.
        </p>
      )}
    </form>
  );
}

export default function ExternalDoctors({ hideSectionLink = false }: { hideSectionLink?: boolean } = {}) {
  const [creating, setCreating] = useState(false);
  const [resetingId, setResetingId] = useState<number | null>(null);
  const [editingCodeId, setEditingCodeId] = useState<number | null>(null);

  const doctorsQuery = trpc.externalDoctors.listDoctors.useQuery();
  const toggleActive = trpc.externalDoctors.updateDoctor.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الطبيب");
      void doctorsQuery.refetch();
    },
    onError: (e) => toast.error(`تعذر تحديث حالة الطبيب: ${e.message}`),
  });

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 pb-4" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-foreground">
            الأطباء الخارجيون
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة حسابات الأطباء في البوابة الخارجية وربطها بسجل الأطباء
          </p>
        </div>
        <nav
          aria-label="إدارة الأطباء الخارجيين"
          className="flex flex-wrap gap-2"
        >
          {!hideSectionLink && <Button asChild variant="outline" size="sm">
            <Link href="/admin-hub/external-doctors/referrals">الإحالات</Link>
          </Button>}
          <Button
            type="button"
            size="sm"
            className="gap-2"
            aria-expanded={creating}
            onClick={() => setCreating((v) => !v)}
          >
            <PlusCircle className="size-4" aria-hidden="true" />
            {creating ? "إغلاق النموذج" : "إضافة طبيب"}
          </Button>
        </nav>
      </div>

      {creating && (
        <CreateDoctorForm
          onDone={() => {
            setCreating(false);
            void doctorsQuery.refetch();
          }}
        />
      )}

      {doctorsQuery.isFetching && !doctorsQuery.isLoading && (
        <p
          className="text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          جارٍ تحديث قائمة الأطباء…
        </p>
      )}

      {doctorsQuery.isLoading && (
        <div
          className="space-y-3"
          role="status"
          aria-live="polite"
          aria-label="جارٍ تحميل الأطباء"
        >
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {doctorsQuery.isError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          role="alert"
        >
          <p className="text-sm text-destructive">
            تعذر تحميل حسابات الأطباء الخارجيين.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void doctorsQuery.refetch()}
            disabled={doctorsQuery.isFetching}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {doctorsQuery.isFetching ? "جارٍ المحاولة…" : "إعادة المحاولة"}
          </Button>
        </div>
      )}

      {doctorsQuery.data &&
        doctorsQuery.data.length === 0 &&
        !doctorsQuery.isError && (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            لا توجد حسابات أطباء خارجيين حتى الآن. أضف أول حساب من زر «إضافة
            طبيب».
          </div>
        )}

      {doctorsQuery.data &&
        doctorsQuery.data.length > 0 &&
        !doctorsQuery.isError && (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {(doctorsQuery.data as Doctor[]).map((doc) => (
              <div
                key={doc.id}
                className="p-4 transition-colors hover:bg-muted/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {doc.fullName}
                      </p>
                      <Badge
                        variant={doc.isActive ? "default" : "secondary"}
                        className="text-[13px]"
                      >
                        {doc.isActive ? "نشط" : "معطّل"}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      @{doc.username}
                    </p>
                    {doc.email && (
                      <p className="text-xs text-muted-foreground">
                        {doc.email}
                      </p>
                    )}
                    {doc.phone && (
                      <p className="text-xs text-muted-foreground">
                        {doc.phone}
                      </p>
                    )}
                    {doc.doctorCode && (
                      <p className="font-mono text-xs text-primary">
                        مرتبط بالكود: {doc.doctorCode}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      aria-expanded={editingCodeId === doc.id}
                      onClick={() =>
                        setEditingCodeId(
                          editingCodeId === doc.id ? null : doc.id,
                        )
                      }
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      ربط الطبيب
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      aria-expanded={resetingId === doc.id}
                      onClick={() =>
                        setResetingId(resetingId === doc.id ? null : doc.id)
                      }
                    >
                      <KeyRound className="size-3.5" aria-hidden="true" />
                      إعادة كلمة المرور
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      disabled={toggleActive.isPending}
                      onClick={() =>
                        toggleActive.mutate({
                          id: doc.id,
                          isActive: !doc.isActive,
                        })
                      }
                    >
                      {doc.isActive ? (
                        <UserX className="size-3.5" aria-hidden="true" />
                      ) : (
                        <UserCheck className="size-3.5" aria-hidden="true" />
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
                      void doctorsQuery.refetch();
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
