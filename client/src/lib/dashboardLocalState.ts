const PANEL_STATE_KEY = "dashboard_panel_state_v1";
const RECENT_PATIENTS_KEY = "dashboard_recent_patients_v1";
const CARD_USAGE_KEY = "dashboard_card_usage_v1";

type PanelStateMap = Record<string, boolean>;
type RecentPatientEntry = {
  id: number;
  name: string;
  code?: string;
  serviceType?: string;
  openedAt: number;
};
type CardUsageMap = Record<string, number>;

const isBrowser = typeof window !== "undefined";

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getPanelState(key: string, fallback: boolean) {
  if (!isBrowser) return fallback;
  const state = safeParseJson<PanelStateMap>(window.localStorage.getItem(PANEL_STATE_KEY), {});
  return typeof state[key] === "boolean" ? state[key] : fallback;
}

export function setPanelState(key: string, value: boolean) {
  if (!isBrowser) return;
  const state = safeParseJson<PanelStateMap>(window.localStorage.getItem(PANEL_STATE_KEY), {});
  state[key] = value;
  window.localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(state));
}

export function pushRecentPatient(entry: Omit<RecentPatientEntry, "openedAt">) {
  if (!isBrowser || !entry.id) return;
  const list = safeParseJson<RecentPatientEntry[]>(window.localStorage.getItem(RECENT_PATIENTS_KEY), []);
  const next = [
    { ...entry, openedAt: Date.now() },
    ...list.filter((item) => item.id !== entry.id),
  ].slice(0, 8);
  window.localStorage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(next));
}

export function getRecentPatients() {
  if (!isBrowser) return [] as RecentPatientEntry[];
  return safeParseJson<RecentPatientEntry[]>(window.localStorage.getItem(RECENT_PATIENTS_KEY), []);
}

export function trackCardUsage(path: string) {
  if (!isBrowser || !path) return;
  const usage = safeParseJson<CardUsageMap>(window.localStorage.getItem(CARD_USAGE_KEY), {});
  usage[path] = (usage[path] ?? 0) + 1;
  window.localStorage.setItem(CARD_USAGE_KEY, JSON.stringify(usage));
}

export function getCardUsage(path: string) {
  if (!isBrowser || !path) return 0;
  const usage = safeParseJson<CardUsageMap>(window.localStorage.getItem(CARD_USAGE_KEY), {});
  return usage[path] ?? 0;
}
