import type { Express, NextFunction, Request, Response } from "express";
import * as db from "../db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { parse as parseCookieHeader } from "cookie";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";
import { randomUUID } from "node:crypto";

export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const LEGACY_AUTH_COOKIE_NAME = "authToken";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

type LoginRateLimitEntry = {
  count: number;
  resetAt: number;
};

const loginRateLimit = new Map<string, LoginRateLimitEntry>();

function pruneExpiredLoginRateLimits(now: number) {
  for (const [key, entry] of loginRateLimit) {
    if (entry.resetAt <= now) loginRateLimit.delete(key);
  }
}

function loginRateLimitKey(req: Request, username: string) {
  return `${req.ip ?? req.socket.remoteAddress ?? "unknown"}:${username}`;
}

async function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  pruneExpiredLoginRateLimits(now);
  const rawUsername =
    typeof req.body?.username === "string"
      ? req.body.username.trim().toLowerCase()
      : "";
  const key = loginRateLimitKey(req, rawUsername);
  const persistedCount = await db.consumeLoginRateLimit(
    key,
    new Date(now),
    LOGIN_RATE_LIMIT_WINDOW_MS,
  );
  const existing = loginRateLimit.get(key);
  const entry =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS };

  entry.count = Math.max(entry.count + 1, persistedCount ?? 0);
  loginRateLimit.set(key, entry);

  if (entry.count > LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    res.status(429).json({ error: "Too many login attempts, try again later" });
    return;
  }

  next();
}

export type SessionPayload = {
  userId: number;
  username: string;
  role: string;
  branch: string;
  authVersion?: number;
  jti?: string;
};

class LocalAuthService {
  /**
   * Hash password using bcryptjs
   */
  async hashPassword(password: string): Promise<string> {
    return bcryptjs.hash(password, 10);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        branch: user.branch,
      },
      ENV.JWT_SECRET,
      { expiresIn: "24h" },
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, ENV.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Create session token
   */
  async createSessionToken(
    userId: number,
    username: string,
    role: string,
    branch: string,
    options: { expiresInMs?: number; authVersion?: number } = {},
  ): Promise<string> {
    const expiresIn = options.expiresInMs
      ? Math.floor(options.expiresInMs / 1000)
      : 86400; // Default 24h in seconds
    const jti = randomUUID();
    const token = jwt.sign(
      { userId, username, role, branch, authVersion: options.authVersion ?? 1, jti },
      ENV.JWT_SECRET,
      {
      expiresIn,
      },
    );
    await db.createAuthSession(jti, userId, new Date(Date.now() + (options.expiresInMs ?? 86400000)));
    return token;
  }

  /**
   * Verify session token
   */
  async verifySession(
    cookieValue: string | undefined | null,
  ): Promise<SessionPayload | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const payload = jwt.verify(cookieValue, ENV.JWT_SECRET) as SessionPayload;
      if (payload.jti && !(await db.isAuthSessionActive(payload.jti, payload.userId))) return null;
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate request
   */
  async authenticateRequest(req: Request): Promise<User | null> {
    const cookies = parseCookieHeader(req.headers.cookie || "");
    const primaryCookie = cookies[AUTH_COOKIE_NAME];
    const legacyCookie = cookies[LEGACY_AUTH_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const bearerToken =
      typeof authHeader === "string" &&
      authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;
    const tokenCandidates = [primaryCookie, legacyCookie, bearerToken].filter(
      (token): token is string => Boolean(token),
    );

    let session: SessionPayload | null = null;
    for (const token of tokenCandidates) {
      session = await this.verifySession(token);
      if (session) break;
    }

    if (!session) {
      return null;
    }

    const user = await db.getUserById(session.userId);

    if (!user || !user.isActive) {
      return null;
    }

    if (
      typeof session.authVersion === "number" &&
      session.authVersion !== user.authVersion
    ) {
      return null;
    }

    return user;
  }
}

export const authService = new LocalAuthService();

export async function revokeSessionFromRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
  const token = cookies[AUTH_COOKIE_NAME] || cookies[LEGACY_AUTH_COOKIE_NAME] || bearerToken;
  if (!token) return;
  const payload = authService.verifyToken(token) as SessionPayload | null;
  if (payload?.jti) await db.revokeAuthSession(payload.jti);
}

