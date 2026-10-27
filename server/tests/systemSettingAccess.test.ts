import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";

vi.mock("../db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db")>()),
  getSystemSetting: vi.fn(),
  getEffectiveUserPermissions: vi.fn().mockResolvedValue([]),
}));

import * as db from "../db";
import { router } from "../_core/procedures";
import { medicalOpsRoutes } from "../routers/medical-ops";
import {
  canonicalSettingKey,
  isStaffReadableSetting,
} from "../routers/_medical/systemSettingAccess";

const appRouter = router({
  getSystemSetting: medicalOpsRoutes.getSystemSetting,
});
const as = (role: string) => appRouter.createCaller(makeCallerAs(role));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getEffectiveUserPermissions).mockResolvedValue([]);
  vi.mocked(db.getSystemSetting).mockImplementation(
    async (key: string) =>
      ({ key, value: JSON.stringify({ secret: true }), updatedAt: null }) as any,
  );
});

describe("getSystemSetting access", () => {
  it("normalizes keys the way MySQL compares them", () => {
    expect(canonicalSettingKey("  APPOINTMENTS_PRICING_V1 ")).toBe(
      "appointments_pricing_v1",
    );
    expect(isStaffReadableSetting("Sheet_Designer_Config")).toBe(true);
    expect(isStaffReadableSetting("salary_rates_v1")).toBe(false);
  });

  it.each([
    "team_permissions_v1",
    "mssql_sync_runtime_v1",
    "attendance_devices",
    "op_reminder_config",
    "some_future_secret_key",
    "TEAM_PERMISSIONS_V1",
  ])("hides %s from non-admins without reading it", async (key) => {
    await expect(as("reception").getSystemSetting({ key })).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
    expect(db.getSystemSetting).not.toHaveBeenCalled();
  });

  it("lets an admin read any key", async () => {
    await expect(
      as("admin").getSystemSetting({ key: "team_permissions_v1" }),
    ).resolves.toMatchObject({ key: "team_permissions_v1" });
  });

  it("serves the keys the app screens load", async () => {
    for (const key of [
      "clinical_print_settings_v1",
      "service_directory",
      "sheet_designer_config",
      "mobile_sheet_mode_v1",
      "doctor_service_sheet_match_v1",
      "app_notifications_feed_v1",
      "app_notification_settings_v1",
    ]) {
      await expect(
        as("reception").getSystemSetting({ key }),
      ).resolves.toMatchObject({ key });
    }
  });

  it("applies the pricing permission check to any casing of the key", async () => {
    for (const key of ["appointments_pricing_v1", "APPOINTMENTS_PRICING_V1"]) {
      await expect(
        as("reception").getSystemSetting({ key }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    vi.mocked(db.getEffectiveUserPermissions).mockResolvedValue([
      "/appointments/accounts",
    ]);
    await expect(
      as("reception").getSystemSetting({ key: "Appointments_Pricing_V1" }),
    ).resolves.toMatchObject({ value: { secret: true } });
  });
});
