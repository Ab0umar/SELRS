import { createElement, type ReactNode } from "react";
import { normalizeServiceCodeForSearch } from "./patientFiltering";

export function normalizeServiceCode(value: unknown): string {
  return normalizeServiceCodeForSearch(value);
}

/** Aligns with `usePatientsList` / patients table routing keys. */
export function normalizeSheetType(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "pentacam") return "pentacam_c";
  if (raw === "surgery_center") return "surgery";
  if (raw === "surgery_external") return "surgery_external";
  if (raw === "pentacam_center" || raw === "radiology_center" || raw === "pentacam_c") return "pentacam_c";
  if (raw === "pentacam_external" || raw === "radiology_external" || raw === "pentacam_ex") return "pentacam_ex";
  if (raw === "pentacam_ex_c") return "pentacam_ex_c";
  return raw;
}

export function formatDisplayDate(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    return new Date(t).toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
  }
  return s;
}

function escapeRegExp(fragment: string): string {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** RTL-safe substring highlight for search dropdowns (first case-insensitive match per segment). */
export function highlightSearchMatch(text: string, term: string): ReactNode {
  const haystack = text ?? "";
  const q = String(term ?? "").trim();
  if (!q) return haystack;

  let re: RegExp;
  try {
    re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  } catch {
    return haystack;
  }

  const parts = haystack.split(re);
  if (parts.length === 1) return haystack;

  return parts.map((piece, index) =>
    index % 2 === 1
      ? createElement("mark", { key: `m-${index}`, className: "rounded-sm bg-secondary/25 px-0.5" }, piece)
      : piece,
  );
}
