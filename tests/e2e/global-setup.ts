import { request, type FullConfig } from "@playwright/test";
import { writeFile } from "node:fs/promises";

export default async function setup(config: FullConfig) {
  const statePath = config.projects[0].use.storageState as string;
  const username =
    process.env.SMOKE_USER || process.env.ADMIN_USER || process.env.E2E_USER;
  const password =
    process.env.SMOKE_PASS || process.env.ADMIN_PASS || process.env.E2E_PASS;
  if (!username || !password) {
    await writeFile(statePath, JSON.stringify({ cookies: [], origins: [] }), {
      mode: 0o600,
    });
    return;
  }
  const api = await request.newContext({
    baseURL: config.projects[0].use.baseURL,
  });
  try {
    let activePassword = "";
    for (const candidate of [password, `${password}_e2e`]) {
      const response = await api.post("/api/auth/login", {
        data: { username, password: candidate },
      });
      if (response.ok()) {
        activePassword = candidate;
        break;
      }
      if (response.status() !== 401)
        throw new Error(`E2E login failed: HTTP ${response.status()}`);
    }
    if (!activePassword) throw new Error("E2E login credentials rejected");
    const me = await (await api.get("/api/auth/me")).json();
    if (me.user?.mustChangePassword) {
      const nextPassword =
        activePassword === password ? `${password}_e2e` : password;
      const response = await api.post("/api/trpc/auth.changePassword", {
        data: {
          json: { currentPassword: activePassword, newPassword: nextPassword },
        },
      });
      if (!response.ok())
        throw new Error(`E2E password setup failed: HTTP ${response.status()}`);
      const login = await api.post("/api/auth/login", {
        data: { username, password: nextPassword },
      });
      if (!login.ok())
        throw new Error(`E2E relogin failed: HTTP ${login.status()}`);
    }
    await api.storageState({ path: statePath });
  } finally {
    await api.dispose();
  }
}