/**
 * Register local auth routes
 */
export function registerAuthRoutes(app: Express) {
  // Login route
  app.post(
    "/api/auth/login",
    loginRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const { username, password, rememberMe } = req.body;

        if (!username || !password) {
          res.status(400).json({ error: "Username and password are required" });
          return;
        }

        // Get user by username
        const user = await db.getUserByUsername(username);

        if (!user) {
          res.status(401).json({ error: "Invalid credentials" });
          return;
        }

        if (!user.password) {
          res.status(401).json({ error: "Invalid credentials" });
          return;
        }

        // Compare password
        const isValidPassword = await authService.comparePassword(
          password,
          user.password,
        );

        if (!isValidPassword) {
          res.status(401).json({ error: "Invalid credentials" });
          return;
        }

        const rateLimitKey = loginRateLimitKey(req, user.username.trim().toLowerCase());
        loginRateLimit.delete(rateLimitKey);
        await db.clearLoginRateLimit(rateLimitKey);

        // Create session token
        const sessionToken = await authService.createSessionToken(
          user.id,
          user.username,
          user.role,
          user.branch || "examinations",
          {
            expiresInMs: rememberMe !== false ? ONE_YEAR_MS : 86400000,
            authVersion: user.authVersion,
          },
        );

        await db.updateUserLastSignedIn(user.id);
        const mustChangePassword = await db.isPasswordChangeRequired(user.id);

        const forwardedProtoHeader = req.headers["x-forwarded-proto"];
        const forwardedProto = Array.isArray(forwardedProtoHeader)
          ? forwardedProtoHeader[0]
          : forwardedProtoHeader;
        const isHttps =
          req.secure ||
          String(forwardedProto || "")
            .toLowerCase()
            .includes("https");

        res.cookie(AUTH_COOKIE_NAME, sessionToken, {
          httpOnly: true,
          secure: isHttps,
          sameSite: "lax",
          path: "/",
          ...(rememberMe === false ? {} : { maxAge: ONE_YEAR_MS }),
        });
        // Backward compatibility for clients still sending the old cookie name.
        res.cookie(LEGACY_AUTH_COOKIE_NAME, sessionToken, {
          httpOnly: true,
          secure: isHttps,
          sameSite: "lax",
          path: "/",
          ...(rememberMe === false ? {} : { maxAge: ONE_YEAR_MS }),
        });

        res.json({
          success: true,
          token: sessionToken,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            branch: user.branch,
            mustChangePassword,
          },
        });
      } catch (error) {
        console.error("[Auth] Login failed", error);
        res.status(500).json({ error: "Login failed" });
      }
    },
  );

  // Logout route
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    await revokeSessionFromRequest(req);
    const user = await authService.authenticateRequest(req);
    if (user) await db.bumpUserAuthVersion(user.id);
    const forwardedProtoHeader = req.headers["x-forwarded-proto"];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const isHttps =
      req.secure ||
      String(forwardedProto || "")
        .toLowerCase()
        .includes("https");

    const clearVariants = [
      {
        path: "/",
        httpOnly: true as const,
        sameSite: "lax" as const,
        secure: isHttps,
      },
      {
        path: "/",
        httpOnly: true as const,
        sameSite: "none" as const,
        secure: true,
      },
      { path: "/", httpOnly: true as const, secure: isHttps },
      { path: "/", httpOnly: true as const, secure: false },
      { path: "/" },
    ];

    for (const options of clearVariants) {
      res.clearCookie(AUTH_COOKIE_NAME, options);
      res.clearCookie(LEGACY_AUTH_COOKIE_NAME, options);
    }
    res.json({ success: true });
  });

  // Check auth status
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await authService.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          branch: user.branch,
          mustChangePassword: await db.isPasswordChangeRequired(user.id),
        },
      });
    } catch (error) {
      res.status(401).json({ error: "Not authenticated" });
    }
  });
}
