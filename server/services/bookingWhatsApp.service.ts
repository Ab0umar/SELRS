import { ENV } from "../_core/env";
import { sendWhatsAppConfirmation } from "./whatsappConfirmations";

type BookingWhatsAppRequest = {
  recipientPhone: string | null | undefined;
  patientName: string | null | undefined;
  bookingTypeLabel: string;
  bookingDate: Date | string;
  branch: string | null | undefined;
  status: "confirmed" | "cancelled";
  doctorName?: string | null;
  bookingType?: string | null;
  patientServiceType?: string | null;
  requestKey?: string;
};

type WhatsAppTemplateParameter = {
  type: "text";
  parameter_name: string;
  text: string;
};

export const KFS_BOOKING_ADDRESS =
  "كفر الشيخ - ٣ عمارة الأوقاف، الدور الثالث، شارع الجيش، أمام البنك الأهلي";
export const KFS_BOOKING_MAP_FALLBACK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  KFS_BOOKING_ADDRESS,
)}`;

function formattedBookingDate(bookingDate: Date | string): string {
  const date = new Date(bookingDate);
  const hasExplicitTime =
    typeof bookingDate === "string"
      ? /T\d{2}:\d{2}/.test(bookingDate)
      : !(
          date.getUTCHours() === 0 &&
          date.getUTCMinutes() === 0 &&
          date.getUTCSeconds() === 0
        );
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    ...(hasExplicitTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Africa/Cairo",
  }).format(date);
}

export function bookingBranch(branch: string | null | undefined): string {
  if (branch === "tanta") return "طنطا - 13 ش بطرس";
  if (branch === "kfs") return KFS_BOOKING_ADDRESS;
  return "طنطا - 13 ش بطرس";
}

function bookingDoctor(request: BookingWhatsAppRequest): string {
  const explicitName = String(request.doctorName ?? "").trim();
  if (explicitName) return explicitName;
  if (request.bookingTypeLabel.includes("استشاري")) {
    return "أ.د. محمد السعدني غرابة";
  }
  if (request.bookingTypeLabel.includes("أخصائي")) return "الطبيب الأخصائي";
  if (request.bookingTypeLabel.includes("متابعة")) return "الطبيب المعالج";
  return "الفريق الطبي";
}

function bookingTime(request: BookingWhatsAppRequest): string {
  const bookingType = String(request.bookingType ?? "").toLowerCase();
  const patientServiceType = String(
    request.patientServiceType ?? "",
  ).toLowerCase();
  const label = request.bookingTypeLabel;

  if (bookingType === "external" || label.includes("خارجي")) {
    return "من 10 ص حتى 6:30 م";
  }
  if (
    bookingType === "specialist" ||
    (bookingType === "followup" && patientServiceType === "specialist") ||
    label.includes("أخصائي")
  ) {
    return "من 12 م حتى 6 م";
  }
  if (
    bookingType === "consultant" ||
    bookingType === "followup" ||
    patientServiceType === "consultant" ||
    label.includes("استشاري") ||
    label.includes("متابعة")
  ) {
    return "من 12 م حتى 3 م";
  }
  return "حسب الموعد المحدد";
}

export function bookingMapLocation(branch: string | null | undefined): string {
  if (branch === "tanta") {
    return (
      ENV.whatsappTantaMapUrl || "https://maps.app.goo.gl/528HEEz1jpMEjH1s8"
    );
  }
  if (branch === "kfs") {
    return ENV.whatsappKfsMapUrl || KFS_BOOKING_MAP_FALLBACK;
  }
  return ENV.whatsappTantaMapUrl || "https://maps.app.goo.gl/528HEEz1jpMEjH1s8";
}

function namedTemplateParameters(
  request: BookingWhatsAppRequest,
  templateName: string,
): WhatsAppTemplateParameter[] {
  if (
    request.status === "cancelled" &&
    templateName !== "booking_cancellation_ar"
  ) {
    return [
      {
        type: "text",
        parameter_name: "patient_name",
        text: request.patientName?.trim() || "المريض",
      },
      {
        type: "text",
        parameter_name: "service_name",
        text: request.bookingTypeLabel,
      },
      {
        type: "text",
        parameter_name: "booking_date",
        text: formattedBookingDate(request.bookingDate),
      },
    ];
  }

  if (
    request.status === "confirmed" &&
    templateName !== "booking_confirmation_ar"
  ) {
    return [
      {
        type: "text",
        parameter_name: "patient_name",
        text: request.patientName?.trim() || "المريض",
      },
      {
        type: "text",
        parameter_name: "service_name",
        text: request.bookingTypeLabel,
      },
      {
        type: "text",
        parameter_name: "doctor_name",
        text: bookingDoctor(request),
      },
      {
        type: "text",
        parameter_name: "booking_date",
        text: formattedBookingDate(request.bookingDate),
      },
      {
        type: "text",
        parameter_name: "booking_time",
        text: bookingTime(request),
      },
      {
        type: "text",
        parameter_name: "branch_name",
        text: bookingBranch(request.branch),
      },
      {
        type: "text",
        parameter_name: "branch_location",
        text: bookingMapLocation(request.branch),
      },
    ];
  }

  return [
    {
      type: "text",
      parameter_name: "patient_name",
      text: request.patientName?.trim() || "المريض",
    },
    {
      type: "text",
      parameter_name: "service_name",
      text: request.bookingTypeLabel,
    },
    {
      type: "text",
      parameter_name: "booking_date",
      text: formattedBookingDate(request.bookingDate),
    },
    {
      type: "text",
      parameter_name: "branch_name",
      text: bookingBranch(request.branch),
    },
  ];
}

function bookingTemplateName(status: "confirmed" | "cancelled"): string {
  return status === "confirmed"
    ? ENV.whatsappConfirmationTemplate
    : ENV.whatsappCancellationTemplate;
}

function templatePayload(
  request: BookingWhatsAppRequest,
  templateName: string,
) {
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: ENV.whatsappTemplateLanguage },
  };

  if (templateName !== "hello_world") {
    template.components = [
      {
        type: "body",
        parameters: namedTemplateParameters(request, templateName),
      },
    ];
  }

  return template;
}

export async function sendBookingStatusWhatsApp(
  request: BookingWhatsAppRequest,
): Promise<void> {
  const templateName = bookingTemplateName(request.status);
  await sendWhatsAppConfirmation({
    kind:
      request.status === "confirmed"
        ? "booking_confirmed"
        : "booking_cancelled",
    recipientPhone: request.recipientPhone,
    patientName: request.patientName,
    templateName,
    buildTemplate: () => templatePayload(request, templateName),
    requestKey: request.requestKey,
  });
}
export async function sendBookingReceiptWhatsApp(request: {
  recipientPhone: string | null | undefined;
  patientName: string | null | undefined;
  requestKey: string;
}): Promise<void> {
  await sendWhatsAppConfirmation({
    kind: "booking_received",
    recipientPhone: request.recipientPhone,
    patientName: request.patientName,
    templateName: ENV.whatsappReceiptTemplate,
    requestKey: request.requestKey,
    buildTemplate: () => ({
      name: ENV.whatsappReceiptTemplate,
      language: { code: ENV.whatsappTemplateLanguage },
    }),
  });
}
