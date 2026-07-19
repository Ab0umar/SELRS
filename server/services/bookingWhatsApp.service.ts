import { ENV } from "../_core/env";

type BookingWhatsAppRequest = {
  recipientPhone: string | null | undefined;
  patientName: string | null | undefined;
  bookingTypeLabel: string;
  bookingDate: Date | string;
  branch: string | null | undefined;
  status: "confirmed" | "cancelled";
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
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(bookingDate));
}

function bookingBranch(branch: string | null | undefined): string {
  if (branch === "tanta") return "فرع طنطا";
  if (branch === "kfs") return "فرع كفر الشيخ";
  return "مركز عيون الشروق";
}

function namedTemplateParameters(
  request: BookingWhatsAppRequest,
): WhatsAppTemplateParameter[] {
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
        parameters: namedTemplateParameters(request),
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
