# ADR-001: Strict Module Separation

**Date:** 2026-05-07
**Status:** Adopted

## Context

The SRV100 project is expanding to include an Accounting module alongside the existing Medical module. The Medical module is a mature, stable system with its own database (MySQL) and business logic. The Accounting module needs to access a separate, legacy database (MSSQL). To prevent unintended side effects, maintain stability, and ensure clarity of purpose, a clear boundary must be established between these two modules. This decision is codified in the project's Constitution, Principle I.

## Decision

The Medical and Accounting modules **MUST** remain strictly separated at every layer of the application. This includes:

1.  **Code:** No file within the `server/services/accounting` or `client/src/pages/accounting` directories may import from the corresponding `medical` directories, and vice-versa. Shared UI primitives and core utilities are exempt.
2.  **API:** The backend tRPC routers (`accountingRouter`, `medicalRouter`) must be separate.
3.  **Database:** The Accounting module will only interact with the MSSQL database, and the Medical module will only interact with the MySQL database. Cross-database joins are forbidden at the application layer.
4.  **Data Flow:** The only permissible link for data correlation between the two modules is the `patientCode` (MySQL) / `PAT_CD` (MSSQL) identifier, to be used at read-time for reporting purposes only. No shared mutation paths are allowed.

## Consequences

**Positive:**
- **Reduced Risk:** Isolates changes within the Accounting module, minimizing the risk of introducing regressions or unintended side effects into the critical Medical module.
- **Improved Maintainability:** Developers can work on one module with a clear understanding of its boundaries and dependencies, making the codebase easier to reason about.
- **Clear Ownership:** The separation creates clear ownership boundaries for code, data, and functionality.

**Negative:**
- **Potential for Code Duplication:** Some common logic or data-shaping patterns might need to be duplicated or placed in a shared library if they are needed by both modules.
- **No "Single View of the Patient":** It will not be possible to construct a single, real-time, mutable "patient" object that combines data from both Medical and Accounting systems within a single transaction. This is an explicit trade-off.

## Alternatives Rejected

1.  **A Unified Module:** Combining Medical and Accounting logic into a single, larger module was rejected. The risk of corrupting legacy accounting data or destabilizing the medical system was deemed too high. The distinct data sources and business rules make a unified model complex and fragile.
2.  **API-level Gateway:** Creating a gateway service that would abstract the two data sources was considered but rejected as overly complex for the current requirements. It would introduce another point of failure and violate the "minimal diff" principle. The current approach of direct, but separate, access is simpler and sufficient.
