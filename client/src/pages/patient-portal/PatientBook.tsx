import { useState } from "react";
import { trpc } from "@/lib/trpc";
import PatientLayout from "./PatientLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";

const TYPES = [
  { value: "consultant" as const, label: "كشف استشاري" },
  { value: "specialist" as const, label: "كشف أخصائي" },
  { value: "lasik" as const, label: "فحوصات الليزك" },
  { value: "external" as const, label: "أشعة خارجي" },
];

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function formatDate(d: string) {
  const date = new Date(d);
  return `${DAY_NAMES[date.getDay()]} ${date.toLocaleDateString("ar-EG")}`;
}

export default function PatientBook() {
  const [, navigate] = useLocation();
  const [bookingType, setBookingType] = useState<"consultant" | "specialist" | "lasik" | "external">("consultant");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: schedule, isLoading: loadingDates } = trpc.patientPortal.getAvailableDates.useQuery({ bookingType });

  const createBooking = trpc.patientPortal.createBooking.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب الحجز بنجاح");
      navigate("/my/bookings");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!selectedDate) { toast.error("اختر تاريخ الحجز"); return; }
    createBooking.mutate({ bookingType, requestedDate: selectedDate, notes: notes || undefined });
  };

  return (
    <PatientLayout>
      <h2 className="text-lg font-bold text-gray-900 mb-4">حجز موعد جديد</h2>

      <div className="space-y-5">
        {/* Type selection */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">نوع الحجز</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setBookingType(t.value); setSelectedDate(""); }}
                className={`py-3 px-2 rounded-xl text-sm border transition-colors ${
                  bookingType === t.value
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date selection */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">اختر التاريخ</p>
          {loadingDates && <p className="text-gray-400 text-sm text-center py-4">جاري التحميل...</p>}
          {!loadingDates && schedule && !schedule.dates.length && (
            <p className="text-gray-400 text-sm text-center py-4">لا توجد مواعيد متاحة حالياً</p>
          )}
          {!loadingDates && schedule && schedule.dates.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {schedule.dates.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`py-2.5 px-3 rounded-xl text-sm border transition-colors ${
                    selectedDate === d
                      ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {formatDate(d)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">ملاحظات (اختياري)</p>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات إضافية..."
            className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Button
          className="w-full h-12 text-base"
          onClick={handleSubmit}
          disabled={!selectedDate || createBooking.isPending}
        >
          {createBooking.isPending ? "جاري الإرسال..." : "تأكيد الحجز"}
        </Button>
      </div>
    </PatientLayout>
  );
}
