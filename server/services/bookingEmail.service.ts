import nodemailer from "nodemailer";
import { ENV } from "../_core/env";

type BookingEmailRequest = {
  recipientEmail: string | null | undefined;
  patientName: string | null | undefined;
  bookingTypeLabel: string;
  bookingDate: Date | string;
  branch: string | null | undefined;
  status: "confirmed" | "cancelled";
};

function formatBookingDate(bookingDate: Date | string): string {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "full" }).format(
    new Date(bookingDate),
  );
}

function branchLabel(branch: string | null | undefined): string {
  if (branch === "tanta") return "فرع طنطا";
  if (branch === "kfs") return "فرع كفر الشيخ";
  return "مركز عيون الشروق";
}

function bookingEmailContent(request: BookingEmailRequest): {
  subject: string;
  text: string;
} {
  const patientName = request.patientName?.trim() || "المريض";
  const bookingDate = formatBookingDate(request.bookingDate);
  const branch = branchLabel(request.branch);

  if (request.status === "cancelled") {
    return {
      subject: "تحديث حالة الحجز | مركز عيون الشروق",
      text: `الأستاذ/ة ${patientName}،\n\nنعتذر، تم إلغاء طلب الحجز لخدمة ${request.bookingTypeLabel} بتاريخ ${bookingDate}.\n\n${branch}\nللاستفسار أو إعادة الحجز، يرجى التواصل مع المركز.`,
    };
  }

  return {
    subject: "تم تأكيد الحجز | مركز عيون الشروق",
    text: `الأستاذ/ة ${patientName}،\n\nتم تأكيد حجزكم لخدمة ${request.bookingTypeLabel} بتاريخ ${bookingDate}.\n\n${branch}\nنتشرف بزيارتكم في الموعد المحدد.`,
  };
}

export async function sendBookingStatusEmail(
  request: BookingEmailRequest,
): Promise<void> {
  const recipientEmail = request.recipientEmail?.trim();
  if (!recipientEmail) return;

  if (!ENV.zohoSmtpUsername || !ENV.zohoSmtpAppPassword) {
    console.warn(
      "[booking-email] Zoho SMTP is not configured; booking email was not sent",
    );
    return;
  }

  const message = bookingEmailContent(request);
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: ENV.zohoSmtpUsername,
      pass: ENV.zohoSmtpAppPassword,
    },
  });

  await transporter.sendMail({
    from: `مركز عيون الشروق <${ENV.bookingEmailFrom}>`,
    to: recipientEmail,
    subject: message.subject,
    text: message.text,
  });
}
