import { ENV } from "../_core/env";

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
};

type WhatsAppTemplateParameter = {
  type: "text";
  parameter_name: string;
  text: string;
};

function internationalPhone(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return `2${digits}`;
  if (/^201\d{9}$/.test(digits)) return digits;
  return null;
}

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

function bookingBranch(branch: string | null | undefined): string {
  if (branch === "tanta") return "طنطا - 13 ش بطرس";
  if (branch === "kfs") return "فرع كفر الشيخ";
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

function bookingMapLocation(branch: string | null | undefined): string {
  if (branch === "tanta") {
    return (
      ENV.whatsappTantaMapUrl ||
      "https://maps.app.goo.gl/528HEEz1jpMEjH1s8"
    );
  }
  if (branch === "kfs") {
    return (
      ENV.whatsappKfsMapUrl ||
      "https://maps.app.goo.gl/528HEEz1jpMEjH1s8"
    );
  }
  return (
    ENV.whatsappKfsMapUrl ||
    "https://maps.app.goo.gl/528HEEz1jpMEjH1s8"
  );
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

function templatePayload(request: BookingWhatsAppRequest, templateName: string) {
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

function whatsappConfiguration(request: BookingWhatsAppRequest) {
  const templateName = bookingTemplateName(request.status);
  if (
    !ENV.whatsappAccessToken ||
    !ENV.whatsappPhoneNumberId ||
    !templateName
  ) {
    console.warn(
      "[booking-whatsapp] Cloud API is not configured; booking message was not sent",
    );
    return null;
  }

  const recipientPhone = request.recipientPhone
    ? internationalPhone(request.recipientPhone)
    : null;
  if (!recipientPhone) {
    console.warn("[booking-whatsapp] Booking has no valid Egyptian mobile number");
    return null;
  }

  return { recipientPhone, templateName };
}

async function postWhatsAppTemplate(
  request: BookingWhatsAppRequest,
  recipientPhone: string,
  templateName: string,
): Promise<Response> {
  return fetch(
    `https://graph.facebook.com/${ENV.whatsappApiVersion}/${ENV.whatsappPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: templatePayload(request, templateName),
      }),
    },
  );
}

export async function sendBookingStatusWhatsApp(
  request: BookingWhatsAppRequest,
): Promise<void> {
  const configuration = whatsappConfiguration(request);
  if (!configuration) return;

  const response = await postWhatsAppTemplate(
    request,
    configuration.recipientPhone,
    configuration.templateName,
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `WhatsApp Cloud API returned ${response.status}: ${responseBody}`,
    );
  }

  console.info(
    `[booking-whatsapp] Meta accepted ${request.status} message for ${configuration.recipientPhone}`,
  );
}
