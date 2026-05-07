# ADR-003: MSSQL/MySQL Data Boundary

**Date:** 2026-05-07
**Status:** Adopted

## Context

The SRV100 application interacts with two distinct databases: a MySQL database (`selrs26`) that serves as the source of truth for the Medical module, and a legacy MSSQL database (`op2026`) that is the source of truth for the Accounting module. A clear and unambiguous rule is needed for how data from these two systems can be related without violating their boundaries or creating a "split-brain" scenario. This decision is codified in the project's Constitution, Principle IV.

## Decision

1.  **Source of Truth:** MySQL remains the single source of truth for all medical data. MSSQL remains the single source of truth for all accounting data.
2.  **The Bridge:** The only permissible link between the two databases is the patient identifier. Specifically, the `patients.patientCode` column in the MySQL database corresponds to the `PAT_CD` column in various MSSQL tables.
3.  **Read-Time Correlation:** This bridge key may only be used for data correlation at read-time, for the purpose of enriching reports with descriptive information. For example, an accounting report may use a `PAT_CD` from MSSQL to look up the patient's name from the `patients` table in MySQL.
4.  **No Cross-Database Writes:** A transaction or user action originating in one module must never write to the database of the other module. For example, creating a new patient in the Medical module (an action in MySQL) cannot trigger a write to the MSSQL database.

## Consequences

**Positive:**
- **Data Integrity:** Each system maintains its own data integrity without interference from the other. This prevents a bug in the Accounting module from corrupting medical records, and vice-versa.
- **Clarity and Simplicity:** The "one bridge key" rule is simple to understand and enforce. It avoids complex, multi-database transaction logic.
- **Loose Coupling:** The two systems are loosely coupled, which makes them easier to maintain and upgrade independently.

**Negative:**
- **Data Synchronization is an External Concern:** Keeping patient records aligned between the two systems (e.g., ensuring a patient created in the medical system also exists in the accounting system) is not the responsibility of the SRV100 application itself. This must be handled by external processes or data entry conventions.
- **Potential for Orphaned Records:** An accounting record in MSSQL might have a `PAT_CD` that does not correspond to any `patientCode` in the MySQL database. The application UI must handle this gracefully (e.g., by displaying "No medical record linked") rather than crashing.

## Alternatives Rejected

1.  **Database-Level Replication:** Setting up replication or a federated database was rejected as overly complex and a significant infrastructure change, violating the "Use Existing Databases As-Is" principle.
2.  **A Two-Phase Commit Service:** Building a service to handle two-phase commits across both databases was rejected. This would introduce massive complexity and a single point of failure, and is far beyond the scope of the project's requirements.
3.  **Using MySQL Foreign Keys to MSSQL (or vice-versa):** This is not technically feasible across different database systems and would create a tight coupling that is undesirable.
