import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("../db", () => ({
  getDbConnection: async () => ({
    execute: mocks.execute,
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  }),
}));
import { ENV } from "../_core/env";
import {
  sendBookingStatusWhatsApp,
  sendBookingReceiptWhatsApp,
} from "../services/bookingWhatsApp.service";
import { sendOperationListWhatsApp } from "../services/operationWhatsApp.service";
import { sendPatientLoginOtp } from "../services/patientOtpWhatsApp";
const original = { ...ENV };
const fetchMock = vi.fn();
const booking = {
  recipientPhone: "01012345678",
  patientName: "مريض تجريبي",
  bookingTypeLabel: "كشف أخصائي",
  bookingType: "specialist",
  bookingDate: "2026-11-11",
  branch: "tanta",
  status: "confirmed" as const,
};
function payload() {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(ENV, {
    whatsappAccessToken: "fixture-token",
    whatsappPhoneNumberId: "fixture-phone",
    whatsappDirectSendEnabled: true,
    whatsappConfirmationTemplate: "",
    whatsappCancellationTemplate: "",
    whatsappOperationTemplate: "",
    whatsappOperationCancellationTemplate: "",
    whatsappAuthenticationTemplate: "patient_login_otp",
    whatsappTemplateLanguage: "ar",
  });
  mocks.execute.mockImplementation(async (query: string) =>
    query.startsWith("SELECT") ? [[]] : [{ affectedRows: 1 }],
  );
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ messages: [{ id: "fixture-message" }] }), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  Object.assign(ENV, original);
  vi.unstubAllGlobals();
});
describe("WhatsApp Direct Send and OTP delivery", () => {
  it("sends appointment details as utility text without requiring an approved template", async () => {
    await sendBookingStatusWhatsApp(booking);
    expect(payload()).toMatchObject({
      category: "utility",
      type: "text",
      to: "201012345678",
      text: { body: expect.stringContaining("تم تأكيد حجز كشف أخصائي") },
    });
    expect(payload()).not.toHaveProperty("template");
    expect(payload().text.body).toContain("من 12 م حتى 6 م");
    expect(mocks.execute.mock.calls[0][1]).toContain(
      "direct_send:booking_confirmed",
    );
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining("provider_message_id=?"),
      expect.arrayContaining(["fixture-message", "accepted"]),
    );
  });
  it("sends cancellation text without arrival instructions", async () => {
    await sendBookingStatusWhatsApp({ ...booking, status: "cancelled" });
    expect(payload().text.body).toContain("تم إلغاء حجز");
    expect(payload().text.body).not.toContain("موعد الحضور");
  });
  it("sends receipt text while leaving the booking pending", async () => {
    await sendBookingReceiptWhatsApp({
      recipientPhone: booking.recipientPhone,
      patientName: booking.patientName,
      requestKey: "fixture-receipt",
    });
    expect(payload().text.body).toContain("الطلب قيد المراجعة");
    expect(payload().category).toBe("utility");
  });
  it.each(["confirmed", "cancelled"] as const)(
    "uses Direct Send for operation %s notifications",
    async (status) => {
      await sendOperationListWhatsApp({
        recipientPhone: booking.recipientPhone,
        patientName: booking.patientName,
        operationName: "lasik",
        operationDate: "2026-11-11",
        operationTime: "12:30",
        doctorName: "د. تجريبي",
        hospitalName: "مستشفى تجريبي",
        status,
      });
      expect(payload().category).toBe("utility");
      expect(payload().text.body).toContain(
        status === "confirmed" ? "تم تأكيد حجز" : "تم إلغاء حجز",
      );
    },
  );
  it("keeps approved template sending when Direct Send is disabled", async () => {
    ENV.whatsappDirectSendEnabled = false;
    ENV.whatsappConfirmationTemplate = "booking_confirmation_ar";
    await sendBookingStatusWhatsApp(booking);
    expect(payload()).toMatchObject({
      type: "template",
      template: { name: "booking_confirmation_ar" },
    });
    expect(payload()).not.toHaveProperty("category");
  });
  it("does not retry as a template after Direct Send rejection", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: 100, message: "Direct Send is not enabled" },
        }),
        { status: 400 },
      ),
    );
    await expect(sendBookingStatusWhatsApp(booking)).rejects.toThrow(
      "WhatsApp confirmation rejected (100)",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining("state=?,error_code=?"),
      expect.arrayContaining(["failed", "100"]),
    );
  });
  it("does not resend a duplicate confirmation request", async () => {
    mocks.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await sendBookingStatusWhatsApp({ ...booking, requestKey: "duplicate" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("marks an ambiguous network result unknown without retrying", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    await expect(sendBookingStatusWhatsApp(booking)).rejects.toThrow(
      "تعذر تأكيد نتيجة",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining("state=?,error_code=?"),
      expect.arrayContaining(["unknown", "provider_outcome_unknown"]),
    );
  });
  it("sends OTP using an authentication template and copy-code button, never as utility", async () => {
    await sendPatientLoginOtp("01012345678", "123456");
    expect(payload()).toMatchObject({
      type: "template",
      template: {
        name: "patient_login_otp",
        components: [
          { type: "body", parameters: [{ type: "text", text: "123456" }] },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: "123456" }],
          },
        ],
      },
    });
    expect(payload()).not.toHaveProperty("category");
  });
  it("fails closed when the authentication template is missing", async () => {
    ENV.whatsappAuthenticationTemplate = "";
    await expect(sendPatientLoginOtp("01012345678", "123456")).rejects.toThrow(
      "not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
