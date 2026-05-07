# Security Checklist

This document outlines the security expectations and verification steps for the SRV100 application.

## 1. Authentication & Authorization

- [ ] **tRPC Protected Routes:** All tRPC procedures that access sensitive data or perform mutations must use `protectedProcedure` or a role-specific procedure (`managerProcedure`, `adminProcedure`, etc.). Publicly accessible endpoints should be explicitly reviewed and justified.
- [ ] **Role Checks:** Backend procedures must enforce role-based access control (RBAC). For example, accounting data should only be accessible to users with `admin`, `manager`, or `accountant` roles.
- [ ] **Frontend Route Guards:** All frontend routes that display sensitive information must be wrapped in the `ProtectedRoute` component, configured with the appropriate `allowedRoles`.
- [ ] **Session Management:** JWTs should be stored in secure, HttpOnly cookies. Logout functionality must properly invalidate the session/cookie.

## 2. Data Handling

- [ ] **No Direct SQL from Frontend:** The frontend must never construct or send SQL queries directly. All database interaction must go through the tRPC API layer.
- [ ] **Input Validation:** All input from the client must be validated on the server using `zod`. This includes route parameters, query strings, and request bodies.
- [ ] **Parameterized Queries:** All SQL queries on the backend must be parameterized to prevent SQL injection attacks. Raw string concatenation into SQL queries is strictly forbidden.
- [ ] **PII/PHI Handling:** Personally Identifiable Information (PII) and Protected Health Information (PHI) should not be logged in plaintext. Sensitive data should not be exposed in URLs where possible.

## 3. Environment & Configuration

- [ ] **No Secrets in Client-Side Code:** No API keys, secret tokens, or other credentials should be present in the frontend JavaScript bundle.
- [**Secure Environment Handling:**
    - [ ] Production secrets (`JWT_SECRET`, database URLs, etc.) must be managed through environment variables (`.env` file).
    - [ ] The `.env` file must never be committed to the git repository.
    - [ ] The `.env.example` file should contain placeholders, not real secrets.

## 4. Auditing & Monitoring

- [ ] **Audit Logging:** Key actions, especially those involving data creation, modification, or deletion (e.g., creating a patient, updating a medical record), should be logged in an audit trail. The log should include what changed, who changed it, and when.
- [ ] **Error Logging:** Application errors should be logged on the server with sufficient context for debugging, but without leaking sensitive information in the logs.

## 5. Production Hardening

- [ ] **Production Headers:** The production web server should be configured to send security-enhancing HTTP headers, such as:
    - `Strict-Transport-Security` (HSTS)
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Content-Security-Policy` (CSP) - *If feasible for the application.*
- [ ] **CORS Configuration:** The `CORS_ALLOWED_ORIGINS` environment variable must be set to a restrictive list of known domains for the production environment.

## 6. Backup and Recovery

- [ ] **Backup Plan:** A regular backup schedule for the MySQL database must be in place.
- [ ] **Rollback Plan:** For each deployment, a clear rollback plan must be documented. For code-only changes, this is typically reverting to a previous git tag and redeploying. If a database migration is involved, the rollback plan must account for it.

---
*This checklist should be reviewed and updated regularly.*
