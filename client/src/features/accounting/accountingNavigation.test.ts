import { describe, expect, it } from "vitest";
import { Wallet } from "lucide-react";
import { accountingNavigationForPermissions } from "./accountingNavigation";
import {
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";

const items = [
  { href: "/accounting/cashbook", label: "Cashbook", icon: Wallet },
  {
    href: "/accounting/advances",
    label: "Subaccounts",
    icon: Wallet,
    children: [
      { href: "/accounting/advances", label: "Advances", icon: Wallet },
      { href: "/accounting/loans", label: "Loans", icon: Wallet },
    ],
  },
];

describe("accounting navigation permissions", () => {
  it("hides all destinations while permissions are unavailable", () => {
    expect(accountingNavigationForPermissions(items, () => false)).toEqual([]);
  });

  it("hides a group with no accessible children", () => {
    expect(
      accountingNavigationForPermissions(
        items,
        (path) => path === "/accounting/cashbook",
      ),
    ).toEqual([items[0]]);
  });

  it("shows an allowed child even when the group's default destination is denied", () => {
    const visible = accountingNavigationForPermissions(
      items,
      (path) => path === "/accounting/loans",
    );
    expect(visible).toHaveLength(1);
    expect(visible[0].children?.map((child) => child.href)).toEqual([
      "/accounting/loans",
    ]);
    expect(items[1].children).toHaveLength(2);
  });

  it.each([":r", ":rw"])(
    "respects existing permission matching for %s tokens",
    (suffix) => {
      const roots = permissionsToAllowedRoots([`/accounting/loans${suffix}`]);
      const visible = accountingNavigationForPermissions(items, (path) =>
        pathGrantedByRoots(path, roots),
      );
      expect(visible[0].children?.map((child) => child.href)).toEqual([
        "/accounting/loans",
      ]);
    },
  );

  it("does not treat the accounting root as permission for separately protected pages", () => {
    expect(
      accountingNavigationForPermissions(items, (path) =>
        pathGrantedByRoots(path, ["/accounting"]),
      ),
    ).toEqual([]);
  });

  it("preserves navigation order and destinations for an administrator", () => {
    expect(accountingNavigationForPermissions(items, () => true)).toEqual(
      items,
    );
  });
});
