import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PRINT_SETTINGS_KEY } from "../../../shared/printSettings";
import {
  applyClinicalPrintSettings,
  currentPrintDocument,
  currentPrintProfile,
  setClinicalPrintSettings,
  setPrintSettingsLoader,
} from "@/lib/clinicalPrintSettings";

export default function ClinicalPrintSettingsBridge() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const query = trpc.medical.getSystemSetting.useQuery(
    { key: PRINT_SETTINGS_KEY },
    { enabled: isAuthenticated, staleTime: 60_000, refetchOnWindowFocus: true },
  );
  useEffect(() => {
    setPrintSettingsLoader(
      isAuthenticated
        ? async (signal) =>
            (
              await utils.client.medical.getSystemSetting.query(
                {
                  key: PRINT_SETTINGS_KEY,
                },
                { signal },
              )
            )?.value
        : undefined,
    );
    return () => setPrintSettingsLoader(undefined);
  }, [isAuthenticated, utils.client]);
  useEffect(() => {
    setClinicalPrintSettings(isAuthenticated ? query.data?.value : null);
    applyClinicalPrintSettings();
    const beforePrint = () => applyClinicalPrintSettings();
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((item) => item.type === "attributes")) {
        applyClinicalPrintSettings();
        return;
      }
      const definition = currentPrintDocument();
      if (!definition || !currentPrintProfile()) return;
      if (
        [...document.querySelectorAll(definition.selector)].some(
          (node) =>
            !node.hasAttribute("data-configured-print-root") &&
            !node.parentElement?.closest("[data-configured-print-root]"),
        )
      )
        applyClinicalPrintSettings();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-clinical-print-profile"],
    });
    window.addEventListener("beforeprint", beforePrint);
    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", beforePrint);
    };
  }, [location, isAuthenticated, query.data]);
  return null;
}
