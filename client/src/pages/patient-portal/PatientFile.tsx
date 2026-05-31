import { trpc } from "@/lib/trpc";
import PatientLayout from "./PatientLayout";
import { Badge } from "@/components/ui/badge";

const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };
const STATUS_LABEL: Record<string, string> = { new: "جديد", followup: "متابعة", archived: "محفوظ" };
const SERVICE_LABEL: Record<string, string> = {
  consultant: "استشاري",
  specialist: "أخصائي",
  lasik: "ليزك",
  surgery: "عملية",
  external: "خارجي",
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-900 text-sm font-medium">{String(value)}</span>
    </div>
  );
}

export default function PatientFile() {
  const { data, isLoading, error } = trpc.patientPortal.getMyProfile.useQuery();

  return (
    <PatientLayout>
      <h2 className="text-lg font-bold text-gray-900 mb-4">ملفي الطبي</h2>

      {isLoading && <p className="text-gray-500 text-center py-8">جاري التحميل...</p>}
      {error && <p className="text-red-500 text-center py-8">{error.message}</p>}

      {data && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{data.fullName}</h3>
              <Badge variant="outline">{data.patientCode}</Badge>
            </div>
            <Field label="الجنس" value={data.gender ? GENDER_LABEL[data.gender] : null} />
            <Field label="العمر" value={data.age ? `${data.age} سنة` : null} />
            <Field label="تاريخ الميلاد" value={data.dateOfBirth} />
            <Field label="الموبايل" value={data.phone} />
            <Field label="العنوان" value={data.address} />
            <Field label="نوع الخدمة" value={data.serviceType ? SERVICE_LABEL[data.serviceType] : null} />
            <Field label="آخر زيارة" value={data.lastVisit} />
            <Field label="الحالة" value={data.status ? STATUS_LABEL[data.status] : null} />
          </div>

          {(data.medicalHistory || data.allergies) && (
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">التاريخ المرضي</h3>
              {data.medicalHistory && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">الأمراض السابقة</p>
                  <p className="text-sm text-gray-800">{data.medicalHistory}</p>
                </div>
              )}
              {data.allergies && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">الحساسية</p>
                  <p className="text-sm text-gray-800">{data.allergies}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PatientLayout>
  );
}
