import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  patientPortalBookings,
  visitScheduleRequests,
} from "../../drizzle/schema";
import { patientPortalRouter } from "../routers/patientPortal";
import { patientRouter } from "../routers/patient";
import { makeCallerAs } from "./helpers/auth";
import { cleanupTables, getTestDb } from "./setup";

describe.sequential("booking workspace lists", () => {
  beforeEach(async () => {
    const db = await getTestDb();
    await cleanupTables(
      db,
      "patient_portal_bookings",
      "visit_schedule_requests",
    );
    const base = {
      bookingType: "specialist" as const,
      guestPhone: "01000000000",
    };
    await db.insert(patientPortalBookings).values([
      {
        ...base,
        guestName: "rescheduled-to-today",
        status: "confirmed",
        requestedDate: new Date("2026-11-08"),
        confirmedDate: new Date("2026-11-09"),
      },
      {
        ...base,
        guestName: "original-today",
        status: "confirmed",
        requestedDate: new Date("2026-11-09"),
      },
      {
        ...base,
        guestName: "moved-away",
        status: "confirmed",
        requestedDate: new Date("2026-11-09"),
        confirmedDate: new Date("2026-11-10"),
      },
      {
        ...base,
        guestName: "pending-today",
        status: "pending",
        requestedDate: new Date("2026-11-09"),
      },
      {
        ...base,
        guestName: "pending-later",
        status: "pending",
        requestedDate: new Date("2026-11-12"),
      },
      {
        ...base,
        guestName: "cancelled-today",
        status: "cancelled",
        requestedDate: new Date("2026-11-09"),
        confirmedDate: new Date("2026-11-09"),
      },
      {
        ...base,
        guestName: "completed-today",
        status: "completed",
        requestedDate: new Date("2026-11-09"),
        confirmedDate: new Date("2026-11-09"),
      },
    ]);
  });
  afterEach(async () => {
    await cleanupTables(
      await getTestDb(),
      "patient_portal_bookings",
      "visit_schedule_requests",
    );
  });

  it("lists outstanding reception requests from every date while preserving date-specific callers", async () => {
    const db = await getTestDb();
    await db.insert(visitScheduleRequests).values([
      {
        fullName: "earlier",
        service: "specialist",
        visitDate: new Date("2026-11-08"),
        status: "scheduled",
      },
      {
        fullName: "later",
        service: "specialist",
        visitDate: new Date("2026-11-12"),
        status: "scheduled",
      },
      {
        fullName: "cancelled",
        service: "specialist",
        visitDate: new Date("2026-11-12"),
        status: "cancelled",
      },
    ]);
    const caller = patientRouter.createCaller(makeCallerAs("reception"));
    expect(
      (await caller.getVisitScheduleRequests({})).map((row) => row.fullName),
    ).toEqual(["earlier", "later"]);
    expect(
      (await caller.getVisitScheduleRequests({ date: "2026-11-12" })).map(
        (row) => row.fullName,
      ),
    ).toEqual(["later"]);
    expect(
      (await caller.getVisitScheduleRequests({ limit: 1, offset: 1 })).map(
        (row) => row.fullName,
      ),
    ).toEqual(["later"]);
  });

  it("includes only confirmed bookings whose effective appointment is today", async () => {
    const caller = patientPortalRouter.createCaller(makeCallerAs("reception"));
    const bookings = await caller.listBookings({
      status: "confirmed",
      appointmentDate: "2026-11-09",
    });
    expect(bookings.map((booking) => booking.guestName).sort()).toEqual([
      "original-today",
      "rescheduled-to-today",
    ]);
  });

  it("counts all requests and today's confirmed bookings without cancelled or completed entries", async () => {
    const db = await getTestDb();
    await db.insert(visitScheduleRequests).values([
      {
        fullName: "outstanding",
        service: "specialist",
        visitDate: new Date("2026-11-12"),
        status: "scheduled",
      },
      {
        fullName: "cancelled",
        service: "specialist",
        visitDate: new Date("2026-11-12"),
        status: "cancelled",
      },
    ]);
    const caller = patientPortalRouter.createCaller(makeCallerAs("reception"));
    expect(
      await caller.bookingSummary({ appointmentDate: "2026-11-09" }),
    ).toEqual({ pending: 2, confirmed: 2, reception: 1 });
    expect(
      await caller.bookingSummary({ appointmentDate: "2026-11-10" }),
    ).toEqual({ pending: 2, confirmed: 1, reception: 1 });
  });

  it("pages pending requests across dates without duplicating a page", async () => {
    const caller = patientPortalRouter.createCaller(makeCallerAs("reception"));
    const first = await caller.listBookings({ status: "pending", limit: 1 });
    const second = await caller.listBookings({
      status: "pending",
      limit: 1,
      offset: 1,
    });
    expect(
      [...first, ...second].map((booking) => booking.guestName).sort(),
    ).toEqual(["pending-later", "pending-today"]);
    expect(first[0].id).not.toBe(second[0].id);
  });

  it("does not allow a doctor to read reception lists across all dates", async () => {
    await expect(
      patientRouter
        .createCaller(makeCallerAs("doctor"))
        .getVisitScheduleRequests({}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      patientPortalRouter.createCaller(makeCallerAs("doctor")).listBookings({}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
