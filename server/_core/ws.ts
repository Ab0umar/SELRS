import type { IncomingMessage, Server } from "http";
import { URL } from "node:url";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { parse as parseCookieHeader } from "cookie";
import jwt from "jsonwebtoken";
import { authService, AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "./auth";
import { ENV } from "./env";

type WsClient = WebSocket & {
  subscriptions?: Set<number>;
  attendanceSubscribed?: boolean;
  patientCreatePresence?: boolean;
  staffUserId?: number;
  doctorPortalId?: number;
};

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

export function registerWsServer(server: Server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (!req.url || !req.url.startsWith("/ws")) {
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
    if (!session) {
      socket.close(1008, "Unauthorized");
      return;
    }

    socket.subscriptions = new Set<number>();
    socket.attendanceSubscribed = false;
    socket.patientCreatePresence = false;
    socket.staffUserId = session.userId;

    socket.on("message", (raw: RawData) => {
      try {
        const message = JSON.parse(raw.toString());
        if (!message?.type) return;
        if (
          message.type === "subscribe" &&
          typeof message.patientId === "number"
        ) {
          socket.subscriptions?.add(message.patientId);
        } else if (message.type === "subscribe-attendance") {
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
    const ws = client as any;
    if (ws.readyState !== WebSocket.OPEN) return;
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
