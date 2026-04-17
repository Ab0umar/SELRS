// Code-based auto-matching enrichment functions
// These JOINs will automatically pull current doctor/service names from source tables

import { and, eq, inArray } from "drizzle-orm";

export async function enrichPatientsWithCodeMatches(
  db: any,
  patientRows: any[],
  doctors: any,
  services: any
) {
  if (!patientRows.length) return patientRows;

  const patientIds = patientRows.map((p) => p.id).filter((id) => typeof id === "number");
  if (!patientIds.length) return patientRows;

  // Get doctors by code
  const doctorCodes = patientRows
    .map((p) => String(p.doctorCode || "").trim())
    .filter(Boolean);

  const doctorsByCode = new Map<string, any>();
  if (doctorCodes.length > 0) {
    const doctorRows = await db
      .select({
        code: doctors.code,
        name: doctors.name,
        id: doctors.id,
      })
      .from(doctors)
      .where(inArray(doctors.code, doctorCodes));

    doctorRows.forEach((d: any) => {
      doctorsByCode.set(String(d.code).trim(), d);
    });
  }

  // Get services by code
  const serviceCodes = patientRows
    .map((p) => String(p.serviceCode || "").trim())
    .filter(Boolean);

  const servicesByCode = new Map<string, any>();
  if (serviceCodes.length > 0) {
    const serviceRows = await db
      .select({
        code: services.code,
        name: services.name,
        id: services.id,
      })
      .from(services)
      .where(inArray(services.code, serviceCodes));

    serviceRows.forEach((s: any) => {
      servicesByCode.set(String(s.code).trim(), s);
    });
  }

  // Enrich patient rows with doctor and service names
  return patientRows.map((patient) => {
    const doctorCode = String(patient.doctorCode || "").trim();
    const serviceCode = String(patient.serviceCode || "").trim();

    const doctor = doctorsByCode.get(doctorCode);
    const service = servicesByCode.get(serviceCode);

    return {
      ...patient,
      doctorName: doctor?.name || patient.doctorName || "",
      serviceName: service?.name || patient.serviceName || "",
      doctorId: doctor?.id || patient.doctorId,
    };
  });
}
