import { ENV } from "../_core/env";
import { operationTypeLabelAr } from "../../shared/opTypes";

export type OperationWhatsAppRequest = {
  recipientPhone: string | null | undefined;
  patientName: string | null | undefined;
  operationName: string | null | undefined;
  operationDate: Date | string;
  operationTime: string | null | undefined;
  doctorName: string | null | undefined;
  hospitalName: string | null | undefined;
};

type WhatsAppTemplateParameter = {
  type: "text";
  parameter_name: string;
  text: string;
};

function internationalEgyptianPhone(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return `2${digits}`;
  if (/^201\d{9}$/.test(digits)) return digits;
  return null;
}

function operationDateTime(request: OperationWhatsAppRequest): string {
  const dateInput =
    typeof request.operationDate === "string"
      ? `${request.operationDate.slice(0, 10)}T${request.operationTime || "00:00"}:00`
      : request.operationDate;
  const date = new Date(dateInput);
  if (Number.isNaN(date.valueOf())) {
    return String(request.operationDate);
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    ...(request.operationTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Africa/Cairo",
  }).format(date);
}

function cleanDoctorName(doctorName: string | null | undefined): string {
  const name = String(doctorName ?? "").trim();
  if (!name) return "محمد السعدني";
  return name.replace(/^د[./]?\s*/u, "").trim() || "محمد السعدني";
}

function templateParameters(
  request: OperationWhatsAppRequest,
  templateName: string,
): WhatsAppTemplateParameter[] {
  if (templateName === "booking_confirmation_ar") {
    return [
      {
        type: "text",
        parameter_name: "patient_name",
        text: request.patientName?.trim() || "المريض",
      },
      {
        type: "text",
        parameter_name: "service_name",
        text: operationTypeLabelAr(request.operationName?.trim() || "العملية"),
      },
      {
        type: "text",
        parameter_name: "booking_date",
        text: operationDateTime(request),
      },
      {
        type: "text",
        parameter_name: "branch_name",
        text: request.hospitalName?.trim() || "مركز عيون الشروق",
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
      parameter_name: "operation_name",
      text: operationTypeLabelAr(request.operationName?.trim() || "العملية"),
    },
    {
      type: "text",
      parameter_name: "operation_date",
      text: operationDateTime(request),
    },
    {
      type: "text",
      parameter_name: "doctor_name",
      text: cleanDoctorName(request.doctorName),
    },
    {
      type: "text",
      parameter_name: "hospital_name",
      text: request.hospitalName?.trim() || "مركز عيون الشروق",
    },
  ];
}

export async function sendOperationListWhatsApp(
  request: OperationWhatsAppRequest,
): Promise<void> {
  if (
    !ENV.whatsappAccessToken ||
    !ENV.whatsappPhoneNumberId ||
    !ENV.whatsappOperationTemplate
  ) {
    console.warn(
      "[operation-whatsapp] Cloud API is not configured; operation message was not sent",
    );
    return;
  }

  const recipientPhone = request.recipientPhone
    ? internationalEgyptianPhone(request.recipientPhone)
    : null;
  if (!recipientPhone) {
    console.warn(
      `[operation-whatsapp] Patient ${request.patientName || "unknown"} has no valid Egyptian mobile number`,
    );
    return;
  }

  const response = await fetch(
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
        template: {
          name: ENV.whatsappOperationTemplate,
          language: { code: ENV.whatsappTemplateLanguage },
          components: [
            {
              type: "body",
              parameters: templateParameters(
                request,
                ENV.whatsappOperationTemplate,
              ),
            },
          ],
        },
      }),
    },
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `WhatsApp Cloud API template "${ENV.whatsappOperationTemplate}" returned ${response.status}: ${responseBody}`,
    );
  }

  console.info(
    `[operation-whatsapp] Meta accepted operation message for ${recipientPhone}`,
  );
}
