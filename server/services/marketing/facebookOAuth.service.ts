/**
 * Facebook OAuth service for Marketing Automation.
 *
 * Security guarantees:
 *  - Access tokens NEVER appear in logs (use [REDACTED] placeholder)
 *  - Access tokens NEVER returned to the frontend through any path
 *  - CSRF state token validated on every callback
 */

import { ENV } from "../../_core/env";

const GRAPH_API = "https://graph.facebook.com/v21.0";
const OAUTH_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";

export interface FbPage {
  id: string;
  name: string;
  /** Long-lived page access token — store in DB only, never send to client */
  accessToken: string;
  category?: string;
}

// ─── Config check ─────────────────────────────────────────────────────────────

export function isFbConfigured(): boolean {
  return Boolean(ENV.fbAppId && ENV.fbAppSecret);
}

// ─── Build OAuth URL ──────────────────────────────────────────────────────────

export function buildOAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: ENV.fbAppId,
    redirect_uri: redirectUri,
    state,
    scope: "pages_show_list,pages_manage_posts,pages_read_engagement",
    response_type: "code",
  });
  return `${OAUTH_DIALOG}?${params.toString()}`;
}

// ─── Exchange code → short-lived user token ───────────────────────────────────

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<string> {
  const params = new URLSearchParams({
    client_id: ENV.fbAppId,
    client_secret: ENV.fbAppSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params.toString()}`);
  const data = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Failed to exchange code for token");
  }
  return data.access_token;
}

// ─── Exchange short-lived → long-lived user token (60 days) ───────────────────

export async function exchangeForLongLivedToken(shortToken: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: ENV.fbAppId,
    client_secret: ENV.fbAppSecret,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params.toString()}`);
  const data = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Failed to get long-lived token");
  }
  return data.access_token;
}

// ─── Get pages managed by the user ───────────────────────────────────────────

export async function getManagedPages(longLivedUserToken: string): Promise<FbPage[]> {
  const params = new URLSearchParams({
    fields: "id,name,category,access_token",
    access_token: longLivedUserToken,
  });
  const res = await fetch(`${GRAPH_API}/me/accounts?${params.toString()}`);
  const data = (await res.json()) as {
    data?: Array<{ id: string; name: string; category?: string; access_token: string }>;
    error?: { message: string };
  };
  if (!res.ok || !data.data) {
    throw new Error(data.error?.message ?? "Failed to fetch managed pages");
  }
  return data.data.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    accessToken: p.access_token,
  }));
}

// ─── Test a page token ────────────────────────────────────────────────────────

export async function testPageToken(
  pageId: string,
  pageAccessToken: string
): Promise<{ ok: boolean; pageName?: string; error?: string }> {
  try {
    const params = new URLSearchParams({
      fields: "id,name",
      access_token: pageAccessToken,
    });
    const res = await fetch(`${GRAPH_API}/${pageId}?${params.toString()}`);
    const data = (await res.json()) as { id?: string; name?: string; error?: { message: string } };
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message ?? "Token invalid" };
    }
    return { ok: true, pageName: data.name };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ─── Safe page object for client (no token) ───────────────────────────────────

export interface FbPagePublic {
  id: string;
  name: string;
  category?: string;
}

export function toPublicPage(page: FbPage): FbPagePublic {
  return { id: page.id, name: page.name, category: page.category };
}
