import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OperationalMetric } from "@/components/layout/OperationalModuleShell";

type AccountingTabMetricsContextValue = {
  tabMetrics: OperationalMetric[];
  setTabMetrics: (metrics: OperationalMetric[]) => void;
  tabCenter: ReactNode;
  setTabCenter: (node: ReactNode) => void;
};

const AccountingTabMetricsContext =
  createContext<AccountingTabMetricsContextValue | null>(null);

export function AccountingTabMetricsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [tabMetrics, setTabMetricsState] = useState<OperationalMetric[]>([]);
  const [tabCenter, setTabCenterState] = useState<ReactNode>(null);
  const setTabMetrics = useCallback((metrics: OperationalMetric[]) => {
    setTabMetricsState(metrics);
  }, []);
  const setTabCenter = useCallback((node: ReactNode) => {
    setTabCenterState(node);
  }, []);
  const value = useMemo(
    () => ({ tabMetrics, setTabMetrics, tabCenter, setTabCenter }),
    [tabMetrics, setTabMetrics, tabCenter, setTabCenter],
  );
  return (
    <AccountingTabMetricsContext.Provider value={value}>
      {children}
    </AccountingTabMetricsContext.Provider>
  );
}

/** Publish this tab's summary chips into the shell metrics row (right side). Clears on unmount. */
export function useAccountingTabMetrics(metrics: OperationalMetric[]) {
  const ctx = useContext(AccountingTabMetricsContext);
  const signature = metrics
    .map(
      (m) =>
        `${m.label}:${typeof m.value === "string" || typeof m.value === "number" ? m.value : "?"}`,
    )
    .join("|");

  const setTabMetrics = ctx?.setTabMetrics;
  useEffect(() => {
    if (!setTabMetrics) return;
    setTabMetrics(metrics);
    return () => setTabMetrics([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature captures metric content
  }, [setTabMetrics, signature]);
}

/** Publish a center action (e.g. refresh button) into the metrics row. Clears on unmount. */
export function useAccountingTabCenter(node: ReactNode) {
  const ctx = useContext(AccountingTabMetricsContext);
  const setTabCenter = ctx?.setTabCenter;
  useEffect(() => {
    if (!setTabCenter) return;
    setTabCenter(node);
    return () => setTabCenter(null);
  }, [setTabCenter, node]);
}

export function useAccountingTabMetricsState() {
  const ctx = useContext(AccountingTabMetricsContext);
  return ctx?.tabMetrics ?? [];
}

export function useAccountingTabCenterState() {
  const ctx = useContext(AccountingTabMetricsContext);
  return ctx?.tabCenter ?? null;
}
