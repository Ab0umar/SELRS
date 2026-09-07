import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ENV } from "../_core/env";
import {
  bookingBranch,
  bookingMapLocation,
  KFS_BOOKING_ADDRESS,
  KFS_BOOKING_MAP_FALLBACK,
} from "./bookingWhatsApp.service";

let originalKfsMapUrl: string;

beforeEach(() => {
  originalKfsMapUrl = ENV.whatsappKfsMapUrl;
  ENV.whatsappKfsMapUrl = "";
});

afterEach(() => {
  ENV.whatsappKfsMapUrl = originalKfsMapUrl;
});

describe("Kafr El Sheikh booking confirmation details", () => {
  it("uses the Kafr El Sheikh address and never Tanta's map as a fallback", () => {
    expect(bookingBranch("kfs")).toBe(KFS_BOOKING_ADDRESS);
    expect(bookingMapLocation("kfs")).toBe(KFS_BOOKING_MAP_FALLBACK);
    expect(bookingMapLocation("kfs")).not.toBe(
      bookingMapLocation("tanta"),
    );
  });
});
