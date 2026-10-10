import type { OperationalNavigationItem } from "@/components/layout/OperationalModuleShell";

export function accountingNavigationForPermissions(
  items: OperationalNavigationItem[],
  canAccess: (path: string) => boolean,
): OperationalNavigationItem[] {
  return items.flatMap((item) => {
    if (item.children?.length) {
      const children = item.children.filter((child) => canAccess(child.href));
      return children.length ? [{ ...item, children }] : [];
    }
    return canAccess(item.href) ? [item] : [];
  });
}
