const PRINT_PAYLOAD_PREFIX = "accounting:print:";

export type PrintPayload = {
  title: string;
  meta: {
    clinicName: string;
    fromDate?: string;
    toDate?: string;
    filters?: Record<string, string>;
  };
  groupBy?: string[];
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  rows: Record<string, unknown>[];
  totals?: { label: string; values: Record<string, number> }[];
  footer?: string;
};

export function openPrint(payload: PrintPayload) {
  const id = `${PRINT_PAYLOAD_PREFIX}${Date.now()}`;
  sessionStorage.setItem(id, JSON.stringify(payload));
  window.location.href = `/accounting/print?payloadId=${encodeURIComponent(id)}`;
}
