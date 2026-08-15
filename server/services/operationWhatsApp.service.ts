import { ENV } from "../_core/env";
import { appendSupportNoticeToLastParameter } from "./whatsappTemplateSupport";
import { operationTypeLabelAr } from "../../shared/opTypes";

export type OperationWhatsAppRequest = {
  recipientPhone: string | null | undefined;
  patientName: string | null | undefined;
  operationName: string | null | undefined;
  operationDate: Date | string;
  operationTime: string | null | undefined;
  doctorName: string | null | undefined;
  hospitalName: string | null | undefined;
  status?: "confirmed" | "cancelled";
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

function operationDate(
  request: OperationWhatsAppRequest,
  includeTime = false,
): string {
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
    ...(includeTime && request.operationTime
      ? { timeStyle: "short" as const }
      : {}),
    timeZone: "Africa/Cairo",
  }).format(date);
}

function operationTime(operationTime: string | null | undefined): string {
  const match = String(operationTime ?? "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(operationTime ?? "").trim() || "حسب الموعد المحدد";

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = hours >= 12 ? "م" : "ص";
  const twelveHour = hours % 12 || 12;
  return minutes
    ? `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`
    : `${twelveHour} ${period}`;
}

function cleanDoctorName(doctorName: string | null | undefined): string {
  const name = String(doctorName ?? "").trim();
  if (!name) return "محمد السعدني";
  return name.replace(/^د[./]?\s*/u, "").trim() || "محمد السعدني";
}

function operationBranchName(request: OperationWhatsAppRequest): string {
  const operation = String(request.operationName ?? "").toLowerCase();
  const isFemto =
    operation === "fl" ||
    operation === "fs" ||
    operation.includes("femto") ||
    operation.includes("فيمتو");
  if (isFemto) return "مركز النخبة - ش الوفاء - الاستاد";

  const isLaserVisionCorrection =
    operation === "prk" ||
    operation === "lasik" ||
    operation.includes("prk") ||
    operation.includes("lasik") ||
    operation.includes("ليزر") ||
    operation.includes("تصحيح ابصار") ||
    operation.includes("تصحيح إبصار");
  if (isLaserVisionCorrection) {
    return "طنطا - مستشفى الشروق - الدور الثاني";
  }

  return request.hospitalName?.trim() || "مركز عيون الشروق";
}

function operationMapLocation(request: OperationWhatsAppRequest): string {
  const operation = String(request.operationName ?? "").toLowerCase();
  const hospital = String(request.hospitalName ?? "").toLowerCase();
  const isFemto =
    operation === "fl" ||
    operation === "fs" ||
    operation.includes("femto") ||
    operation.includes("فيمتو");

  if (isFemto) {
    return (
      ENV.whatsappEliteMapUrl || "https://maps.app.goo.gl/B9a7AMnDtD8jbgf8A"
    );
  }
  if (hospital.includes("الأمل") || hospital.includes("الامل")) {
    return (
      ENV.whatsappAlamalMapUrl || "https://maps.app.goo.gl/ucztDFBrZfxcF2dm8"
    );
  }
  return (
    ENV.whatsappOperationMapUrl || "https://maps.app.goo.gl/arKPUnj2nXTttRew5"
  );
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
        text: operationDate(request, true),
      },
      {
        type: "text",
        parameter_name: "branch_name",
        text: operationBranchName(request),
      },
    ];
  }

  if (request.status === "cancelled") {
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
        text: operationDate(request),
      },
      {
        type: "text",
        parameter_name: "doctor_name",
        text: cleanDoctorName(request.doctorName),
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
      text: operationDate(request),
    },
    {
      type: "text",
      parameter_name: "operation_time",
      text: operationTime(request.operationTime),
    },
    {
      type: "text",
      parameter_name: "doctor_name",
      text: cleanDoctorName(request.doctorName),
    },
    {
      type: "text",
      parameter_name: "hospital_name",
      text: operationBranchName(request),
    },
    {
      type: "text",
      parameter_name: "branch_location",
      text: operationMapLocation(request),
    },
  ];
}

export async function sendOperationListWhatsApp(
  request: OperationWhatsAppRequest,
): Promise<void> {
  const templateName =
    request.status === "cancelled"
      ? ENV.whatsappOperationCancellationTemplate
      : ENV.whatsappOperationTemplate;
  if (!ENV.whatsappAccessToken || !ENV.whatsappPhoneNumberId || !templateName) {
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
          name: templateName,
          language: { code: ENV.whatsappTemplateLanguage },
          components: [
            {
              type: "body",
              parameters: appendSupportNoticeToLastParameter(
                templateParameters(request, templateName),
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
      `WhatsApp Cloud API template "${templateName}" returned ${response.status}: ${responseBody}`,
    );
  }

  console.info(
    `[operation-whatsapp] Meta accepted operation message for ${recipientPhone}`,
  );
}
