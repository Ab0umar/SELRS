import { describe, expect, it } from "vitest";
import { operationBookingSchema } from "../../shared/operationBooking";

const booking = {
  bookingDate: "2026-10-25",
  bookingTime: "12:30",
  doctorName: "Test doctor",
  operationType: "PRK",
  casesCount: 1,
};
describe("operation booking validation", () => {
  it("accepts a valid booking", () =>
    expect(operationBookingSchema.safeParse(booking).success).toBe(true));
  it.each([
    { bookingDate: "2026-02-31" },
    { bookingTime: "25:00" },
    { doctorName: "   " },
    { operationType: "" },
    { casesCount: 0 },
    { casesCount: 1.5 },
  ])("rejects invalid booking fields %j", (fields) => {
    expect(
      operationBookingSchema.safeParse({ ...booking, ...fields }).success,
    ).toBe(false);
  });
});
