import path from "node:path";

export const PENTACAM_PATIENT_KEY_RE = /^pentacam\/patients\/\d+\/[^/]+$/;
const PENTACAM_IMAGE_KEY_RE = /\.(jpe?g|png|webp)$/i;

/** True for names that must never reach S3 (traversal segments, NUL bytes). */
export function isUnsafePentacamName(rawName: string): boolean {
  return (
    rawName.includes("\0") ||
    rawName.split(/[\\/]/).some((segment) => segment === "..")
  );
}

/**
 * S3 keys the Pentacam image route may read for a requested name. Never the
 * raw name outside the patient-scoped shape: other prefixes (SELRS/,
 * diagnosis/, kf-exam/) hold unrelated clinical files.
 */
export function resolvePentacamObjectCandidates(rawName: string): string[] {
  const normalized = String(rawName ?? "")
    .trim()
    .replace(/^\/+/, "");
  // Patient-scoped keys are authorized per patient by the route, so serve
  // exactly that key. Falling back to the basename under the legacy prefixes
  // would hand one patient's token another patient's file.
  if (PENTACAM_PATIENT_KEY_RE.test(normalized)) return [normalized];

  const base = path.posix.basename(normalized);
  const stem = path.posix.parse(base).name || base;
  const hasExt = Boolean(path.posix.extname(base));
  const variants = hasExt
    ? [base]
    : [
        base,
        `${base}.jpg`,
        `${base}.jpeg`,
        `${base}.png`,
        `${base}.webp`,
        stem,
        `${stem}.jpg`,
        `${stem}.jpeg`,
        `${stem}.png`,
        `${stem}.webp`,
      ];
  const values = new Set<string>();
  for (const variant of variants) {
    for (const candidate of [
      variant,
      `pentacam-exports/${variant}`,
      `Pentacam/${variant}`,
      `pentacam/${variant}`,
    ]) {
      const value = candidate.trim().replace(/^\/+/, "");
      if (value) values.add(value);
    }
  }
  return Array.from(values).filter((key) => PENTACAM_IMAGE_KEY_RE.test(key));
}
