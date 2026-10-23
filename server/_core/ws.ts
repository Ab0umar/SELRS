import type { IncomingMessage, Server } from "http";
import { URL } from "node:url";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { parse as parseCookieHeader } from "cookie";
import jwt from "jsonwebtoken";
import { authService, AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "./auth";
import { ENV } from "./env";
import { permMatchesPath } from "./procedures";
import * as db from "../db";

type WsClient = WebSocket & {
  subscriptions?: Set<number>;
  attendanceSubscribed?: boolean;
  patientCreatePresence?: boolean;
  staffUserId?: number;
  staffRole?: string;
  sessionToken?: string;
  doctorPortalId?: number;
};

type WsServerOptions = {
  /** Returns true when a browser Origin may open a cookie-authenticated socket. */
  isOriginAllowed: (origin: string, host: string | undefined) => boolean;
};

const SESSION_REVALIDATE_INTERVAL_MS = 60_000;

let wss: WebSocketServer | null = null;

function broadcastPatientCreatePresence() {
  if (!wss) return;
  const activeUserIds = new Set<number>();
  [...wss.clients].forEach((client) => {
    const ws = client as WsClient;
    if (
      ws.readyState === WebSocket.OPEN &&
      ws.patientCreatePresence &&
      typeof ws.staffUserId === "number"
    ) {
      activeUserIds.add(ws.staffUserId);
    }
  });
  const payload = JSON.stringify({
    type: "patient-create-presence",
    activeCount: activeUserIds.size,
  });
  wss.clients.forEach((client) => {
    const ws = client as WsClient;
    if (ws.readyState === WebSocket.OPEN && ws.subscriptions) {
      ws.send(payload);
    }
  });
}

function verifyDoctorToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as any;
    if (payload?.type === "externalDoctor" && payload?.doctorId) {
      return Number(payload.doctorId);
    }
    return null;
  } catch {
    return null;
  }
}

/** Same checks as authService.authenticateRequest: active account and current authVersion. */
async function loadActiveStaffUser(session: {
  userId: number;
  authVersion?: number;
}) {
  const user = await db.getUserById(session.userId);
  if (!user?.isActive) return null;
  if (
    typeof session.authVersion === "number" &&
    session.authVersion !== user.authVersion
  ) {
    return null;
  }
  return user;
}

/** Mirrors makePageProcedure("/patient-file"), which guards the patient sheet APIs. */
async function canSubscribeToPatients(userId: number): Promise<boolean> {
  const user = await db.getUserById(userId);
  if (!user?.isActive) return false;
  if (user.role === "admin") return true;

  const permissions = await db.getEffectiveUserPermissions(
    userId,
    user.role ?? undefined,
  );
  return permissions.some((permission) =>
    permMatchesPath(
      String(permission ?? "")
        .replace(/:r[w]?$/, "")
        .trim(),
      "/patient-file",
    ),
  );
}

/** Mirrors the client-side filter: explicit user ids win, otherwise roles, otherwise everyone. */
function isStaffRecipient(
  ws: WsClient,
  targetRoles?: string[] | null,
  targetUserIds?: number[] | null,
): boolean {
  if (typeof ws.staffUserId !== "number") return false;
  if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
    return targetUserIds.includes(ws.staffUserId);
  }
  const roles = Array.isArray(targetRoles)
    ? targetRoles
        .map((value) =>
          String(value ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean)
    : [];
  if (roles.length === 0) return true;
  return !!ws.staffRole && roles.includes(ws.staffRole);
}

export async function revalidateStaffSockets() {
  if (!wss) return;
  for (const client of [...wss.clients]) {
    const ws = client as WsClient;
    if (ws.readyState !== WebSocket.OPEN) continue;
    if (typeof ws.staffUserId !== "number") continue;
    try {
      const session = await authService.verifySession(ws.sessionToken);
      const user = session ? await loadActiveStaffUser(session) : null;
      if (!user) ws.close(1008, "Session expired");
    } catch (error) {
      console.warn("[WS] Session revalidation failed:", error);
    }
  }
}

async function canSubscribeToAttendance(userId: number): Promise<boolean> {
  const user = await db.getUserById(userId);
  if (!user?.isActive) return false;
  if (user.role === "admin") return true;

  const permissions = await db.getEffectiveUserPermissions(
    userId,
    user.role ?? undefined,
  );
  return permissions.some((permission) => {
    const path = String(permission ?? "")
      .replace(/:r[w]?$/, "")
      .trim()
      .toLowerCase()
      .replace(/\/+$/, "");
    // Match access to the live attendance route (or any permitted parent).
    return (
      path === "/" ||
      path === "/attendance" ||
      path === "/attendance/live" ||
      "/attendance/live".startsWith(`${path}/`)
    );
  });
}

