import { z } from "zod";

/**
 * Columns a reception-level `updatePatient` call may write. Everything else
 * (`id`, `createdAt`, `updatedAt`) is dropped before the update reaches the database.
 */
export const PATIENT_UPDATABLE_FIELDS = [
  "patientCode",
  "fullName",
  "dateOfBirth",
  "age",
  "gender",
  "nationalId",
  "phone",
  "alternatePhone",
  "email",
  "address",
  "occupation",
  "referralSource",
  "medicalHistory",
  "allergies",
  "branch",
  "serviceType",
  "locationType",
  "doctorId",
  "doctorCode",
  "serviceCode",
  "lastVisit",
  "receptionSignature",
  "status",
] as const;

// Values keep their loose shape (the UI sends strings, numbers and nulls and
// the update path normalizes them); only the set of keys is restricted.
export const patientUpdatesSchema = z.object(
  Object.fromEntries(
    PATIENT_UPDATABLE_FIELDS.map((field) => [field, z.any().optional()]),
  ) as Record<(typeof PATIENT_UPDATABLE_FIELDS)[number], z.ZodOptional<z.ZodAny>>,
);
