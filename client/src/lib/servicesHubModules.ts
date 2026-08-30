export type ServicesHubModuleId =
  | "medications"
  | "registry"
  | "catalog"
  | "drug-reference"
  | "txhub";

// Icon-background color is the one thing MAIN_MODULES (ServicesHubShell)
// and SURFACE_ITEMS (ServicesHubNav) always agreed on, even though each
// screen keeps its own href, icon, title and description.
export const SERVICES_HUB_MODULE_ICON_WRAP: Record<ServicesHubModuleId, string> = {
  "drug-reference": "bg-primary/10 text-primary",
  medications: "bg-primary/10 text-primary",
  catalog: "bg-success/15 text-success",
  registry: "bg-secondary/15 text-primary",
  txhub: "bg-primary/15 text-primary",
};