export function registerWsServer(server: Server, options: WsServerOptions) {
  wss = new WebSocketServer({ noServer: true });

  const revalidateTimer = setInterval(() => {
    void revalidateStaffSockets();
  }, SESSION_REVALIDATE_INTERVAL_MS);
  revalidateTimer.unref();
  wss.on("close", () => clearInterval(revalidateTimer));

  server.on("upgrade", (req, socket, head) => {
    if (!req.url || !req.url.startsWith("/ws")) {
      return;
    }
    // Browsers always send Origin on WebSocket handshakes and attach cookies
    // ambiently, so reject foreign origins. Native clients send no Origin.
    const origin = req.headers.origin;
    if (
      typeof origin === "string" &&
      !options.isOriginAllowed(origin, req.headers.host)
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss?.handleUpgrade(req, socket, head, (ws) => {
      wss?.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (socket: WsClient, req: IncomingMessage) => {
    // Doctor portal: authenticate via ?doctorToken= query param
    const rawUrl = req.url ?? "";
    const parsedUrl = new URL(rawUrl, "http://localhost");
    const doctorToken = parsedUrl.searchParams.get("doctorToken");
    if (doctorToken) {
      const doctorId = verifyDoctorToken(doctorToken);
      if (!doctorId) {
        socket.close(1008, "Unauthorized");
        return;
      }
      socket.doctorPortalId = doctorId;
      return;
    }

    // Staff: authenticate via session cookie
    const cookies = parseCookieHeader(req.headers.cookie || "");
    const token = cookies[AUTH_COOKIE_NAME] || cookies[LEGACY_AUTH_COOKIE_NAME];
    const session = await authService.verifySession(token);
    const staffUser = session ? await loadActiveStaffUser(session) : null;
    if (!session || !staffUser) {
      socket.close(1008, "Unauthorized");
      return;
    }

    socket.subscriptions = new Set<number>();
    socket.attendanceSubscribed = false;
    socket.patientCreatePresence = false;
    socket.staffUserId = session.userId;
    socket.staffRole = String(staffUser.role ?? "")
      .trim()
      .toLowerCase();
    socket.sessionToken = token;

    socket.on("message", async (raw: RawData) => {
      try {
        const message = JSON.parse(raw.toString());
        if (!message?.type) return;
        if (
          message.type === "subscribe" &&
          typeof message.patientId === "number"
        ) {
          if (
            typeof socket.staffUserId !== "number" ||
            !(await canSubscribeToPatients(socket.staffUserId))
          ) {
            socket.send(
              JSON.stringify({
                type: "subscribe-denied",
                patientId: message.patientId,
              }),
            );
            return;
          }
          socket.subscriptions?.add(message.patientId);
        } else if (message.type === "subscribe-attendance") {
          if (
            typeof socket.staffUserId !== "number" ||
            !(await canSubscribeToAttendance(socket.staffUserId))
          ) {
            socket.close(1008, "Attendance permission required");
            return;
          }
          socket.attendanceSubscribed = true;
        } else if (message.type === "unsubscribe-attendance") {
          socket.attendanceSubscribed = false;
        } else if (message.type === "patient-create-presence") {
          socket.patientCreatePresence = message.active === true;
          broadcastPatientCreatePresence();
        }
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : String(error ?? "unknown");
        console.warn(`[WS] Malformed message: ${detail}`);
      }
    });
    socket.on("close", () => {
      if (!socket.patientCreatePresence) return;
      socket.patientCreatePresence = false;
      broadcastPatientCreatePresence();
    });
    socket.send(JSON.stringify({ type: "staff-ready" }));
  });
}

export function broadcastToDoctorPortal(
  doctorId: number,
  payload: Record<string, unknown>,
) {
  if (!wss) return;
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    const ws = client as WsClient;
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.doctorPortalId === doctorId) {
      ws.send(message);
    }
  });
}

export function broadcastSheetUpdate(patientId: number, sheetType: string) {
  if (!wss) return;
  const payload = JSON.stringify({
    type: "sheetUpdated",
    patientId,
    sheetType,
    at: Date.now(),
  });

  wss.clients.forEach((client) => {
    const ws = client as WsClient;
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.subscriptions?.has(patientId)) {
      ws.send(payload);
    }
  });
}

export function broadcastPunch(
  empCd: string,
  direction: string,
  timestamp: Date,
  deviceId: string,
) {
  if (!wss) return;
  const payload = JSON.stringify({
    type: "punch-received",
    empCd,
    direction,
    timestamp: timestamp.toISOString(),
    deviceId,
    at: Date.now(),
  });

  wss.clients.forEach((client) => {
    const ws = client as any;
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.attendanceSubscribed) {
      ws.send(payload);
    }
  });
}

export function broadcastAppNotification(notification: {
  id: string;
  title: string;
  message: string;
  kind?: string;
  targetRoles?: string[] | null;
  targetUserIds?: number[] | null;
  source?: string | null;
  entityType?: string | null;
  entityId?: number | null;
}) {
  if (!wss) {
    console.warn("[WS] broadcastAppNotification called but wss is null");
    return;
  }
  const totalClients = wss.clients.size;
  let sent = 0;
  const payload = JSON.stringify({ type: "app-notification", ...notification });
  wss.clients.forEach((client) => {
    const ws = client as WsClient;
    if (ws.readyState !== WebSocket.OPEN) return;
    if (
      !isStaffRecipient(ws, notification.targetRoles, notification.targetUserIds)
    )
      return;
    ws.send(payload);
    sent++;
  });
  console.log(
    `[WS] broadcastAppNotification: sent to ${sent}/${totalClients} clients — ${notification.title}`,
  );
}

export function broadcastBookingUpdate() {
  if (!wss) return;
  const payload = JSON.stringify({ type: "booking-update" });
  wss.clients.forEach((client) => {
    const ws = client as any;
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(payload);
  });
}
