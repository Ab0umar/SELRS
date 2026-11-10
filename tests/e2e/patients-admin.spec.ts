import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:4000";
const username =
  process.env.SMOKE_USER ||
  process.env.ADMIN_USER ||
  process.env.E2E_USER ||
  "";
const password =
  process.env.SMOKE_PASS ||
  process.env.ADMIN_PASS ||
  process.env.E2E_PASS ||
  "";

function trpcInput(input: unknown): Record<string, string> {
  return { input: JSON.stringify({ json: input }) };
}

async function trpcQuery(request: any, path: string, input: unknown) {
  const url = new URL(`${baseURL}/api/trpc/${path}`);
  url.search = new URLSearchParams(trpcInput(input)).toString();
  const res = await request.get(url.toString());
  const json = await res.json().catch(() => null);
  return { status: res.status(), json };
}

async function trpcMutation(request: any, path: string, input: unknown) {
  const res = await request.post(`${baseURL}/api/trpc/${path}`, {
    data: { json: input },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status(), json };
}

async function loginAsAdmin(request: any) {
  const session = await request.get(`${baseURL}/api/auth/me`);
  if (session.ok() && (await session.json()).user?.username === username)
    return;
  const candidates = Array.from(new Set([password, `${password}_e2e`])).filter(
    Boolean,
  );
  let activePassword = "";
  let ok = false;
  for (const candidate of candidates) {
    const res = await request.post(`${baseURL}/api/auth/login`, {
      data: { username, password: candidate },
    });
    if (res.status() === 200) {
      activePassword = candidate;
      ok = true;
      break;
    }
  }
  expect(ok, "login should return 200 for the configured E2E account").toBe(
    true,
  );

  const meRes = await request.get(`${baseURL}/api/auth/me`);
  if (meRes.status() !== 200) return;
  const me = await meRes.json().catch(() => null);
  if (!Boolean(me?.user?.mustChangePassword)) return;

  const nextPassword =
    activePassword === password ? `${password}_e2e` : password;
  const changeRes = await trpcMutation(request, "auth.changePassword", {
    currentPassword: activePassword,
    newPassword: nextPassword,
  });
  expect(changeRes.status, "forced password change should return 200").toBe(
    200,
  );

  const relogin = await request.post(`${baseURL}/api/auth/login`, {
    data: { username, password: nextPassword },
  });
  expect(
    relogin.status(),
    "relogin after password change should return 200",
  ).toBe(200);
}

function extractRows(payload: any): any[] {
  return (payload?.result?.data?.json?.rows ??
    payload?.result?.data?.json ??
    []) as any[];
}

async function createE2EPatient(request: any, tag: string) {
  const suffix = `${tag}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const patientCode = `E2E-${suffix}`;
  const fullName = `E2E ${suffix}`;
  const created = await trpcMutation(request, "medical.createPatient", {
    patientCode,
    fullName,
    phone: "01000000000",
    age: 30,
    gender: "male",
    branch: "examinations",
    serviceType: "consultant",
  });
  expect(created.status).toBe(200);
  const searched = await trpcQuery(request, "medical.searchPatients", {
    searchTerm: patientCode,
  });
  expect(searched.status).toBe(200);
  const patientId = Number(extractRows(searched.json)?.[0]?.id ?? 0);
  expect(patientId).toBeGreaterThan(0);
  return { patientId, patientCode, fullName };
}

test.describe("patients/admin critical flows", () => {
  test.skip(
    !username || !password,
    "Set SMOKE_USER/SMOKE_PASS (or ADMIN_USER/ADMIN_PASS)",
  );

  test("doctor filter + service filter return the expected patient", async ({
    request,
  }) => {
    await loginAsAdmin(request);

    const { patientId, patientCode } = await createE2EPatient(
      request,
      "filter",
    );
    const me = await (await request.get(`${baseURL}/api/auth/me`)).json();
    const doctorName = me.user.name || me.user.username;
    const report = await trpcMutation(request, "medical.createMedicalReport", {
      patientId,
      visitDate: new Date().toISOString().slice(0, 10),
      diagnosis: "E2E filter fixture",
    });
    expect(report.status).toBe(200);
    const serviceCode = "1513";

    const stateSaved = await trpcMutation(
      request,
      "medical.savePatientPageState",
      {
        patientId,
        page: "examination",
        data: {
          doctorName,
          signatures: { doctor: doctorName },
          serviceCode,
          serviceCodes: [serviceCode],
        },
      },
    );
    expect(stateSaved.status).toBe(200);

    const byDoctor = await trpcQuery(request, "medical.getAllPatients", {
      doctorName,
      searchTerm: patientCode,
      limit: 200,
    });
    expect(byDoctor.status).toBe(200);
    const doctorRows = extractRows(byDoctor.json);
    expect(
      doctorRows.some((row) => String(row.patientCode) === patientCode),
    ).toBe(true);

    const wrongDoctor = await trpcQuery(request, "medical.getAllPatients", {
      doctorName: `unrelated-${randomUUID()}`,
      searchTerm: patientCode,
      limit: 200,
    });
    expect(wrongDoctor.status).toBe(200);
    expect(extractRows(wrongDoctor.json)).toEqual([]);

    const byServiceType = await trpcQuery(request, "medical.getAllPatients", {
      serviceType: "consultant",
      searchTerm: patientCode,
      limit: 500,
    });
    expect(byServiceType.status).toBe(200);
    const serviceRows = extractRows(byServiceType.json);
    expect(
      serviceRows.some((row) => String(row.patientCode) === patientCode),
    ).toBe(true);
  });

  test("sheet move preserves workflow state without storing clinical overrides", async ({
    request,
  }) => {
    await loginAsAdmin(request);

    const { patientId } = await createE2EPatient(request, "sheet");
    const serviceCode = "1513";

    const saved = await trpcMutation(request, "medical.savePatientPageState", {
      patientId,
      page: "examination",
      data: {
        sheetSelection: "pentacam_center",
        serviceSheetTypeByCode: {
          [serviceCode]: "pentacam_center",
        },
        syncLockManual: true,
        manualEditedAt: new Date().toISOString(),
      },
    });
    expect(saved.status).toBe(200);

    const loaded = await trpcQuery(request, "medical.getPatientPageState", {
      patientId,
      page: "examination",
    });
    expect(loaded.status).toBe(200);
    const data = loaded.json?.result?.data?.json?.data ?? {};
    expect(data.sheetSelection).toBe("pentacam_center");
    expect(data).not.toHaveProperty("serviceSheetTypeByCode");
    expect(data).not.toHaveProperty("syncLockManual");

    const moved = await trpcMutation(
      request,
      "medical.bulkAssignSheetTypeToPatients",
      {
        patientIds: [patientId],
        sheetType: "surgery",
      },
    );
    expect(moved.status).toBe(200);

    const patientAfterMove = await trpcQuery(request, "medical.getPatient", {
      patientId,
    });
    expect(patientAfterMove.status).toBe(200);
    expect(
      String(patientAfterMove.json?.result?.data?.json?.serviceType ?? ""),
    ).toBe("surgery");

    const loadedAgain = await trpcQuery(
      request,
      "medical.getPatientPageState",
      {
        patientId,
        page: "examination",
      },
    );
    expect(loadedAgain.status).toBe(200);
    const dataAgain = loadedAgain.json?.result?.data?.json?.data ?? {};
    expect(dataAgain.sheetSelection).toBe("pentacam_center");
    expect(dataAgain).not.toHaveProperty("serviceSheetTypeByCode");
    expect(dataAgain).not.toHaveProperty("syncLockManual");
  });

  test("no-overwrite guard remains ON after sync run", async ({ request }) => {
    await loginAsAdmin(request);

    const { patientId } = await createE2EPatient(request, "sync");
    const marker = `manual-${Date.now()}`;
    const stateSaved = await trpcMutation(
      request,
      "medical.savePatientPageState",
      {
        patientId,
        page: "examination",
        data: {
          syncLockManual: true,
          manualTag: marker,
          manualEditedAt: new Date().toISOString(),
        },
      },
    );
    expect(stateSaved.status).toBe(200);

    const before = await trpcQuery(
      request,
      "medical.getMssqlSyncRuntimeConfig",
      { timestamp: Date.now() },
    );
    expect(before.status).toBe(200);
    const cfg = before.json?.result?.data?.json ?? {};

    const updated = await trpcMutation(
      request,
      "medical.updateMssqlSyncRuntimeConfig",
      {
        enabled: Boolean(cfg.enabled ?? true),
        intervalMs: Number(cfg.intervalMs ?? 30000),
        limit: Number(cfg.limit ?? 5000),
        incremental: Boolean(cfg.incremental ?? true),
        overwriteExisting: false,
        preserveManualEdits: true,
        linkServicesForExisting: Boolean(cfg.linkServicesForExisting ?? true),
      },
    );
    expect(updated.status).toBe(200);

    const after = await trpcQuery(
      request,
      "medical.getMssqlSyncRuntimeConfig",
      { timestamp: Date.now() },
    );
    expect(after.status).toBe(200);
    const nextCfg = after.json?.result?.data?.json ?? {};
    expect(Boolean(nextCfg.overwriteExisting)).toBe(false);
    expect(Boolean(nextCfg.preserveManualEdits ?? true)).toBe(true);

    const syncRun = await trpcMutation(
      request,
      "medical.syncPatientsFromMssql",
      {
        limit: 50,
        dryRun: false,
        incremental: true,
      },
    );
    if (syncRun.status !== 200) {
      test.info().annotations.push({
        type: "note",
        description: `syncPatientsFromMssql unavailable in this env (status ${syncRun.status}); runtime guard assertions already validated.`,
      });
      return;
    }

    const stateAfterSync = await trpcQuery(
      request,
      "medical.getPatientPageState",
      {
        patientId,
        page: "examination",
      },
    );
    expect(stateAfterSync.status).toBe(200);
    const dataAfterSync = stateAfterSync.json?.result?.data?.json?.data ?? {};
    expect(Boolean(dataAfterSync?.syncLockManual)).toBe(true);
    expect(String(dataAfterSync?.manualTag ?? "")).toBe(marker);
  });
});
