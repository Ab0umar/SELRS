# ADR-002: Read-Only Accounting Module

**Date:** 2026-05-07
**Status:** Adopted

## Context

The initial phase of the Accounting module (Phase 1) is focused on surfacing existing financial data from a legacy MSSQL database (`op2026`). The primary goal is to provide reporting and inquiry capabilities that match the output of the legacy system. There is no immediate requirement to create, update, or delete accounting records from the SRV100 web application. This decision is codified in the project's Constitution, Principle III.

## Decision

The Accounting module, for Phase 1, **MUST** be strictly read-only. This means:

1.  **No Mutations:** All tRPC procedures within the `accountingRouter` must be queries (`.query()`). No mutations (`.mutation()`) are permitted.
2.  **No Write Verbs in SQL:** All SQL queries executed by the accounting service layer must use the `SELECT` verb. `INSERT`, `UPDATE`, `DELETE`, `MERGE`, or any other data-modifying SQL commands are strictly forbidden.
3.  **No Write Access for DB User:** The database user configured for the application should ideally have read-only permissions on the MSSQL accounting database, if the infrastructure allows for it. This provides a security backstop.

## Consequences

**Positive:**
- **Safety:** The risk of accidental data corruption, deletion, or modification of the legacy accounting system is eliminated. This is the most significant benefit, as the MSSQL database is the source of truth for financial records.
- **Simplicity:** A read-only system is significantly simpler to design, build, and test. There are no transactional complexities, validation rules for writes, or complex state management for forms.
- **Performance:** Read-only queries are generally easier to optimize and cache.

**Negative:**
- **Limited Functionality:** Users cannot make corrections or create new entries directly through the web interface. All accounting data entry must continue through the legacy system. This is an accepted limitation for Phase 1.
- **Future Work Required:** If write capabilities are needed in the future, a significant development effort and a formal amendment to the project Constitution will be required.

## Alternatives Rejected

1.  **Implementing Write Operations with Feature Flags:** The idea of building write functionality but disabling it with feature flags was rejected. This would add unnecessary complexity and testing overhead for functionality not required in Phase 1, violating the "minimal diff" principle.
2.  **A Limited Write Scope:** Allowing writes for only specific, "safe" fields was considered but ultimately rejected. Defining what is "safe" is difficult, and it would breach the clear, simple boundary of a read-only system, increasing risk for minimal benefit in Phase 1.
