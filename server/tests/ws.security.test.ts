import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  getEffectiveUserPermissions: vi.fn(),
  isAuthSessionActive: vi.fn(),
}));

vi.mock("../db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db")>()),
  getUserById: mocks.getUserById,
  getEffectiveUserPermissions: mocks.getEffectiveUserPermissions,
  isAuthSessionActive: mocks.isAuthSessionActive,
}));

const { AUTH_COOKIE_NAME } = await import("../_core/auth");
const {
  registerWsServer,
  broadcastAppNotification,
  broadcastSheetUpdate,
  revalidateStaffSockets,
} = await import("../_core/ws");

const ALLOWED_ORIGIN = "https://selrs.cc";
const JWT_SECRET = process.env.JWT_SECRET as string;

type StaffUser = {
  id: number;
  role: string;
  isActive: boolean;
  authVersion: number;
};

const users = new Map<number, StaffUser>();
const permissions = new Map<number, string[]>();

function addUser(id: number, role: string, perms: string[] = [], extra = {}) {
  users.set(id, { id, role, isActive: true, authVersion: 1, ...extra });
  permissions.set(id, perms);
}

function staffCookie(userId: number, authVersion = 1) {
  const token = jwt.sign(
    {
      userId,
      username: `user${userId}`,
      role: users.get(userId)?.role ?? "reception",
      branch: "examinations",
      authVersion,
      jti: `jti-${userId}`,
    },
    JWT_SECRET,
    { expiresIn: "1h" },
  );
  return `${AUTH_COOKIE_NAME}=${token}`;
}

let server: Server;
let baseUrl: string;
const open: WebSocket[] = [];

type Client = {
  ws: WebSocket;
  messages: any[];
  closeCode: () => number | null;
};

function connect(opts: { cookie?: string; origin?: string; query?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.origin) headers.origin = opts.origin;
  const ws = new WebSocket(`${baseUrl}/ws${opts.query ?? ""}`, { headers });
  open.push(ws);
  const messages: any[] = [];
  let code: number | null = null;
  ws.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
  ws.on("close", (c) => {
    code = c;
  });
  ws.on("error", () => {});
  return { ws, messages, closeCode: () => code } as Client;
}

