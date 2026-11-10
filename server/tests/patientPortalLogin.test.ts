import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import {
  patients,
  patientPortalOtps,
  patientPortalSessions,
} from "../../drizzle/schema";
import { appRouter } from "../routers";
import { cleanupTables, getTestDb } from "./setup";
import { makeCallerAs } from "./helpers/auth";
import { sendPatientLoginOtp } from "../services/patientOtpWhatsApp";
vi.mock("../services/patientOtpWhatsApp", () => ({
  patientOtpConfigured: () => true,
  sendPatientLoginOtp: vi.fn().mockResolvedValue(undefined),
}));
const caller = () => {
  const context = makeCallerAs("viewer");
  context.user = null;
  context.req.ip = "198.51.100.7";
  return appRouter.createCaller(context);
};
const input = { phone: "01012345678", dateOfBirth: "1990-03-15" };
const lastCode = () => vi.mocked(sendPatientLoginOtp).mock.calls.at(-1)![1];
const verify = (
  challengeId: string,
  code = lastCode(),
  dateOfBirth: string | undefined = input.dateOfBirth,
) => caller().patientPortal.verifyLoginOtp({ challengeId, code, dateOfBirth });
type LoginResult = Awaited<ReturnType<typeof verify>>;
function session(result: LoginResult) {
  if (result.requiresPatientSelection)
    throw new Error("Expected a single patient session");
  return result;
}
function choices(result: LoginResult) {
  if (!result.requiresPatientSelection)
    throw new Error("Expected patient choices");
  return result;
}
async function sharedPhone() {
  await (
    await getTestDb()
  )
    .update(patients)
    .set({ phone: input.phone, dateOfBirth: new Date("1990-03-15T12:00:00") })
    .where(eq(patients.patientCode, "FAM-2"));
}

