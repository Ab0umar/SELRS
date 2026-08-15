import { getSystemSetting, updateSystemSettings } from "../../db";

const ENTRY_PERMISSION_REQUESTS_KEY = "attendance_entry_permission_requests_enabled";

export async function getEntryPermissionRequestsEnabled(): Promise<boolean> {
  const row = await getSystemSetting(ENTRY_PERMISSION_REQUESTS_KEY);
  if (!row) return true;

  try {
    return JSON.parse(String(row.value)) !== false;
  } catch {
    return String(row.value).toLowerCase() !== "false";
  }
}

export async function setEntryPermissionRequestsEnabled(
  enabled: boolean,
): Promise<void> {
  await updateSystemSettings(ENTRY_PERMISSION_REQUESTS_KEY, enabled);
}