async function waitFor(check: () => boolean, label: string) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function ready(client: Client) {
  await waitFor(
    () =>
      client.messages.some((m) => m.type === "staff-ready") ||
      client.closeCode() !== null,
    "staff-ready or close",
  );
  return client;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

beforeAll(async () => {
  server = createServer();
  registerWsServer(server, {
    isOriginAllowed: (origin, host) => {
      if (origin === ALLOWED_ORIGIN) return true;
      try {
        return new URL(origin).host === host;
      } catch {
        return false;
      }
    },
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  users.clear();
  permissions.clear();
  mocks.getUserById.mockImplementation(async (id: number) => users.get(id) ?? null);
  mocks.getEffectiveUserPermissions.mockImplementation(
    async (id: number) => permissions.get(id) ?? [],
  );
  mocks.isAuthSessionActive.mockResolvedValue(true);
});

afterEach(() => {
  for (const ws of open.splice(0)) ws.terminate();
});

describe("WebSocket upgrade origin", () => {
  beforeEach(() => addUser(1, "admin"));

  it("rejects a foreign Origin with 403 before authenticating", async () => {
    const ws = new WebSocket(`${baseUrl}/ws`, {
      headers: { cookie: staffCookie(1), origin: "https://evil.example" },
    });
    open.push(ws);
    const status = await new Promise<number>((resolve, reject) => {
      ws.on("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0));
      ws.on("open", () => reject(new Error("socket opened")));
      ws.on("error", () => {});
    });
    expect(status).toBe(403);
    expect(mocks.isAuthSessionActive).not.toHaveBeenCalled();
  });

  it("accepts an allowed Origin", async () => {
    const client = await ready(
      connect({ cookie: staffCookie(1), origin: ALLOWED_ORIGIN }),
    );
    expect(client.messages).toContainEqual({ type: "staff-ready" });
  });

  it("accepts a handshake without Origin (native clients)", async () => {
    const client = await ready(connect({ cookie: staffCookie(1) }));
    expect(client.messages).toContainEqual({ type: "staff-ready" });
  });
});

describe("WebSocket staff authentication", () => {
  it("rejects connections without a session", async () => {
    const client = await ready(connect());
    expect(client.closeCode()).toBe(1008);
  });

  it("rejects an inactive account even with a valid token", async () => {
    addUser(2, "reception", [], { isActive: false });
    const client = await ready(connect({ cookie: staffCookie(2) }));
    expect(client.closeCode()).toBe(1008);
  });

  it("rejects a token issued before authVersion was bumped", async () => {
    addUser(3, "reception", [], { authVersion: 5 });
    const client = await ready(connect({ cookie: staffCookie(3, 4) }));
    expect(client.closeCode()).toBe(1008);
  });

  it("rejects a revoked session", async () => {
    addUser(4, "reception");
    mocks.isAuthSessionActive.mockResolvedValue(false);
    const client = await ready(connect({ cookie: staffCookie(4) }));
    expect(client.closeCode()).toBe(1008);
  });

  it("closes an open socket when the account is disabled later", async () => {
    addUser(5, "reception");
    const client = await ready(connect({ cookie: staffCookie(5) }));
    expect(client.messages).toContainEqual({ type: "staff-ready" });

    users.get(5)!.isActive = false;
    await revalidateStaffSockets();
    await waitFor(() => client.closeCode() !== null, "close after disable");
    expect(client.closeCode()).toBe(1008);
  });

  it("closes an open socket when its session is revoked later", async () => {
    addUser(6, "reception");
    const client = await ready(connect({ cookie: staffCookie(6) }));
    mocks.isAuthSessionActive.mockResolvedValue(false);
    await revalidateStaffSockets();
    await waitFor(() => client.closeCode() !== null, "close after revoke");
    expect(client.closeCode()).toBe(1008);
  });

  it("keeps healthy sockets open during revalidation", async () => {
    addUser(7, "reception");
    const client = await ready(connect({ cookie: staffCookie(7) }));
    await revalidateStaffSockets();
    await settle();
    expect(client.closeCode()).toBeNull();
  });
});

describe("patient sheet subscriptions", () => {
  it("delivers updates only to staff allowed to open patient files", async () => {
    addUser(10, "reception", ["/patient-file:r"]);
    addUser(11, "stockroom", ["/stockroom"]);
    const allowed = await ready(connect({ cookie: staffCookie(10) }));
    const denied = await ready(connect({ cookie: staffCookie(11) }));

    allowed.ws.send(JSON.stringify({ type: "subscribe", patientId: 42 }));
    denied.ws.send(JSON.stringify({ type: "subscribe", patientId: 42 }));
    await waitFor(
      () => denied.messages.some((m) => m.type === "subscribe-denied"),
      "subscribe-denied",
    );
    await settle();

    broadcastSheetUpdate(42, "lasik");
    await waitFor(
      () => allowed.messages.some((m) => m.type === "sheetUpdated"),
      "sheetUpdated for allowed user",
    );
    await settle();

    expect(allowed.messages.find((m) => m.type === "sheetUpdated")).toMatchObject({
      patientId: 42,
      sheetType: "lasik",
    });
    expect(denied.messages.some((m) => m.type === "sheetUpdated")).toBe(false);
    expect(denied.closeCode()).toBeNull();
  });

  it("lets admins subscribe without explicit page permissions", async () => {
    addUser(12, "admin");
    const admin = await ready(connect({ cookie: staffCookie(12) }));
    admin.ws.send(JSON.stringify({ type: "subscribe", patientId: 7 }));
    await settle();
    broadcastSheetUpdate(7, "clinical");
    await waitFor(
      () => admin.messages.some((m) => m.type === "sheetUpdated"),
      "sheetUpdated for admin",
    );
  });
});

describe("app notification targeting", () => {
  const notify = (extra: Record<string, unknown>) =>
    broadcastAppNotification({
      id: "n1",
      title: "t",
      message: "m",
      ...extra,
    } as any);
  const got = (c: Client) => c.messages.some((m) => m.type === "app-notification");

  it("honours targetUserIds, targetRoles and keeps doctor sockets out", async () => {
    addUser(20, "reception");
    addUser(21, "nurse");
    addUser(22, "admin");
    const reception = await ready(connect({ cookie: staffCookie(20) }));
    const nurse = await ready(connect({ cookie: staffCookie(21) }));
    const admin = await ready(connect({ cookie: staffCookie(22) }));
    const doctor = connect({
      query: `?doctorToken=${jwt.sign({ type: "externalDoctor", doctorId: 9 }, JWT_SECRET)}`,
    });
    await waitFor(() => doctor.ws.readyState === WebSocket.OPEN, "doctor socket");

    // Explicit user ids win over roles.
    notify({ targetUserIds: [21], targetRoles: ["reception"] });
    await waitFor(() => got(nurse), "nurse notification");
    await settle();
    expect(got(reception)).toBe(false);
    expect(got(admin)).toBe(false);
    expect(got(doctor)).toBe(false);

    nurse.messages.length = 0;
    // Role targeting is case-insensitive.
    notify({ targetRoles: ["Reception"] });
    await waitFor(() => got(reception), "reception notification");
    await settle();
    expect(got(nurse)).toBe(false);
    expect(got(admin)).toBe(false);
    expect(got(doctor)).toBe(false);

    reception.messages.length = 0;
    // Untargeted notifications reach every staff socket, never doctors.
    notify({});
    await waitFor(() => got(reception) && got(nurse) && got(admin), "broadcast");
    await settle();
    expect(got(doctor)).toBe(false);
  });
});
