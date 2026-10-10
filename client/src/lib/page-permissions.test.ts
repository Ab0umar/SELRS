import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ROUTES } from "../../../shared/routes";
import {
  PAGE_PERMISSION_DEFINITIONS,
  PERMISSION_SECTIONS,
} from "./page-permissions";
import { HUB_SUBPATH_PERMISSIONS } from "./hubPermissionPaths";
import { normalizeNavPath } from "./nav-permission-utils";

const clientRoot = resolve(import.meta.dirname, "../..");
const routeFiles = [
  resolve(clientRoot, "src/App.tsx"),
  resolve(clientRoot, "src/pages/PatientHubShell.tsx"),
  ...readdirSync(resolve(clientRoot, "src/routes"))
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => resolve(clientRoot, "src/routes", file)),
];

function resolvePath(node: ts.Node | undefined): string {
  if (!node) throw new Error("Route path is missing");
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isJsxExpression(node)) return resolvePath(node.expression);
  if (ts.isRegularExpressionLiteral(node) && node.text === "/^\\/patient-hub$/")
    return ROUTES.patientHub;
  if (
    ts.isPropertyAccessExpression(node) &&
    node.expression.getText() === "ROUTES"
  ) {
    const key = node.name.text as keyof typeof ROUTES;
    if (!(key in ROUTES)) throw new Error(`Unknown route: ${key}`);
    return ROUTES[key];
  }
  if (ts.isTemplateExpression(node)) {
    return (
      node.head.text +
      node.templateSpans
        .map((span) => resolvePath(span.expression) + span.literal.text)
        .join("")
    );
  }
  throw new Error(`Unsupported route expression: ${node.getText()}`);
}

function protectedPaths(): string[] {
  const paths = new Set<string>();
  for (const file of routeFiles) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node: ts.Node) {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : undefined;
      if (
        opening?.tagName.getText() === "Route" &&
        (node.getText().includes("<ProtectedRoute") ||
          (file.endsWith("PatientHubShell.tsx") &&
            !node.getText().includes("<Redirect")))
      ) {
        const attribute = opening.attributes.properties.find(
          (property): property is ts.JsxAttribute =>
            ts.isJsxAttribute(property) && property.name.getText() === "path",
        );
        if (!attribute && node.getText().includes("<ProtectedRoute"))
          throw new Error(`Protected route without path in ${file}`);
        if (attribute) paths.add(resolvePath(attribute.initializer));
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return [...paths];
}

describe("page permission registry", () => {
  it("registers canonical permissions used by hub links and admin modules", () => {
    const registered = new Set<string>(
      PAGE_PERMISSION_DEFINITIONS.map((entry) => entry.id),
    );
    for (const permission of Object.values(HUB_SUBPATH_PERMISSIONS))
      expect(registered.has(permission), permission).toBe(true);
    const adminSource = readFileSync(
      resolve(clientRoot, "src/features/admin/AdminHubShell.tsx"),
      "utf8",
    );
    const adminLinks = [...adminSource.matchAll(/href:\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(adminLinks.length).toBeGreaterThan(0);
    expect(adminLinks.filter((path) => !registered.has(path))).toEqual([]);
  });
  it("has unique ids and valid permission sections", () => {
    const ids = PAGE_PERMISSION_DEFINITIONS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of PAGE_PERMISSION_DEFINITIONS) {
      expect(PERMISSION_SECTIONS).toContain(entry.group);
      expect(entry.label.trim()).not.toBe("");
    }
  });

  it("registers every protected page except universally available account routes and covered shell wildcards", () => {
    const registered = new Set<string>(
      PAGE_PERMISSION_DEFINITIONS.map((entry) => entry.id),
    );
    const alwaysAvailable = new Set<string>([
      ROUTES.mainHome,
      ROUTES.account,
      ROUTES.accountWildcard,
      ROUTES.forcePasswordChange,
    ]);
    const missing = protectedPaths().filter((path) => {
      const permissionPath = normalizeNavPath(path);
      if (registered.has(permissionPath) || alwaysAvailable.has(path))
        return false;
      const wildcardBase = path.replace(/\/\*\??$/, "");
      return !(wildcardBase !== path && registered.has(wildcardBase));
    });
    expect(missing).toEqual([]);
  });
});
