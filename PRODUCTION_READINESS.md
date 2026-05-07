# SRV100 Production Readiness Review

This document provides a final checklist and a summary of risks for the SRV100 project's production readiness.

## Final Checklist

This checklist combines and consolidates items from `RESPONSIVE_GUIDELINES.md` and `specs/deploy-notes.md`.

### Pre-Deployment
- [ ] **Code Freeze:** No new features or non-critical bug fixes are merged into the release branch.
- [ ] **Automated Checks:**
    - [ ] `pnpm check` (TypeScript compilation) passes.
    - [ ] `pnpm test` (unit tests) passes.
- [ ] **Production Build:**
    - [ ] `pnpm build` completes successfully.
- [ ] **Environment Configuration:**
    - [ ] `.env` file for the production environment is prepared with all necessary variables, especially `PORT` to avoid `EADDRINUSE` errors.
- [ ] **Rollback Plan:**
    - [ ] The previous stable git tag/branch is identified and ready for a quick rollback.

### Deployment
- [ ] The application is deployed, and the server process (Node/PM2) is started.
- [ ] The server is confirmed to be running and listening on the correct port.

### Post-Deployment Verification (Manual Smoke Tests)

#### 1. Basic Application Health
- [ ] Open the main application URL and verify that it returns a HTTP 200 status code.
- [ ] Check the browser's developer console for any critical errors.
- [ ] Log in with an `admin`/`manager`/`accountant` user.

#### 2. Core Feature Verification
- [ ] **Medical - Dashboard:** Navigate to `/dashboard` and confirm the layout loads correctly.
- [ ] **Medical - Patients:** Navigate to `/patients` and verify the patient list/search functionality.
- [ ] **Accounting - Home:** Navigate to `/accounting` and check the dashboard cards and navigation.
- [ ] **Accounting - Daily Revenue:** Go to `/accounting/daily-revenue`, run a query, and confirm the table renders data.
- [ ] **Accounting - Service Revenue:** Go to `/accounting/service-revenue`, run a query, and check the grouped table and totals.
- [ ] **Accounting - Receipts:** Visit `/accounting/receipts`, perform an inquiry, and verify that receipt rows are displayed.
- [ ] **Regression Test:** Access a critical medical workflow (e.g., open a patient file) and confirm its behavior is unchanged.

#### 3. Mobile and Responsive UI Verification
- [ ] **Visual Testing (at 320px, 360px, 390px, 430px, 640px, 1024px widths):**
    - [ ] No horizontal overflow on any page.
    - [ ] Text is readable and not truncated awkwardly.
    - [ ] Buttons and inputs are accessible (minimum 44px height on mobile).
    - [ ] Dialogs fit within the viewport and are scrollable if necessary.
- [ ] **Component-Specific Testing:**
    - [ ] `Select` components do not overflow their containers.
    - [ ] Toolbars wrap correctly on mobile screens.
    - [ ] Tables switch to a card-based layout on mobile, with pagination working (20 items/page).
- [ ] **RTL Testing:**
    - [ ] Text is right-aligned.
    - [ ] Icons are mirrored correctly.
    - [ ] Layouts are correctly reversed (e.g., flex-row-reverse).
- [ ] **Performance:**
    - [ ] Mobile card grids load quickly with no noticeable lag.
    - [ ] Desktop virtualized tables scroll smoothly with 100+ rows.

#### 4. Android APK
- [ ] Build the release APK using the `android/gradlew.bat assembleRelease` command.
- [ ] Install and test the APK on a physical Android device, verifying core functionality and mobile UX.

## Risks

### High
- **Cache Invalidation Failure:** The `PATIENTPAGESTATE_POLICY.md` explicitly states that cache invalidation failure during MSSQL sync is **non-blocking**. This could lead to a situation where the sync succeeds, but the cache is not cleared, causing users to see stale data. While there are manual recovery options for admins, this could lead to user confusion and support requests. The risk is that a user acts on stale data before the next sync/invalidation.

### Medium
- **Documentation Inconsistency:** The codebase contains a large number of markdown files. While many seem to be generated as part of a structured workflow, the sheer volume and presence of files like `PROJECT_OVERVIEW.md` and `README.md` alongside more specific documents like `RESPONSIVE_GUIDELINES.md` increases the risk of documentation becoming outdated or contradictory. This can lead to confusion for developers and operational staff.
- **Manual Testing Gaps:** The project relies heavily on manual testing checklists within documentation (`RESPONSIVE_GUIDELINES.md`, `specs/deploy-notes.md`). While these checklists are comprehensive, their manual nature makes them prone to human error or being skipped under pressure. There is a risk that regressions are missed, especially in non-critical paths.

### Low
- **Complex Cache Policy:** The `patientPageStates` cache has a very specific and strict policy. While well-documented, its complexity (multiple cleanup triggers, non-blocking failures) could be a source of subtle bugs or misunderstandings for new developers working on the project.
- **Environment-Specific Deployment Issues:** The `specs/deploy-notes.md` mentions that the `pnpm start` command failed due to a port conflict. While this is an operational issue, it highlights the need for robust environment configuration and pre-deployment checks to avoid similar issues in production.
- **Missing Centralized Deployment Checklist:** The deployment steps are scattered across `specs/deploy-notes.md` and `RESPONSIVE_GUIDELINES.md`. A single, canonical deployment checklist would reduce the risk of missing a step during deployment.
