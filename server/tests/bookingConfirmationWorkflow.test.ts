import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  receipt: vi.fn().mockResolvedValue(undefined),
  status: vi.fn().mockResolvedValue(undefined),
  email: vi.fn().mockResolvedValue(undefined),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../_core/procedures", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC
    .context<{ patientSession: { patientId: number } }>()
    .create();
  return {
    router: t.router,
    publicProcedure: t.procedure,
    protectedProcedure: t.procedure,
    adminProcedure: t.procedure,
    patientPortalProcedure: t.procedure,
    receptionProcedure: t.procedure,
  };
});
vi.mock("../db", () => ({
  getDb: async () => ({
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
  }),
  getGlassesRecordsByPatient: vi.fn(),
  getMedicalHistoryByPatient: vi.fn(),
  getPrescriptionsWithItemsByPatient: vi.fn(),
  consumeLoginRateLimit: vi.fn(),
  clearLoginRateLimit: vi.fn(),
}));
vi.mock("../services/bookingWhatsApp.service", () => ({
  sendBookingStatusWhatsApp: mocks.status,
  sendBookingReceiptWhatsApp: mocks.receipt,
}));
vi.mock("../services/bookingEmail.service", () => ({
  sendBookingStatusEmail: mocks.email,
}));
vi.mock("../_core/ws", () => ({ broadcastBookingUpdate: vi.fn() }));
vi.mock("../_core/appNotifications", () => ({
  pushAppNotification: vi.fn().mockResolvedValue(undefined),
  getAppNotificationSettings: vi
    .fn()
    .mockResolvedValue({ bookings: { enabled: false } }),
  DEFAULT_APP_NOTIFICATION_SETTINGS: { bookings: { enabled: false } },
}));
vi.mock("../_core/webPush", () => ({ sendWebPushToSubscription: vi.fn() }));
import { patientPortalRouter } from "../routers/patientPortal";
const caller = () =>
  patientPortalRouter.createCaller({ patientSession: { patientId: 7 } });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockReturnValue({
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  });
  mocks.update.mockReturnValue({
    set: vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
});
describe("booking WhatsApp workflow", () => {
  it("acknowledges a guest request while keeping it pending", async () => {
    await caller().createGuestBooking({
      guestName: "Synthetic guest",
      guestPhone: "01000000000",
      bookingType: "specialist",
      requestedDate: "2026-10-29",
    });
    expect(mocks.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
    expect(mocks.receipt).toHaveBeenCalledWith(
      expect.objectContaining({ recipientPhone: "01000000000" }),
    );
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it("acknowledges an authenticated patient's request", async () => {
    mocks.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            { name: "Synthetic patient", phone: "01000000000" },
          ],
        }),
      }),
    });
    await caller().createBooking({
      bookingType: "specialist",
      requestedDate: "2026-10-29",
    });
    expect(mocks.receipt).toHaveBeenCalledTimes(1);
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it("sends WhatsApp on deliberate re-confirmation without repeating email", async () => {
    mocks.select.mockReturnValue({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            limit: async () => [
              {
                status: "confirmed",
                patientId: null,
                bookingType: "specialist",
                requestedDate: new Date(),
                guestPhone: "01000000000",
              },
            ],
          }),
        }),
      }),
    });
    await caller().updateBooking({
      id: 1,
      status: "confirmed",
      confirmationRequestId: "e54fc13b-a310-4d4c-a371-d8c96cbe4902",
    });
    expect(mocks.status).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "confirmed",
        requestKey: expect.stringContaining("e54fc13b"),
      }),
    );
    expect(mocks.email).not.toHaveBeenCalled();
  });
  const stubBooking = (status: string) =>
    mocks.select.mockReturnValue({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            limit: async () => [
              {
                status,
                patientId: null,
                bookingType: "specialist",
                requestedDate: new Date(),
                guestPhone: "01000000000",
              },
            ],
          }),
        }),
      }),
    });
  it("does not message again when only notes change on an unchanged status", async () => {
    stubBooking("confirmed");
    await caller().updateBooking({ id: 1, status: "confirmed", staffNotes: "x" });
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it("messages when the status actually changes", async () => {
    stubBooking("pending");
    await caller().updateBooking({ id: 1, status: "confirmed" });
    expect(mocks.status).toHaveBeenCalledTimes(1);
  });
});
