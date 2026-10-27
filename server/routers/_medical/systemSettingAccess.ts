/**
 * `medical.getSystemSetting` is open to every signed-in user, so non-admins may
 * only read the keys the app screens actually load. Anything else (team
 * permissions, MSSQL/attendance/reminder config, keys added later) stays
 * admin-only until it is listed here on purpose.
 */
export const STAFF_READABLE_SETTING_KEYS: ReadonlySet<string> = new Set([
  "clinical_print_settings_v1",
  "service_directory",
  "sheet_designer_config",
  "mobile_sheet_mode_v1",
  "doctor_service_sheet_match_v1",
  "app_notifications_feed_v1",
  "app_notification_settings_v1",
  "appointments_pricing_v1",
]);

/** MySQL compares keys case-insensitively, so every check and the query use this form. */
export function canonicalSettingKey(key: string): string {
  return key.trim().toLowerCase();
}

export function isStaffReadableSetting(key: string): boolean {
  return STAFF_READABLE_SETTING_KEYS.has(canonicalSettingKey(key));
}
