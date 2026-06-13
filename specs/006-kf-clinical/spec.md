# KF Clinical Module — Spec

**Status**: ✅ Implemented 2026-06-09
**Original spec**: `specs/kf/specify.md`

## Summary

Isolated MySQL-only clinical module for a separate patient population (KF codes). Operates independently of the main SELRS medical module — no MSSQL access, no cross-module imports.

## Entities

- **kf_patients** — KF patient records with auto-generated `KF-XXXX` codes
- **kf_visits** — Visit records (consultation, examination, followup, operation)
- **kf_examinations** — Ophthalmic examination data (VA, refraction, IOP, diagnosis)
- **kf_operations** — Surgical operations (type, eye, doctor, status)
- **kf_followups** — Post-op and general followup records

## Access Control

- `kfProcedure`: accountant + admin bypass OR `/kf` path permission
- `kfWriteProcedure`: accountant + admin bypass OR `/kf:rw` path permission

## Key Constraints

- No MSSQL access ever (grep enforced in T011)
- Bridge to SELRS patients is read-only `patientCode` lookup only
- Code format: `KF-0001`, `KF-0002`, … via `LPAD(kf_id, 4, '0')`
