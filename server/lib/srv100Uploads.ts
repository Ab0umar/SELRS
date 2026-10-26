/**
 * srv100_uploads.patient_id holds the *main* system's patients.id, but KF
 * (Kafr El-Sheikh) exam images are stored in the same table with the KF
 * patient's own id (source_printer = 'kf-exam'). Those two id spaces overlap,
 * so any reader that selects by patient_id without excluding KF rows shows one
 * person's images on another person's file. Every reader of main-system
 * patient images must apply this predicate.
 */
export const KF_EXAM_SOURCE = "kf-exam";

/** SQL predicate that keeps KF rows out of main-system queries (optionally qualified by a table alias). */
export function notKfUploadSql(alias?: string): string {
  const column = alias ? `${alias}.source_printer` : "source_printer";
  return `(${column} IS NULL OR ${column} <> '${KF_EXAM_SOURCE}')`;
}
