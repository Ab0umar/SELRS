import { useState } from "react";
import {
  PlusCircle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Trash2,
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

type ExternalDoctor = {
  id: number;
  fullName: string;
  username: string;
  isActive: boolean;
};

type Referral = {
  id: number;
  patientName: string | null;
  patientCode: string;
  doctorName: string | null;
  doctorUsername: string | null;
  isActive: boolean;
};

function CreateReferralForm({ onDone }: { onDone: () => void }) {
  const doctorsQuery = trpc.externalDoctors.listDoctors.useQuery();
  const [doctorId, setDoctorId] = useState("");
  const [patientCode, setPatientCode] = useState("");

  const create = trpc.externalDoctors.createReferral.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الإحالة");
      onDone();
    },
    onError: (e) => toast.error(`تعذر إنشاء الإحالة: ${e.message}`),
  });

  const activeDoctors =
    (doctorsQuery.data as ExternalDoctor[] | undefined)?.filter(
      (doctor) => doctor.isActive,
    ) ?? [];

  return (
    <form
      className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          externalDoctorId: Number(doctorId),
          patientCode,
        });
      }}
      aria-busy={create.isPending}
    >
      <h2 className="font-semibold text-foreground">إضافة إحالة</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="referral-doctor"
            className="text-xs font-medium text-muted-foreground"
          >
            الطبيب <span aria-hidden="true">*</span>
          </label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger
              id="referral-doctor"
              aria-label="الطبيب الخارجي"
              disabled={
                doctorsQuery.isLoading ||
                doctorsQuery.isError ||
                activeDoctors.length === 0
              }
            >
              <SelectValue placeholder="اختر الطبيب" />
            </SelectTrigger>
            <SelectContent>
              {activeDoctors.map((doctor) => (
                <SelectItem key={doctor.id} value={String(doctor.id)}>
                  {doctor.fullName} (@{doctor.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {doctorsQuery.isLoading && (
            <p className="text-xs text-muted-foreground" role="status">
              جارٍ تحميل الأطباء…
            </p>
          )}
          {doctorsQuery.isError && (
            <div
              className="flex flex-wrap items-center gap-2 text-xs"
              role="alert"
            >
              <span className="text-destructive">تعذر تحميل الأطباء.</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => void doctorsQuery.refetch()}
                disabled={doctorsQuery.isFetching}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                {doctorsQuery.isFetching ? "جارٍ المحاولة…" : "إعادة المحاولة"}
              </Button>
            </div>
          )}
          {!doctorsQuery.isLoading &&
            !doctorsQuery.isError &&
            activeDoctors.length === 0 && (
              <p className="text-xs text-muted-foreground">
                أضف طبيبًا خارجيًا نشطًا أولًا.
              </p>
            )}
        </div>
        <div className="space-y-1">
          <label
            htmlFor="referral-patient-code"
            className="text-xs font-medium text-muted-foreground"
          >
            كود المريض <span aria-hidden="true">*</span>
          </label>
          <Input
            id="referral-patient-code"
            required
            value={patientCode}
            onChange={(e) => setPatientCode(e.target.value.trim())}
            placeholder="مثال: 0093"
          />
        </div>
      </div>
      {create.error && (
        <p className="text-sm text-destructive" role="alert">
          تعذر إنشاء الإحالة. تحقق من الطبيب وكود المريض وحاول مرة أخرى.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={
            create.isPending ||
            doctorsQuery.isLoading ||
            doctorsQuery.isError ||
            !doctorId ||
            !patientCode
          }
        >
          {create.isPending ? "جارٍ الإضافة…" : "إضافة الإحالة"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

export default function ExternalDoctorReferrals() {
  const [creating, setCreating] = useState(false);
  const referralsQuery = trpc.externalDoctors.listReferrals.useQuery();

  const toggle = trpc.externalDoctors.toggleReferral.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الإحالة");
      void referralsQuery.refetch();
    },
    onError: (e) => toast.error(`تعذر تحديث حالة الإحالة: ${e.message}`),
  });
  const del = trpc.externalDoctors.deleteReferral.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الإحالة");
      void referralsQuery.refetch();
    },
    onError: (e) => toast.error(`تعذر حذف الإحالة: ${e.message}`),
  });

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 pb-4" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-foreground">
            إحالات المرضى
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تحديد المرضى المتاحين لكل طبيب خارجي
          </p>
        </div>
        <nav aria-label="إدارة الإحالات" className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin-hub/external-doctors">الأطباء</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            aria-expanded={creating}
            onClick={() => setCreating((v) => !v)}
          >
            <PlusCircle className="size-4" aria-hidden="true" />
            {creating ? "إغلاق النموذج" : "إضافة إحالة"}
          </Button>
        </nav>
      </div>

      {creating && (
        <CreateReferralForm
          onDone={() => {
            setCreating(false);
            void referralsQuery.refetch();
          }}
        />
      )}

      {referralsQuery.isFetching && !referralsQuery.isLoading && (
        <p
          className="text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          جارٍ تحديث قائمة الإحالات…
        </p>
      )}

      {referralsQuery.isLoading && (
        <div
          className="space-y-3"
          role="status"
          aria-live="polite"
          aria-label="جارٍ تحميل الإحالات"
        >
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {referralsQuery.isError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          role="alert"
        >
          <p className="text-sm text-destructive">تعذر تحميل إحالات المرضى.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void referralsQuery.refetch()}
            disabled={referralsQuery.isFetching}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {referralsQuery.isFetching ? "جارٍ المحاولة…" : "إعادة المحاولة"}
          </Button>
        </div>
      )}

      {referralsQuery.data &&
        referralsQuery.data.length === 0 &&
        !referralsQuery.isError && (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            لا توجد إحالات حتى الآن. أضف إحالة من زر «إضافة إحالة».
          </div>
        )}

      {referralsQuery.data &&
        referralsQuery.data.length > 0 &&
        !referralsQuery.isError && (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {(referralsQuery.data as Referral[]).map((referral) => (
              <div
                key={referral.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {referral.patientName ?? referral.patientCode}
                    </p>
                    <span className="font-mono text-xs text-muted-foreground">
                      {referral.patientCode}
                    </span>
                    <Badge
                      variant={referral.isActive ? "default" : "secondary"}
                      className="text-[13px]"
                    >
                      {referral.isActive ? "نشطة" : "معطّلة"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الطبيب: {referral.doctorName ?? "غير معروف"} (@
                    {referral.doctorUsername ?? "?"})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    disabled={toggle.isPending || del.isPending}
                    onClick={() =>
                      toggle.mutate({
                        id: referral.id,
                        isActive: !referral.isActive,
                      })
                    }
                  >
                    {referral.isActive ? (
                      <>
                        <ToggleRight className="size-3.5" aria-hidden="true" />
                        تعطيل
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="size-3.5" aria-hidden="true" />
                        تفعيل
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    aria-label={`حذف إحالة المريض ${referral.patientCode}`}
                    title="حذف الإحالة"
                    disabled={toggle.isPending || del.isPending}
                    onClick={() => {
                      if (confirm("هل تريد حذف هذه الإحالة؟")) {
                        del.mutate({ id: referral.id });
                      }
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