describe.sequential(
  "patient portal phone, birthdate and WhatsApp OTP login",
  () => {
    const tables = [
      "patient_portal_otps",
      "patient_portal_sessions",
      "patients",
      "login_rate_limits",
    ];
    beforeEach(async () => {
      vi.mocked(sendPatientLoginOtp).mockReset().mockResolvedValue(undefined);
      const db = await getTestDb();
      await cleanupTables(db, ...tables);
      await db.insert(patients).values([
        {
          patientCode: "FAM-1",
          fullName: "Parent",
          phone: input.phone,
          dateOfBirth: new Date("1990-03-15T12:00:00"),
          branch: "examinations",
        },
        {
          patientCode: "FAM-2",
          fullName: "Child",
          phone: "01098765432",
          dateOfBirth: null,
          branch: "examinations",
        },
      ]);
    });
    afterEach(async () => cleanupTables(await getTestDb(), ...tables));

    it("replaces patient code with phone and birthdate, requiring OTP before a session", async () => {
      const challenge = await caller().patientPortal.login(input);
      expect(challenge).not.toHaveProperty("token");
      expect(challenge).not.toHaveProperty("patients");
      const db = await getTestDb();
      expect(await db.select().from(patientPortalSessions)).toHaveLength(0);
      const [row] = await db.select().from(patientPortalOtps);
      expect(row.code).toMatch(/^[a-f0-9]{64}$/);
      expect(row.code).not.toBe(lastCode());
      const result = session(await verify(challenge.challengeId));
      expect(result.patient.name).toBe("Parent");
      expect(jwt.decode(result.token)).toMatchObject({
        type: "patient",
        patientId: row.patientId,
      });
    });

    it.each([undefined, "2001-12-01"])(
      "does not send OTP for a registered birthday mismatch (%s)",
      async (dateOfBirth) => {
        const result = await caller().patientPortal.login({
          phone: input.phone,
          dateOfBirth,
        });
        expect(result).toMatchObject({
          challengeId: expect.any(String),
          expiresInSeconds: 300,
        });
        expect(sendPatientLoginOtp).not.toHaveBeenCalled();
        expect(
          await (await getTestDb()).select().from(patientPortalOtps),
        ).toHaveLength(0);
      },
    );

    it("lets a patient with no recorded birthdate continue with phone and OTP", async () => {
      const challenge = await caller().patientPortal.login({
        phone: "01098765432",
      });
      const result = session(
        await caller().patientPortal.verifyLoginOtp({
          challengeId: challenge.challengeId,
          code: lastCode(),
        }),
      );
      expect(result.patient.name).toBe("Child");
    });

    it("excludes blank birthdates when a birthday is supplied on a shared phone", async () => {
      await (
        await getTestDb()
      )
        .update(patients)
        .set({ phone: input.phone })
        .where(eq(patients.patientCode, "FAM-2"));
      const challenge = await caller().patientPortal.login(input);
      expect(session(await verify(challenge.challengeId)).patient.name).toBe(
        "Parent",
      );
    });

    it("does not consume phone send quotas for mismatched birthdates", async () => {
      for (let i = 0; i < 3; i++)
        await caller().patientPortal.login({
          ...input,
          dateOfBirth: "2001-12-01",
        });
      expect(sendPatientLoginOtp).not.toHaveBeenCalled();
      const challenge = await caller().patientPortal.login(input);
      expect(sendPatientLoginOtp).toHaveBeenCalledTimes(1);
      expect(session(await verify(challenge.challengeId)).patient.name).toBe(
        "Parent",
      );
    });

    it("returns names only after OTP verification and does not create a session before selection", async () => {
      await sharedPhone();
      const challenge = await caller().patientPortal.login(input);
      expect(challenge).not.toHaveProperty("patients");
      const result = choices(await verify(challenge.challengeId));
      expect(result.patients.map((p) => p.name)).toEqual(["Parent", "Child"]);
      expect(jwt.decode(result.selectionToken)).toMatchObject({
        type: "patient-selection",
      });
      expect(
        await (await getTestDb()).select().from(patientPortalSessions),
      ).toHaveLength(0);
      const selected = await caller().patientPortal.selectLoginPatient({
        selectionToken: result.selectionToken,
        patientId: result.patients[1].id,
      });
      expect(selected.patient.name).toBe("Child");
      expect(jwt.decode(selected.token)).toMatchObject({
        type: "patient",
        patientId: result.patients[1].id,
      });
    });

    it("does not include another registered birthday among the matching choices", async () => {
      await sharedPhone();
      await (
        await getTestDb()
      )
        .update(patients)
        .set({ dateOfBirth: new Date("2010-05-20T12:00:00") })
        .where(eq(patients.patientCode, "FAM-2"));
      const challenge = await caller().patientPortal.login(input);
      expect(session(await verify(challenge.challengeId)).patient.name).toBe(
        "Parent",
      );
    });

    it("shows multiple unrecorded birthdays without requiring a birthday", async () => {
      await sharedPhone();
      await (await getTestDb()).update(patients).set({ dateOfBirth: null });
      const challenge = await caller().patientPortal.login({
        phone: input.phone,
      });
      const result = choices(
        await caller().patientPortal.verifyLoginOtp({
          challengeId: challenge.challengeId,
          code: lastCode(),
        }),
      );
      expect(result.patients).toHaveLength(2);
    });

    it("rejects patient selection without OTP proof, including a tampered ticket", async () => {
      await expect(
        caller().patientPortal.selectLoginPatient({
          selectionToken: "not-a-ticket",
          patientId: 1,
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await sharedPhone();
      const challenge = await caller().patientPortal.login(input);
      const result = choices(await verify(challenge.challengeId));
      await expect(
        caller().patientPortal.selectLoginPatient({
          selectionToken: result.selectionToken + "bad",
          patientId: result.patients[0].id,
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("rejects selection of a patient outside the verified phone", async () => {
      await sharedPhone();
      const challenge = await caller().patientPortal.login(input);
      const result = choices(await verify(challenge.challengeId));
      await (await getTestDb()).insert(patients).values({
        patientCode: "OTHER",
        fullName: "Other",
        phone: "01011111111",
        branch: "examinations",
      });
      const [other] = await (
        await getTestDb()
      )
        .select()
        .from(patients)
        .where(eq(patients.patientCode, "OTHER"));
      await expect(
        caller().patientPortal.selectLoginPatient({
          selectionToken: result.selectionToken,
          patientId: other.id,
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("allows only one concurrent patient selection and rejects replay", async () => {
      await sharedPhone();
      const challenge = await caller().patientPortal.login(input);
      const result = choices(await verify(challenge.challengeId));
      const request = {
        selectionToken: result.selectionToken,
        patientId: result.patients[0].id,
      };
      const outcomes = await Promise.allSettled([
        caller().patientPortal.selectLoginPatient(request),
        caller().patientPortal.selectLoginPatient(request),
      ]);
      expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      await expect(
        caller().patientPortal.selectLoginPatient(request),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      expect(
        await (await getTestDb()).select().from(patientPortalSessions),
      ).toHaveLength(1);
    });

    it("expires patient selection proof", async () => {
      await sharedPhone();
      const challenge = await caller().patientPortal.login(input);
      const result = choices(await verify(challenge.challengeId));
      await (
        await getTestDb()
      )
        .update(patientPortalOtps)
        .set({ expiresAt: new Date(Date.now() - 1000) });
      await expect(
        caller().patientPortal.selectLoginPatient({
          selectionToken: result.selectionToken,
          patientId: result.patients[0].id,
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("does not reveal unknown phones", async () => {
      expect(
        await caller().patientPortal.login({ ...input, phone: "01099999999" }),
      ).toMatchObject({
        challengeId: expect.any(String),
        expiresInSeconds: 300,
      });
      expect(sendPatientLoginOtp).not.toHaveBeenCalled();
    });

    it("normalizes Arabic digits and international phone prefixes", async () => {
      const challenge = await caller().patientPortal.login({
        ...input,
        phone: "+٢٠١٠١٢٣٤٥٦٧٨",
      });
      expect(sendPatientLoginOtp).toHaveBeenCalledWith(
        input.phone,
        expect.stringMatching(/^\d{6}$/),
      );
      expect(session(await verify(challenge.challengeId))).toHaveProperty(
        "token",
      );
    });

    it("binds the birthday to the challenge rather than allowing it to change after sending", async () => {
      const challenge = await caller().patientPortal.login(input);
      await expect(
        verify(challenge.challengeId, lastCode(), "2001-01-01"),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("rejects concurrent OTP consumption and replay", async () => {
      const challenge = await caller().patientPortal.login(input),
        code = lastCode();
      const outcomes = await Promise.allSettled([
        verify(challenge.challengeId, code),
        verify(challenge.challengeId, code),
      ]);
      expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      await expect(verify(challenge.challengeId, code)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("persists five failed guesses and locks the challenge", async () => {
      const challenge = await caller().patientPortal.login(input),
        correct = lastCode();
      const wrong = correct === "111111" ? "222222" : "111111";
      for (let i = 0; i < 5; i++)
        await expect(
          verify(challenge.challengeId, wrong),
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await expect(
        verify(challenge.challengeId, correct),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      const [row] = await (await getTestDb()).select().from(patientPortalOtps);
      expect(row.attempts).toBe(5);
    });

    it("rejects expired codes", async () => {
      const challenge = await caller().patientPortal.login(input);
      await (
        await getTestDb()
      )
        .update(patientPortalOtps)
        .set({ expiresAt: new Date(Date.now() - 1000) });
      await expect(verify(challenge.challengeId)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("limits resending and invalidates the previous OTP", async () => {
      const first = await caller().patientPortal.login(input),
        code = lastCode();
      await expect(caller().patientPortal.login(input)).resolves.toMatchObject({
        expiresInSeconds: 300,
        resendAfterSeconds: 60,
      });
      expect(sendPatientLoginOtp).toHaveBeenCalledTimes(1);
      await cleanupTables(await getTestDb(), "login_rate_limits");
      await caller().patientPortal.login(input);
      await expect(verify(first.challengeId, code)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("invalidates an OTP after an uncertain provider response", async () => {
      vi.mocked(sendPatientLoginOtp).mockRejectedValueOnce(
        new Error("timeout"),
      );
      const failed = await caller().patientPortal.login(input);
      const unknown = await caller().patientPortal.login({
        ...input,
        phone: "01011111111",
      });
      expect(Object.keys(failed).sort()).toEqual(Object.keys(unknown).sort());
      expect(failed).toMatchObject({
        expiresInSeconds: unknown.expiresInSeconds,
        resendAfterSeconds: unknown.resendAfterSeconds,
      });
      const [row] = await (await getTestDb()).select().from(patientPortalOtps);
      expect(row.verified).toBe(true);
      await expect(verify(row.challengeId!, lastCode())).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("rechecks the stored phone before issuing a session", async () => {
      const challenge = await caller().patientPortal.login(input);
      await (
        await getTestDb()
      )
        .update(patients)
        .set({ phone: "01099999999" })
        .where(eq(patients.patientCode, "FAM-1"));
      await expect(verify(challenge.challengeId)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  },
);
