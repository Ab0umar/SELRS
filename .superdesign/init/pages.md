# Report page dependency trees

Trees are generated from local relative, `@/`, and `@shared/` imports. External packages are not expanded.

## client/src/pages/ClinicalReportsPage.tsx

```text

└─ client/src/pages/ClinicalReportsPage.tsx
   ├─ client/src/hooks/useAuth.ts
   │  └─ client/src/_core/hooks/useAuth.ts
   │     ├─ client/src/const.ts
   │     │  └─ shared/const.ts
   │     ├─ client/src/lib/nativeStorage.ts
   │     ├─ client/src/lib/patientCacheCleanup.ts
   │     └─ client/src/lib/trpc.ts
   │        ├─ client/src/lib/../../../server/routers.ts
   │        │  ├─ shared/const.ts
   │        │  │  ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/_core/cookies.ts
   │        │  ├─ client/src/lib/../../../server/_core/systemRouter.ts
   │        │  │  ├─ client/src/lib/../../../server/_core/notification.ts
   │        │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │        │  │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │        │  │  │  ├─ shared/const.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/_core/context.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/_core/auth.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/pentacam.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/serviceType.ts
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/_core/../../shared/opTypes.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ shared/const.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/_core/env.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/_core/../services/diagnosticRunner.ts
   │        │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │        │  │  ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/medical.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ├─ shared/const.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/context.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/pentacam.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/serviceType.ts
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../../shared/opTypes.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ shared/const.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     └─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/pentacam.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../shared/opTypes.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/mssqlPatients.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../db.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/pentacam.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/serviceType.ts
   │        │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/opTypes.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/appNotifications.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/fcmPush.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │     │  │     ↳ shared/cycle
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/webPush.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │     │  │  │  ↳ shared/cycle
   │        │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │  │     ↳ shared/cycle
   │        │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/ws.ts
   │        │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/auth.ts
   │        │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │     │     │  ├─ shared/const.ts
   │        │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │     │     ↳ shared/cycle
   │        │  │  │     │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │        ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/notification.ts
   │        │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │     ↳ shared/cycle
   │        │  │  │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../db.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/pentacam.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/serviceType.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../shared/opTypes.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/appNotifications.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/fcmPush.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/webPush.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/ws.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/../integrations/../_core/auth.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  ├─ shared/const.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │        ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/notification.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-ops.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/operationWhatsApp.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │        │  │  │  │  │  ├─ shared/const.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/context.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/pentacam.ts
   │        │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/serviceType.ts
   │        │  │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/opTypes.ts
   │        │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  │  ├─ shared/const.ts
   │        │  │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/webPush.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │  │  │     │  ↳ shared/cycle
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │        ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/pentacam.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/serviceType.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../../shared/opTypes.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/mssqlPatients.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../db.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/pentacam.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/serviceType.ts
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/opTypes.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/appNotifications.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/fcmPush.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/webPush.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │  │  ↳ shared/cycle
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/ws.ts
   │        │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/auth.ts
   │        │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  ├─ shared/const.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │     │     ↳ shared/cycle
   │        │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │        ↳ shared/cycle
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/notification.ts
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │  │        ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../db.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/pentacam.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/serviceType.ts
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/opTypes.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/appNotifications.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/fcmPush.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │        │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/webPush.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │        │  │  │  │     │  │  │  ↳ shared/cycle
   │        │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/ws.ts
   │        │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/auth.ts
   │        │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │        │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │     │     │  ├─ shared/const.ts
   │        │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │     │     ↳ shared/cycle
   │        │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │        ↳ shared/cycle
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/notification.ts
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │        ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-mssql.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-examinations.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-pentacam.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-catalog.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-patient.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-uploads.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-reference.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/patient.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/accounting.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../shared/accounting/contracts.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dailyRevenue.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/home.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dashboardSummary.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikRevenue.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikCost.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../db.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/pentacam.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/serviceType.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/opTypes.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikReceipts.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikServices.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikPatientAccounting.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/receiptsInquiry.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/stockroom.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/attendance.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/pentacam.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/serviceType.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/opTypes.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/rulesEngine.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │        │  │  │  │        │  ↳ shared/cycle
   │        │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │        │  ↳ shared/cycle
   │        │  │  │  │        └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │           ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/sourceFactory.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/accessDbAdapter.ts
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/tcpDeviceAdapter.ts
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │        ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/employees.service.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Sync.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkTcpClient.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zk4370LogPuller.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Client.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/zktecoAdms.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/pentacam.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/serviceType.ts
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/opTypes.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/rulesEngine.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/punches.service.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │        │  │  │  │  │     │  ↳ shared/cycle
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │     │  ↳ shared/cycle
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceAdapter.service.ts
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │        │  │  │  │     │  ↳ shared/cycle
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │        ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/attendance-shifts.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/attendance-leaves.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/attendance-reports.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionSettings.service.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/salary.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/salary/payrollCompute.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/pentacam.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/serviceType.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../../shared/opTypes.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/mssqlAccounting.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/mssqlPatients.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../db.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/pentacam.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/serviceType.ts
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/opTypes.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/appNotifications.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/fcmPush.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/webPush.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │  │  ↳ shared/cycle
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/ws.ts
   │        │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/auth.ts
   │        │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  ├─ shared/const.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │     │     ↳ shared/cycle
   │        │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │        ↳ shared/cycle
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/notification.ts
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │  │        ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/xrayCommission.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionDistribution.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/appNotifications.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/pentacam.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/serviceType.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/opTypes.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/fcmPush.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/webPush.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/ws.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/auth.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  ├─ shared/const.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │        │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │        │  │  │  │        ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/overtimePay.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/bookingEmail.service.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/bookingWhatsApp.service.ts
   │        │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │        ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/doctorPortal.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/marketing.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │        │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/imageGeneration.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../storage.ts
   │        │  │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../_core/env.ts
   │        │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/whatsappMarketing.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/../db.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/pentacam.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/serviceType.ts
   │        │  │  │     └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookOAuth.service.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/marketing/scheduler.service.ts
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../db.ts
   │        │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │        │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/pentacam.ts
   │        │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/serviceType.ts
   │        │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/opTypes.ts
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │        ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/kf.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../../shared/kf/contracts.ts
   │        │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/opHistory.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/whatsappInbox.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/whatsappReply.service.ts
   │        │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │        ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/db.ts
   │        │  │  ├─ client/src/lib/../../../server/../drizzle/schema.ts
   │        │  │  ├─ client/src/lib/../../../server/../shared/pentacam.ts
   │        │  │  ├─ client/src/lib/../../../server/../shared/serviceType.ts
   │        │  │  └─ client/src/lib/../../../server/../shared/opTypes.ts
   │        │  └─ client/src/lib/../../../server/_core/auth.ts
   │        │     ↳ shared/cycle
   │        ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │        │  ↳ shared/cycle
   │        ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │        │  ↳ shared/cycle
   │        └─ client/src/lib/../../../server/routers/doctorPortal.ts
   │           ↳ shared/cycle
   ├─ client/src/hooks/useAppNavigation.ts
   ├─ client/src/components/shared/PageHeader.tsx
   │  ├─ client/src/lib/utils.ts
   │  └─ client/src/hooks/useAuth.ts
   │     ↳ shared/cycle
   ├─ client/src/components/ui/tabs.tsx
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/ui/button.tsx
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/PatientPicker.tsx
   │  ├─ client/src/components/ui/input.tsx
   │  │  ├─ client/src/components/ui/dialog.tsx
   │  │  │  └─ client/src/lib/utils.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/hooks/useComposition.ts
   │  │  │  └─ client/src/hooks/usePersistFn.ts
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  └─ client/src/lib/trpc.ts
   │     ↳ shared/cycle
   ├─ client/src/lib/trpc.ts
   │  ↳ shared/cycle
   ├─ client/src/pages/ClinicalReport.tsx
   │  ├─ client/src/hooks/useAuth.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/textarea.tsx
   │  │  ├─ client/src/components/ui/dialog.tsx
   │  │  │  ↳ shared/cycle
   │  │  ├─ client/src/hooks/useComposition.ts
   │  │  │  ↳ shared/cycle
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/lib/trpc.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/lib/utils.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/hooks/useAppNavigation.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/date-input.tsx
   │  │  ├─ client/src/lib/utils.ts
   │  │  │  ↳ shared/cycle
   │  │  ├─ client/src/components/ui/button.tsx
   │  │  │  ↳ shared/cycle
   │  │  ├─ client/src/components/ui/input.tsx
   │  │  │  ↳ shared/cycle
   │  │  ├─ client/src/components/ui/calendar.tsx
   │  │  │  ├─ client/src/lib/utils.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/components/ui/button.tsx
   │  │  │     ↳ shared/cycle
   │  │  └─ client/src/components/ui/popover.tsx
   │  │     └─ client/src/lib/utils.ts
   │  │        ↳ shared/cycle
   │  ├─ client/src/components/PatientPicker.tsx
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/sheetDates.ts
   ├─ client/src/pages/PrePostOpReport.tsx
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/date-input.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/textarea.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/PatientPicker.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/reports/ClinicalReportFrame.tsx
   │  │  └─ client/src/lib/sheetDates.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/hooks/useAuth.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/lib/trpc.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/lib/utils.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/sheetDates.ts
   │     ↳ shared/cycle
   ├─ client/src/pages/PostOpOffdays.tsx
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/date-input.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/textarea.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/PatientPicker.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/reports/ClinicalReportFrame.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/hooks/useAuth.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/lib/trpc.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/lib/utils.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/sheetDates.ts
   │     ↳ shared/cycle
   ├─ client/src/pages/MedicalConditionReport.tsx
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/date-input.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/textarea.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/checkbox.tsx
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/components/ui/select.tsx
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/components/ui/dialog.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/PatientPicker.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/reports/ClinicalReportFrame.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/hooks/useAuth.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/lib/trpc.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/pages/ReferralLetter.tsx
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/textarea.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/PatientPicker.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/reports/ClinicalReportFrame.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/lib/trpc.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   └─ client/src/components/reports/PrintableMedicalReport.tsx
      ├─ client/src/lib/trpc.ts
      │  ↳ shared/cycle
      ├─ client/src/components/PatientPicker.tsx
      │  ↳ shared/cycle
      ├─ client/src/components/ui/button.tsx
      │  ↳ shared/cycle
      └─ client/src/components/ui/tabs.tsx
         ↳ shared/cycle

```

## client/src/pages/ClinicalReport.tsx

```text

└─ client/src/pages/ClinicalReport.tsx
   ├─ client/src/hooks/useAuth.ts
   │  └─ client/src/_core/hooks/useAuth.ts
   │     ├─ client/src/const.ts
   │     │  └─ shared/const.ts
   │     ├─ client/src/lib/nativeStorage.ts
   │     ├─ client/src/lib/patientCacheCleanup.ts
   │     └─ client/src/lib/trpc.ts
   │        ├─ client/src/lib/../../../server/routers.ts
   │        │  ├─ shared/const.ts
   │        │  │  ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/_core/cookies.ts
   │        │  ├─ client/src/lib/../../../server/_core/systemRouter.ts
   │        │  │  ├─ client/src/lib/../../../server/_core/notification.ts
   │        │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │        │  │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │        │  │  │  ├─ shared/const.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/_core/context.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/_core/auth.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/pentacam.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/serviceType.ts
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/_core/../../shared/opTypes.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ shared/const.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/_core/env.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/_core/../services/diagnosticRunner.ts
   │        │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │        │  │  ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/medical.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ├─ shared/const.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/context.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/pentacam.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/serviceType.ts
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../../shared/opTypes.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ shared/const.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     └─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/pentacam.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../shared/opTypes.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/mssqlPatients.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../db.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/pentacam.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/serviceType.ts
   │        │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/opTypes.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/appNotifications.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/fcmPush.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │     │  │     ↳ shared/cycle
   │        │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/webPush.ts
   │        │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │     │  │  │  ↳ shared/cycle
   │        │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │  │     ↳ shared/cycle
   │        │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/ws.ts
   │        │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/auth.ts
   │        │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │     │     │  ├─ shared/const.ts
   │        │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │     │     ↳ shared/cycle
   │        │  │  │     │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │        ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/notification.ts
   │        │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │     │     ↳ shared/cycle
   │        │  │  │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../db.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/pentacam.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/serviceType.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../shared/opTypes.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/appNotifications.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/fcmPush.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/webPush.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/ws.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/../integrations/../_core/auth.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  ├─ shared/const.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │        ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/notification.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-ops.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/operationWhatsApp.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │        │  │  │  │  │  ├─ shared/const.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/context.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/pentacam.ts
   │        │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/serviceType.ts
   │        │  │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/opTypes.ts
   │        │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  │  ├─ shared/const.ts
   │        │  │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/webPush.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │        │  │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │  │  │     │  ↳ shared/cycle
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │        │  │  │  │  │        ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/pentacam.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/serviceType.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../../shared/opTypes.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/mssqlPatients.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../db.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/pentacam.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/serviceType.ts
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/opTypes.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/appNotifications.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/fcmPush.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/webPush.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │  │  ↳ shared/cycle
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/ws.ts
   │        │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/auth.ts
   │        │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  ├─ shared/const.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │     │     ↳ shared/cycle
   │        │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │        ↳ shared/cycle
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/notification.ts
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │  │        ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../db.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/pentacam.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/serviceType.ts
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/opTypes.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/appNotifications.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/fcmPush.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │        │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/webPush.ts
   │        │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │        │  │  │  │     │  │  │  ↳ shared/cycle
   │        │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/ws.ts
   │        │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/auth.ts
   │        │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │        │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │     │     │  ├─ shared/const.ts
   │        │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │     │     ↳ shared/cycle
   │        │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │        ↳ shared/cycle
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/notification.ts
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │        │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │        ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-mssql.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-examinations.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-pentacam.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-catalog.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-patient.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-uploads.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/medical-reference.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/patient.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/accounting.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../shared/accounting/contracts.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dailyRevenue.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/home.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dashboardSummary.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikRevenue.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikCost.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../db.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/pentacam.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/serviceType.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/opTypes.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikReceipts.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikServices.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikPatientAccounting.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/receiptsInquiry.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/stockroom.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/attendance.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/pentacam.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/serviceType.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/opTypes.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/rulesEngine.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │        │  │  │  │        │  ↳ shared/cycle
   │        │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │        │  ↳ shared/cycle
   │        │  │  │  │        └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │           ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/sourceFactory.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/accessDbAdapter.ts
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/tcpDeviceAdapter.ts
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │        ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/employees.service.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Sync.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkTcpClient.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zk4370LogPuller.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Client.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │     ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/zktecoAdms.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/pentacam.ts
   │        │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/serviceType.ts
   │        │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/opTypes.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/rulesEngine.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/punches.service.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │        │  │  │  │  │     │  ↳ shared/cycle
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │  │     │  ↳ shared/cycle
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/sources/AttendanceSource.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceAdapter.service.ts
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │        │  │  │  │     │  ↳ shared/cycle
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │        │  │  │  │        ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/attendance-shifts.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/attendance-leaves.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/attendance-reports.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionSettings.service.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/salary.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/salary/payrollCompute.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/pentacam.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/serviceType.ts
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../../shared/opTypes.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │        │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/mssqlAccounting.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/mssqlPatients.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../db.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/pentacam.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/serviceType.ts
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/opTypes.ts
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/appNotifications.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/pentacam.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/serviceType.ts
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/opTypes.ts
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/fcmPush.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/webPush.ts
   │        │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │  │  │  ↳ shared/cycle
   │        │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │  │     ↳ shared/cycle
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/ws.ts
   │        │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/auth.ts
   │        │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  ├─ shared/const.ts
   │        │  │  │  │  │     │     │  │  ↳ shared/cycle
   │        │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │     │     ↳ shared/cycle
   │        │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │        ↳ shared/cycle
   │        │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/notification.ts
   │        │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │        │  │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │        │  │  │  │  │        ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/xrayCommission.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionDistribution.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/appNotifications.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/pentacam.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/serviceType.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/opTypes.ts
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/fcmPush.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/webPush.ts
   │        │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │        │  │  │  │  │  │  ↳ shared/cycle
   │        │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │        │  │  │  │  │     ↳ shared/cycle
   │        │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/ws.ts
   │        │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/auth.ts
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  ├─ shared/const.ts
   │        │  │  │  │     │  │  ↳ shared/cycle
   │        │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │        │  │  │  │     │     ↳ shared/cycle
   │        │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │        │  │  │  │        ↳ shared/cycle
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/overtimePay.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/bookingEmail.service.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/bookingWhatsApp.service.ts
   │        │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │        ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/doctorPortal.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/marketing.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │        │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/imageGeneration.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../storage.ts
   │        │  │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../_core/env.ts
   │        │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/whatsappMarketing.service.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │        │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │  │  │  ↳ shared/cycle
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/../db.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │        │  │  │     │  ↳ shared/cycle
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/pentacam.ts
   │        │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/serviceType.ts
   │        │  │  │     └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │        │  │  │        ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookOAuth.service.ts
   │        │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │  │     ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/marketing/scheduler.service.ts
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../db.ts
   │        │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │        │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/pentacam.ts
   │        │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/serviceType.ts
   │        │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/opTypes.ts
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │        │  │     │  ↳ shared/cycle
   │        │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │        │  │        ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/kf.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../../shared/kf/contracts.ts
   │        │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/opHistory.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │        │  │     ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/routers/whatsappInbox.ts
   │        │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │        │  │  │  ↳ shared/cycle
   │        │  │  └─ client/src/lib/../../../server/routers/../services/whatsappReply.service.ts
   │        │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │        │  │        ↳ shared/cycle
   │        │  ├─ client/src/lib/../../../server/db.ts
   │        │  │  ├─ client/src/lib/../../../server/../drizzle/schema.ts
   │        │  │  ├─ client/src/lib/../../../server/../shared/pentacam.ts
   │        │  │  ├─ client/src/lib/../../../server/../shared/serviceType.ts
   │        │  │  └─ client/src/lib/../../../server/../shared/opTypes.ts
   │        │  └─ client/src/lib/../../../server/_core/auth.ts
   │        │     ↳ shared/cycle
   │        ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │        │  ↳ shared/cycle
   │        ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │        │  ↳ shared/cycle
   │        └─ client/src/lib/../../../server/routers/doctorPortal.ts
   │           ↳ shared/cycle
   ├─ client/src/components/ui/button.tsx
   │  └─ client/src/lib/utils.ts
   ├─ client/src/components/ui/textarea.tsx
   │  ├─ client/src/components/ui/dialog.tsx
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/hooks/useComposition.ts
   │  │  └─ client/src/hooks/usePersistFn.ts
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/lib/trpc.ts
   │  ↳ shared/cycle
   ├─ client/src/lib/utils.ts
   │  ↳ shared/cycle
   ├─ client/src/hooks/useAppNavigation.ts
   ├─ client/src/components/ui/date-input.tsx
   │  ├─ client/src/lib/utils.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/input.tsx
   │  │  ├─ client/src/components/ui/dialog.tsx
   │  │  │  ↳ shared/cycle
   │  │  ├─ client/src/hooks/useComposition.ts
   │  │  │  ↳ shared/cycle
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/components/ui/calendar.tsx
   │  │  ├─ client/src/lib/utils.ts
   │  │  │  ↳ shared/cycle
   │  │  └─ client/src/components/ui/button.tsx
   │  │     ↳ shared/cycle
   │  └─ client/src/components/ui/popover.tsx
   │     └─ client/src/lib/utils.ts
   │        ↳ shared/cycle
   ├─ client/src/components/PatientPicker.tsx
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/trpc.ts
   │     ↳ shared/cycle
   └─ client/src/lib/sheetDates.ts

```

## client/src/pages/ReferralLetter.tsx

```text

└─ client/src/pages/ReferralLetter.tsx
   ├─ client/src/components/ui/button.tsx
   │  └─ client/src/lib/utils.ts
   ├─ client/src/components/ui/input.tsx
   │  ├─ client/src/components/ui/dialog.tsx
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/hooks/useComposition.ts
   │  │  └─ client/src/hooks/usePersistFn.ts
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/ui/textarea.tsx
   │  ├─ client/src/components/ui/dialog.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/hooks/useComposition.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/PatientPicker.tsx
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/trpc.ts
   │     ├─ client/src/lib/../../../server/routers.ts
   │     │  ├─ shared/const.ts
   │     │  ├─ client/src/lib/../../../server/_core/cookies.ts
   │     │  ├─ client/src/lib/../../../server/_core/systemRouter.ts
   │     │  │  ├─ client/src/lib/../../../server/_core/notification.ts
   │     │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │     │  │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │     │  │  │  ├─ shared/const.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/_core/context.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/auth.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/_core/../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/_core/../services/diagnosticRunner.ts
   │     │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │     │  │  ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/medical.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ├─ shared/const.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/context.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/pentacam.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../shared/opTypes.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/mssqlPatients.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../db.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │     ↳ shared/cycle
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/webPush.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │  │     ↳ shared/cycle
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/ws.ts
   │     │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/auth.ts
   │     │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │     │     ↳ shared/cycle
   │     │  │  │     │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │        ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/notification.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │     ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/appNotifications.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/webPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/ws.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../integrations/../_core/auth.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ shared/const.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/notification.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-ops.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/operationWhatsApp.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/context.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/opTypes.ts
   │     │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/webPush.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/mssqlPatients.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../db.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/webPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/ws.ts
   │     │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/auth.ts
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/notification.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../db.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/webPush.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/ws.ts
   │     │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/auth.ts
   │     │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/notification.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-mssql.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-examinations.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-pentacam.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-catalog.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-patient.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-uploads.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-reference.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/patient.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/accounting.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../shared/accounting/contracts.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dailyRevenue.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/home.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dashboardSummary.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikRevenue.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikCost.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/opTypes.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikReceipts.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikServices.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikPatientAccounting.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/receiptsInquiry.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/stockroom.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/attendance.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/rulesEngine.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │        │  ↳ shared/cycle
   │     │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │        │  ↳ shared/cycle
   │     │  │  │  │        └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │           ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/sourceFactory.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/accessDbAdapter.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/tcpDeviceAdapter.ts
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/employees.service.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Sync.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkTcpClient.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zk4370LogPuller.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Client.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/zktecoAdms.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/rulesEngine.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/punches.service.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-shifts.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-leaves.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-reports.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionSettings.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/salary.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/payrollCompute.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/mssqlAccounting.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/mssqlPatients.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../db.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/webPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/ws.ts
   │     │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/auth.ts
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/notification.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/xrayCommission.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionDistribution.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/appNotifications.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/fcmPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/webPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/ws.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/auth.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ shared/const.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/overtimePay.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/bookingEmail.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/bookingWhatsApp.service.ts
   │     │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/doctorPortal.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/marketing.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/imageGeneration.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../storage.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../_core/env.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/whatsappMarketing.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/../db.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/pentacam.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/serviceType.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookOAuth.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/marketing/scheduler.service.ts
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../db.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/pentacam.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/serviceType.ts
   │     │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/opTypes.ts
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/kf.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../shared/kf/contracts.ts
   │     │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/opHistory.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/whatsappInbox.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/whatsappReply.service.ts
   │     │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/db.ts
   │     │  │  ├─ client/src/lib/../../../server/../drizzle/schema.ts
   │     │  │  ├─ client/src/lib/../../../server/../shared/pentacam.ts
   │     │  │  ├─ client/src/lib/../../../server/../shared/serviceType.ts
   │     │  │  └─ client/src/lib/../../../server/../shared/opTypes.ts
   │     │  └─ client/src/lib/../../../server/_core/auth.ts
   │     │     ↳ shared/cycle
   │     ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │     │  ↳ shared/cycle
   │     ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │     │  ↳ shared/cycle
   │     └─ client/src/lib/../../../server/routers/doctorPortal.ts
   │        ↳ shared/cycle
   ├─ client/src/components/reports/ClinicalReportFrame.tsx
   │  └─ client/src/lib/sheetDates.ts
   ├─ client/src/lib/trpc.ts
   │  ↳ shared/cycle
   └─ client/src/lib/utils.ts
      ↳ shared/cycle

```

## client/src/pages/MedicalConditionReport.tsx

```text

└─ client/src/pages/MedicalConditionReport.tsx
   ├─ client/src/components/ui/button.tsx
   │  └─ client/src/lib/utils.ts
   ├─ client/src/components/ui/date-input.tsx
   │  ├─ client/src/lib/utils.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/input.tsx
   │  │  ├─ client/src/components/ui/dialog.tsx
   │  │  │  └─ client/src/lib/utils.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/hooks/useComposition.ts
   │  │  │  └─ client/src/hooks/usePersistFn.ts
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/components/ui/calendar.tsx
   │  │  ├─ client/src/lib/utils.ts
   │  │  │  ↳ shared/cycle
   │  │  └─ client/src/components/ui/button.tsx
   │  │     ↳ shared/cycle
   │  └─ client/src/components/ui/popover.tsx
   │     └─ client/src/lib/utils.ts
   │        ↳ shared/cycle
   ├─ client/src/components/ui/input.tsx
   │  ↳ shared/cycle
   ├─ client/src/components/ui/textarea.tsx
   │  ├─ client/src/components/ui/dialog.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/hooks/useComposition.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/ui/checkbox.tsx
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/ui/select.tsx
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/ui/dialog.tsx
   │  ↳ shared/cycle
   ├─ client/src/components/PatientPicker.tsx
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/trpc.ts
   │     ├─ client/src/lib/../../../server/routers.ts
   │     │  ├─ shared/const.ts
   │     │  ├─ client/src/lib/../../../server/_core/cookies.ts
   │     │  ├─ client/src/lib/../../../server/_core/systemRouter.ts
   │     │  │  ├─ client/src/lib/../../../server/_core/notification.ts
   │     │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │     │  │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │     │  │  │  ├─ shared/const.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/_core/context.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/auth.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/_core/../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/_core/../services/diagnosticRunner.ts
   │     │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │     │  │  ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/medical.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ├─ shared/const.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/context.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/pentacam.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../shared/opTypes.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/mssqlPatients.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../db.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │     ↳ shared/cycle
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/webPush.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │  │     ↳ shared/cycle
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/ws.ts
   │     │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/auth.ts
   │     │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │     │     ↳ shared/cycle
   │     │  │  │     │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │        ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/notification.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │     ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/appNotifications.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/webPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/ws.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../integrations/../_core/auth.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ shared/const.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/notification.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-ops.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/operationWhatsApp.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/context.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/opTypes.ts
   │     │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/webPush.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/mssqlPatients.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../db.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/webPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/ws.ts
   │     │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/auth.ts
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/notification.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../db.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/webPush.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/ws.ts
   │     │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/auth.ts
   │     │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/notification.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-mssql.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-examinations.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-pentacam.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-catalog.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-patient.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-uploads.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-reference.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/patient.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/accounting.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../shared/accounting/contracts.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dailyRevenue.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/home.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dashboardSummary.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikRevenue.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikCost.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/opTypes.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikReceipts.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikServices.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikPatientAccounting.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/receiptsInquiry.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/stockroom.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/attendance.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/rulesEngine.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │        │  ↳ shared/cycle
   │     │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │        │  ↳ shared/cycle
   │     │  │  │  │        └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │           ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/sourceFactory.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/accessDbAdapter.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/tcpDeviceAdapter.ts
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/employees.service.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Sync.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkTcpClient.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zk4370LogPuller.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Client.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/zktecoAdms.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/rulesEngine.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/punches.service.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-shifts.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-leaves.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-reports.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionSettings.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/salary.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/payrollCompute.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/mssqlAccounting.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/mssqlPatients.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../db.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/webPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/ws.ts
   │     │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/auth.ts
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/notification.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/xrayCommission.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionDistribution.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/appNotifications.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/fcmPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/webPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/ws.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/auth.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ shared/const.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/overtimePay.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/bookingEmail.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/bookingWhatsApp.service.ts
   │     │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/doctorPortal.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/marketing.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/imageGeneration.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../storage.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../_core/env.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/whatsappMarketing.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/../db.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/pentacam.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/serviceType.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookOAuth.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/marketing/scheduler.service.ts
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../db.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/pentacam.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/serviceType.ts
   │     │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/opTypes.ts
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/kf.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../shared/kf/contracts.ts
   │     │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/opHistory.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/whatsappInbox.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/whatsappReply.service.ts
   │     │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/db.ts
   │     │  │  ├─ client/src/lib/../../../server/../drizzle/schema.ts
   │     │  │  ├─ client/src/lib/../../../server/../shared/pentacam.ts
   │     │  │  ├─ client/src/lib/../../../server/../shared/serviceType.ts
   │     │  │  └─ client/src/lib/../../../server/../shared/opTypes.ts
   │     │  └─ client/src/lib/../../../server/_core/auth.ts
   │     │     ↳ shared/cycle
   │     ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │     │  ↳ shared/cycle
   │     ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │     │  ↳ shared/cycle
   │     └─ client/src/lib/../../../server/routers/doctorPortal.ts
   │        ↳ shared/cycle
   ├─ client/src/components/reports/ClinicalReportFrame.tsx
   │  └─ client/src/lib/sheetDates.ts
   ├─ client/src/hooks/useAuth.ts
   │  └─ client/src/_core/hooks/useAuth.ts
   │     ├─ client/src/const.ts
   │     │  └─ shared/const.ts
   │     │     ↳ shared/cycle
   │     ├─ client/src/lib/nativeStorage.ts
   │     ├─ client/src/lib/patientCacheCleanup.ts
   │     └─ client/src/lib/trpc.ts
   │        ↳ shared/cycle
   ├─ client/src/lib/trpc.ts
   │  ↳ shared/cycle
   └─ client/src/lib/utils.ts
      ↳ shared/cycle

```

## client/src/pages/PostOpOffdays.tsx

```text

└─ client/src/pages/PostOpOffdays.tsx
   ├─ client/src/components/ui/button.tsx
   │  └─ client/src/lib/utils.ts
   ├─ client/src/components/ui/date-input.tsx
   │  ├─ client/src/lib/utils.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/input.tsx
   │  │  ├─ client/src/components/ui/dialog.tsx
   │  │  │  └─ client/src/lib/utils.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/hooks/useComposition.ts
   │  │  │  └─ client/src/hooks/usePersistFn.ts
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/components/ui/calendar.tsx
   │  │  ├─ client/src/lib/utils.ts
   │  │  │  ↳ shared/cycle
   │  │  └─ client/src/components/ui/button.tsx
   │  │     ↳ shared/cycle
   │  └─ client/src/components/ui/popover.tsx
   │     └─ client/src/lib/utils.ts
   │        ↳ shared/cycle
   ├─ client/src/components/ui/input.tsx
   │  ↳ shared/cycle
   ├─ client/src/components/ui/textarea.tsx
   │  ├─ client/src/components/ui/dialog.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/hooks/useComposition.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/PatientPicker.tsx
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/trpc.ts
   │     ├─ client/src/lib/../../../server/routers.ts
   │     │  ├─ shared/const.ts
   │     │  ├─ client/src/lib/../../../server/_core/cookies.ts
   │     │  ├─ client/src/lib/../../../server/_core/systemRouter.ts
   │     │  │  ├─ client/src/lib/../../../server/_core/notification.ts
   │     │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │     │  │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │     │  │  │  ├─ shared/const.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/_core/context.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/auth.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/_core/../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/_core/../services/diagnosticRunner.ts
   │     │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │     │  │  ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/medical.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ├─ shared/const.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/context.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/pentacam.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../shared/opTypes.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/mssqlPatients.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../db.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │     ↳ shared/cycle
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/webPush.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │  │     ↳ shared/cycle
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/ws.ts
   │     │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/auth.ts
   │     │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │     │     ↳ shared/cycle
   │     │  │  │     │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │        ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/notification.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │     ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/appNotifications.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/webPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/ws.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../integrations/../_core/auth.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ shared/const.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/notification.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-ops.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/operationWhatsApp.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/context.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/opTypes.ts
   │     │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/webPush.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/mssqlPatients.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../db.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/webPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/ws.ts
   │     │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/auth.ts
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/notification.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../db.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/webPush.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/ws.ts
   │     │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/auth.ts
   │     │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/notification.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-mssql.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-examinations.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-pentacam.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-catalog.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-patient.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-uploads.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-reference.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/patient.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/accounting.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../shared/accounting/contracts.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dailyRevenue.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/home.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dashboardSummary.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikRevenue.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikCost.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/opTypes.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikReceipts.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikServices.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikPatientAccounting.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/receiptsInquiry.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/stockroom.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/attendance.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/rulesEngine.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │        │  ↳ shared/cycle
   │     │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │        │  ↳ shared/cycle
   │     │  │  │  │        └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │           ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/sourceFactory.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/accessDbAdapter.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/tcpDeviceAdapter.ts
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/employees.service.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Sync.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkTcpClient.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zk4370LogPuller.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Client.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/zktecoAdms.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/rulesEngine.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/punches.service.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-shifts.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-leaves.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-reports.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionSettings.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/salary.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/payrollCompute.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/mssqlAccounting.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/mssqlPatients.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../db.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/webPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/ws.ts
   │     │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/auth.ts
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/notification.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/xrayCommission.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionDistribution.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/appNotifications.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/fcmPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/webPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/ws.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/auth.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ shared/const.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/overtimePay.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/bookingEmail.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/bookingWhatsApp.service.ts
   │     │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/doctorPortal.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/marketing.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/imageGeneration.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../storage.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../_core/env.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/whatsappMarketing.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/../db.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/pentacam.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/serviceType.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookOAuth.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/marketing/scheduler.service.ts
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../db.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/pentacam.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/serviceType.ts
   │     │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/opTypes.ts
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/kf.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../shared/kf/contracts.ts
   │     │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/opHistory.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/whatsappInbox.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/whatsappReply.service.ts
   │     │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/db.ts
   │     │  │  ├─ client/src/lib/../../../server/../drizzle/schema.ts
   │     │  │  ├─ client/src/lib/../../../server/../shared/pentacam.ts
   │     │  │  ├─ client/src/lib/../../../server/../shared/serviceType.ts
   │     │  │  └─ client/src/lib/../../../server/../shared/opTypes.ts
   │     │  └─ client/src/lib/../../../server/_core/auth.ts
   │     │     ↳ shared/cycle
   │     ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │     │  ↳ shared/cycle
   │     ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │     │  ↳ shared/cycle
   │     └─ client/src/lib/../../../server/routers/doctorPortal.ts
   │        ↳ shared/cycle
   ├─ client/src/components/reports/ClinicalReportFrame.tsx
   │  └─ client/src/lib/sheetDates.ts
   ├─ client/src/hooks/useAuth.ts
   │  └─ client/src/_core/hooks/useAuth.ts
   │     ├─ client/src/const.ts
   │     │  └─ shared/const.ts
   │     │     ↳ shared/cycle
   │     ├─ client/src/lib/nativeStorage.ts
   │     ├─ client/src/lib/patientCacheCleanup.ts
   │     └─ client/src/lib/trpc.ts
   │        ↳ shared/cycle
   ├─ client/src/lib/trpc.ts
   │  ↳ shared/cycle
   ├─ client/src/lib/utils.ts
   │  ↳ shared/cycle
   └─ client/src/lib/sheetDates.ts
      ↳ shared/cycle

```

## client/src/pages/PrePostOpReport.tsx

```text

└─ client/src/pages/PrePostOpReport.tsx
   ├─ client/src/components/ui/button.tsx
   │  └─ client/src/lib/utils.ts
   ├─ client/src/components/ui/date-input.tsx
   │  ├─ client/src/lib/utils.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/button.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/components/ui/input.tsx
   │  │  ├─ client/src/components/ui/dialog.tsx
   │  │  │  └─ client/src/lib/utils.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/hooks/useComposition.ts
   │  │  │  └─ client/src/hooks/usePersistFn.ts
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/components/ui/calendar.tsx
   │  │  ├─ client/src/lib/utils.ts
   │  │  │  ↳ shared/cycle
   │  │  └─ client/src/components/ui/button.tsx
   │  │     ↳ shared/cycle
   │  └─ client/src/components/ui/popover.tsx
   │     └─ client/src/lib/utils.ts
   │        ↳ shared/cycle
   ├─ client/src/components/ui/input.tsx
   │  ↳ shared/cycle
   ├─ client/src/components/ui/textarea.tsx
   │  ├─ client/src/components/ui/dialog.tsx
   │  │  ↳ shared/cycle
   │  ├─ client/src/hooks/useComposition.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   ├─ client/src/components/PatientPicker.tsx
   │  ├─ client/src/components/ui/input.tsx
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/trpc.ts
   │     ├─ client/src/lib/../../../server/routers.ts
   │     │  ├─ shared/const.ts
   │     │  ├─ client/src/lib/../../../server/_core/cookies.ts
   │     │  ├─ client/src/lib/../../../server/_core/systemRouter.ts
   │     │  │  ├─ client/src/lib/../../../server/_core/notification.ts
   │     │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │     │  │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │     │  │  │  ├─ shared/const.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/_core/context.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/auth.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/_core/../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/_core/../services/diagnosticRunner.ts
   │     │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │     │  │  ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/medical.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ├─ shared/const.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/context.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/pentacam.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../shared/opTypes.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/mssqlPatients.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../db.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │     ↳ shared/cycle
   │     │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/webPush.ts
   │     │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │  │     ↳ shared/cycle
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/ws.ts
   │     │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/auth.ts
   │     │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │     │     ↳ shared/cycle
   │     │  │  │     │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │        ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/notification.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │     │     ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/appNotifications.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/webPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/ws.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../integrations/../_core/auth.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ shared/const.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/notification.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-ops.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/operationWhatsApp.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/context.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/opTypes.ts
   │     │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  ├─ shared/const.ts
   │     │  │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/webPush.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │     │  │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/mssqlPatients.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../db.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/webPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/ws.ts
   │     │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/auth.ts
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/notification.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../db.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/webPush.ts
   │     │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/ws.ts
   │     │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/auth.ts
   │     │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/notification.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-mssql.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-examinations.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-pentacam.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-catalog.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-patient.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-uploads.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/medical-reference.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/patient.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/accounting.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../shared/accounting/contracts.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dailyRevenue.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/home.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dashboardSummary.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikRevenue.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikCost.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/opTypes.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikReceipts.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikServices.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikPatientAccounting.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/receiptsInquiry.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/stockroom.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/attendance.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/rulesEngine.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │        │  ↳ shared/cycle
   │     │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │        │  ↳ shared/cycle
   │     │  │  │  │        └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │           ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/sourceFactory.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/accessDbAdapter.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/tcpDeviceAdapter.ts
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/employees.service.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Sync.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkTcpClient.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zk4370LogPuller.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Client.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │     ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/zktecoAdms.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/pentacam.ts
   │     │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/serviceType.ts
   │     │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/opTypes.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/rulesEngine.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/punches.service.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/sources/AttendanceSource.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceAdapter.service.ts
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │     │  │  │  │     │  ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-shifts.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-leaves.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/attendance-reports.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionSettings.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/salary.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/payrollCompute.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/pentacam.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/serviceType.ts
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../../shared/opTypes.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │     │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/mssqlAccounting.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/mssqlPatients.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../db.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/pentacam.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/serviceType.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/opTypes.ts
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/appNotifications.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/pentacam.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/serviceType.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/opTypes.ts
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/fcmPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/webPush.ts
   │     │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │  │  │  ↳ shared/cycle
   │     │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │  │     ↳ shared/cycle
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/ws.ts
   │     │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/auth.ts
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  ├─ shared/const.ts
   │     │  │  │  │  │     │     │  │  ↳ shared/cycle
   │     │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     │     ↳ shared/cycle
   │     │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │        ↳ shared/cycle
   │     │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/notification.ts
   │     │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │     │  │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │     │  │  │  │  │        ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/xrayCommission.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionDistribution.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/appNotifications.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/pentacam.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/serviceType.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/opTypes.ts
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/fcmPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/webPush.ts
   │     │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │  │  │  ↳ shared/cycle
   │     │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │  │     ↳ shared/cycle
   │     │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/ws.ts
   │     │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/auth.ts
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  ├─ shared/const.ts
   │     │  │  │  │     │  │  ↳ shared/cycle
   │     │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │     │     ↳ shared/cycle
   │     │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │     │  │  │  │        ↳ shared/cycle
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/overtimePay.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/bookingEmail.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/bookingWhatsApp.service.ts
   │     │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/doctorPortal.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/marketing.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/imageGeneration.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../storage.ts
   │     │  │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../_core/env.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/whatsappMarketing.service.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │     │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │  │  │  ↳ shared/cycle
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/../db.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │     │  │  │     │  ↳ shared/cycle
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/pentacam.ts
   │     │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/serviceType.ts
   │     │  │  │     └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │     │  │  │        ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookOAuth.service.ts
   │     │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │  │     ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/marketing/scheduler.service.ts
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../db.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/pentacam.ts
   │     │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/serviceType.ts
   │     │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/opTypes.ts
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │     │  │     │  ↳ shared/cycle
   │     │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/kf.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../shared/kf/contracts.ts
   │     │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/opHistory.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │     │  │     ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/routers/whatsappInbox.ts
   │     │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │     │  │  │  ↳ shared/cycle
   │     │  │  └─ client/src/lib/../../../server/routers/../services/whatsappReply.service.ts
   │     │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │     │  │        ↳ shared/cycle
   │     │  ├─ client/src/lib/../../../server/db.ts
   │     │  │  ├─ client/src/lib/../../../server/../drizzle/schema.ts
   │     │  │  ├─ client/src/lib/../../../server/../shared/pentacam.ts
   │     │  │  ├─ client/src/lib/../../../server/../shared/serviceType.ts
   │     │  │  └─ client/src/lib/../../../server/../shared/opTypes.ts
   │     │  └─ client/src/lib/../../../server/_core/auth.ts
   │     │     ↳ shared/cycle
   │     ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │     │  ↳ shared/cycle
   │     ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │     │  ↳ shared/cycle
   │     └─ client/src/lib/../../../server/routers/doctorPortal.ts
   │        ↳ shared/cycle
   ├─ client/src/components/reports/ClinicalReportFrame.tsx
   │  └─ client/src/lib/sheetDates.ts
   ├─ client/src/hooks/useAuth.ts
   │  └─ client/src/_core/hooks/useAuth.ts
   │     ├─ client/src/const.ts
   │     │  └─ shared/const.ts
   │     │     ↳ shared/cycle
   │     ├─ client/src/lib/nativeStorage.ts
   │     ├─ client/src/lib/patientCacheCleanup.ts
   │     └─ client/src/lib/trpc.ts
   │        ↳ shared/cycle
   ├─ client/src/lib/trpc.ts
   │  ↳ shared/cycle
   ├─ client/src/lib/utils.ts
   │  ↳ shared/cycle
   └─ client/src/lib/sheetDates.ts
      ↳ shared/cycle

```

## client/src/components/reports/PrintableMedicalReport.tsx

```text

└─ client/src/components/reports/PrintableMedicalReport.tsx
   ├─ client/src/lib/trpc.ts
   │  ├─ client/src/lib/../../../server/routers.ts
   │  │  ├─ shared/const.ts
   │  │  ├─ client/src/lib/../../../server/_core/cookies.ts
   │  │  ├─ client/src/lib/../../../server/_core/systemRouter.ts
   │  │  │  ├─ client/src/lib/../../../server/_core/notification.ts
   │  │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │  │  │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │  │  │  │  ├─ shared/const.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/_core/context.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/_core/auth.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │  │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/pentacam.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../shared/serviceType.ts
   │  │  │  │  │  │  │  └─ client/src/lib/../../../server/_core/../../shared/opTypes.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/_core/../../drizzle/schema.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  ├─ shared/const.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  └─ client/src/lib/../../../server/_core/env.ts
   │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/_core/env.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/_core/../db.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/_core/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/_core/../services/diagnosticRunner.ts
   │  │  ├─ client/src/lib/../../../server/_core/procedures.ts
   │  │  │  ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/medical.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ├─ shared/const.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/context.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │  │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/pentacam.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../shared/serviceType.ts
   │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../../shared/opTypes.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  ├─ shared/const.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../db.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/env.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/env.ts
   │  │  │  │        ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/pentacam.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../../shared/opTypes.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/mssqlPatients.ts
   │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../db.ts
   │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/pentacam.ts
   │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/serviceType.ts
   │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../shared/opTypes.ts
   │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/appNotifications.ts
   │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/fcmPush.ts
   │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │  │  │  │     │  │     ↳ shared/cycle
   │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/webPush.ts
   │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │  │  │  │     │  │  │  ↳ shared/cycle
   │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │     │  │     ↳ shared/cycle
   │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/ws.ts
   │  │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/auth.ts
   │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../db.ts
   │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │     │     │  ├─ shared/const.ts
   │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │     │     │     ↳ shared/cycle
   │  │  │  │     │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │     │        ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/notification.ts
   │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │     │     ↳ shared/cycle
   │  │  │  │     └─ client/src/lib/../../../server/routers/../services/accounting/../../integrations/../../drizzle/schema.ts
   │  │  │  │        ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../db.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/pentacam.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../../shared/serviceType.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../shared/opTypes.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/appNotifications.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/pentacam.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/serviceType.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../../shared/opTypes.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/fcmPush.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/webPush.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/ws.ts
   │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../integrations/../_core/auth.ts
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../db.ts
   │  │  │  │  │     │  │  ↳ shared/cycle
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │  │     │  │  ↳ shared/cycle
   │  │  │  │  │     │  ├─ shared/const.ts
   │  │  │  │  │     │  │  ↳ shared/cycle
   │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │  │  │  │  │     │     ↳ shared/cycle
   │  │  │  │  │     └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │  │  │  │  │        ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/../_core/notification.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../_core/env.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/../../drizzle/schema.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/medical-ops.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/operationWhatsApp.service.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │  │  │  │  │  │  ├─ shared/const.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/context.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │  │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │  │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/pentacam.ts
   │  │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/serviceType.ts
   │  │  │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../../shared/opTypes.ts
   │  │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../../drizzle/schema.ts
   │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  │  │  ├─ shared/const.ts
   │  │  │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │  │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │  │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │  │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │  │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/webPush.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/../db.ts
   │  │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │  │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │  │  │  │  │  │     │  ↳ shared/cycle
   │  │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../_core/env.ts
   │  │  │  │  │  │        ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/pentacam.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../shared/serviceType.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../../shared/opTypes.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/mssqlPatients.ts
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../db.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/pentacam.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/serviceType.ts
   │  │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../shared/opTypes.ts
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/appNotifications.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/pentacam.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/serviceType.ts
   │  │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../shared/opTypes.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/fcmPush.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │  │  │  │  │  │     │  │     ↳ shared/cycle
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/webPush.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │  │  │  │  │  │     │  │  │  ↳ shared/cycle
   │  │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │  │     ↳ shared/cycle
   │  │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/ws.ts
   │  │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/auth.ts
   │  │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../db.ts
   │  │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │  │     │     │  ├─ shared/const.ts
   │  │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │     │     ↳ shared/cycle
   │  │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │        ↳ shared/cycle
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/notification.ts
   │  │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │     ↳ shared/cycle
   │  │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../services/accounting/../../integrations/../../drizzle/schema.ts
   │  │  │  │  │  │        ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../db.ts
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/pentacam.ts
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/serviceType.ts
   │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../shared/opTypes.ts
   │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/appNotifications.ts
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/pentacam.ts
   │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/serviceType.ts
   │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../shared/opTypes.ts
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/fcmPush.ts
   │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │  │  │  │  │     │  │     ↳ shared/cycle
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/webPush.ts
   │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │  │  │  │  │     │  │  │  ↳ shared/cycle
   │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │  │  │  │  │     │  │     ↳ shared/cycle
   │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/ws.ts
   │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/auth.ts
   │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../db.ts
   │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │     │     │  ├─ shared/const.ts
   │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │  │  │  │  │     │     │     ↳ shared/cycle
   │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │  │  │  │  │     │        ↳ shared/cycle
   │  │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/notification.ts
   │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/_medical/../../integrations/../_core/env.ts
   │  │  │  │  │     │     ↳ shared/cycle
   │  │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/../../integrations/../../drizzle/schema.ts
   │  │  │  │  │        ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │  │  │  │        ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/medical-mssql.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/medical-examinations.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/medical-pentacam.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/procedures.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/auth.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/appNotifications.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/fcmPush.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../db.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../../drizzle/schema.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../services/accounting/mssqlAccounting.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/ws.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/buildInfo.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../_core/s3.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/_medical/../../integrations/mssqlPatients.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │  │  │  │        ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/medical-catalog.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/auth.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/fcmPush.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/buildInfo.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/medical-patient.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/serviceType.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/medical-uploads.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/medical-reference.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/_medical/patient-helpers.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/_medical/service-helpers.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/patient.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/accounting.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../../shared/accounting/contracts.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dailyRevenue.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/home.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/dashboardSummary.service.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikRevenue.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikCost.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../db.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../drizzle/schema.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/pentacam.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/serviceType.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/opTypes.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikReceipts.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikServices.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/lasikPatientAccounting.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/receiptsInquiry.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/../../../shared/accounting/contracts.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mappers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/sqlBuilders.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../services/accounting/mssqlAccounting.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/stockroom.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/egyptianDrugReference.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/attendance.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/pentacam.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/serviceType.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../shared/opTypes.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyAggregation.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/rulesEngine.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │  │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/deviceAdapter.service.ts
   │  │  │  │  │        │  ↳ shared/cycle
   │  │  │  │  │        ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │        │  ↳ shared/cycle
   │  │  │  │  │        └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │           ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/sourceFactory.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/sources/accessDbAdapter.ts
   │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │  │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/tcpDeviceAdapter.ts
   │  │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │  │  │  │  │  │        ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/employees.service.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/sources/AttendanceSource.ts
   │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/punches.service.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Sync.service.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zkTcpClient.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zk4370LogPuller.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zk4370Client.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/zktecoAdms.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../../drizzle/schema.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/pentacam.ts
   │  │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/serviceType.ts
   │  │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../shared/opTypes.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/rulesEngine.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/punches.service.ts
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │  │  │  │  │  │     │  ↳ shared/cycle
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │  │     │  ↳ shared/cycle
   │  │  │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/sources/AttendanceSource.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceAdapter.service.ts
   │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../_core/../services/attendance/deviceSettings.service.ts
   │  │  │  │  │     │     ↳ shared/cycle
   │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../db.ts
   │  │  │  │  │     │  ↳ shared/cycle
   │  │  │  │  │     └─ client/src/lib/../../../server/routers/../_core/../services/attendance/../../../drizzle/schema.ts
   │  │  │  │  │        ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/zkDevicePuller.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/attendance-shifts.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/attendance-sync.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/attendance-leaves.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/attendance-reports.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceDiagnostics.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkAttendLogPuller.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/fkDeviceSyncService.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dashboard.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/monthlyCompute.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/leaveManagement.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionAdjustment.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/auditLog.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSettings.service.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/syncEngine.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/deviceSyncEngine.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/zktecoDevice.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/dailyMaterializer.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/_attendance/schedule-helpers.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/attendance/permissionSettings.service.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/attendance/../../db.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/salary.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/payrollCompute.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/pentacam.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../shared/serviceType.ts
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../../shared/opTypes.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../db.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../../drizzle/schema.ts
   │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/mssqlAccounting.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/mssqlPatients.ts
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../db.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/pentacam.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/serviceType.ts
   │  │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../shared/opTypes.ts
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/appNotifications.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/pentacam.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/serviceType.ts
   │  │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../shared/opTypes.ts
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/fcmPush.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │  │  │  │  │  │     │  │     ↳ shared/cycle
   │  │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/webPush.ts
   │  │  │  │  │  │     │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │  │  │  │  │  │     │  │  │  ↳ shared/cycle
   │  │  │  │  │  │     │  │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │  │     ↳ shared/cycle
   │  │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/ws.ts
   │  │  │  │  │  │     │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/auth.ts
   │  │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../db.ts
   │  │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │  │     │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/../../drizzle/schema.ts
   │  │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │  │     │     │  ├─ shared/const.ts
   │  │  │  │  │  │     │     │  │  ↳ shared/cycle
   │  │  │  │  │  │     │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │     │     ↳ shared/cycle
   │  │  │  │  │  │     │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │        ↳ shared/cycle
   │  │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/notification.ts
   │  │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../_core/env.ts
   │  │  │  │  │  │     │     ↳ shared/cycle
   │  │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../accounting/../../integrations/../../drizzle/schema.ts
   │  │  │  │  │  │        ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/xrayCommission.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/commissionDistribution.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/appNotifications.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/pentacam.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/serviceType.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../shared/opTypes.ts
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/fcmPush.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/webPush.ts
   │  │  │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │  │  │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │  │  │  │  │  │     ↳ shared/cycle
   │  │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/ws.ts
   │  │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/auth.ts
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../db.ts
   │  │  │  │  │     │  │  ↳ shared/cycle
   │  │  │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/salary/../../_core/../../drizzle/schema.ts
   │  │  │  │  │     │  │  ↳ shared/cycle
   │  │  │  │  │     │  ├─ shared/const.ts
   │  │  │  │  │     │  │  ↳ shared/cycle
   │  │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │  │  │  │  │     │     ↳ shared/cycle
   │  │  │  │  │     └─ client/src/lib/../../../server/routers/../services/salary/../../_core/env.ts
   │  │  │  │  │        ↳ shared/cycle
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/overtimePay.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/lateDeduction.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/salary/singlePunchDays.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../services/salary/commissionPoolsMssql.service.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/appNotifications.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/webPush.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/ws.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/bookingEmail.service.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../services/bookingWhatsApp.service.ts
   │  │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │  │  │        ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/doctorPortal.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/_medical/pentacam-helpers.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/marketing.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │  │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │  │  │  │        ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/imageGeneration.ts
   │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../storage.ts
   │  │  │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/../_core/env.ts
   │  │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │  │  │  │        ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/brandStyleAnalyzer.service.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/env.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/whatsappMarketing.service.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │  │  │  │  ├─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │  │  │  │  │  ↳ shared/cycle
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/../db.ts
   │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../drizzle/schema.ts
   │  │  │  │     │  ↳ shared/cycle
   │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/pentacam.ts
   │  │  │  │     ├─ client/src/lib/../../../server/routers/../services/../../shared/serviceType.ts
   │  │  │  │     └─ client/src/lib/../../../server/routers/../services/../../shared/opTypes.ts
   │  │  │  │        ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../services/marketing/facebookOAuth.service.ts
   │  │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │  │  │  │     ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../services/marketing/scheduler.service.ts
   │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../db.ts
   │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/pentacam.ts
   │  │  │     │  ├─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/serviceType.ts
   │  │  │     │  └─ client/src/lib/../../../server/routers/../services/marketing/../../../shared/opTypes.ts
   │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/../../../drizzle/schema.ts
   │  │  │     │  ↳ shared/cycle
   │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/contentGenerator.service.ts
   │  │  │     │  ↳ shared/cycle
   │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/imageGenerator.service.ts
   │  │  │     │  ↳ shared/cycle
   │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/facebookPublisher.service.ts
   │  │  │     │  ↳ shared/cycle
   │  │  │     ├─ client/src/lib/../../../server/routers/../services/marketing/topicRotation.ts
   │  │  │     │  ↳ shared/cycle
   │  │  │     └─ client/src/lib/../../../server/routers/../services/marketing/../../_core/env.ts
   │  │  │        ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/kf.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/s3.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../../shared/kf/contracts.ts
   │  │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/opHistory.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/legacyPatients.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../integrations/mssqlPatients.ts
   │  │  │     ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/routers/whatsappInbox.ts
   │  │  │  ├─ client/src/lib/../../../server/routers/../_core/procedures.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../db.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  ├─ client/src/lib/../../../server/routers/../../drizzle/schema.ts
   │  │  │  │  ↳ shared/cycle
   │  │  │  └─ client/src/lib/../../../server/routers/../services/whatsappReply.service.ts
   │  │  │     └─ client/src/lib/../../../server/routers/../services/../_core/env.ts
   │  │  │        ↳ shared/cycle
   │  │  ├─ client/src/lib/../../../server/db.ts
   │  │  │  ├─ client/src/lib/../../../server/../drizzle/schema.ts
   │  │  │  ├─ client/src/lib/../../../server/../shared/pentacam.ts
   │  │  │  ├─ client/src/lib/../../../server/../shared/serviceType.ts
   │  │  │  └─ client/src/lib/../../../server/../shared/opTypes.ts
   │  │  └─ client/src/lib/../../../server/_core/auth.ts
   │  │     ↳ shared/cycle
   │  ├─ client/src/lib/../../../server/routers/patientPortal.ts
   │  │  ↳ shared/cycle
   │  ├─ client/src/lib/../../../server/routers/externalDoctors.ts
   │  │  ↳ shared/cycle
   │  └─ client/src/lib/../../../server/routers/doctorPortal.ts
   │     ↳ shared/cycle
   ├─ client/src/components/PatientPicker.tsx
   │  ├─ client/src/components/ui/input.tsx
   │  │  ├─ client/src/components/ui/dialog.tsx
   │  │  │  └─ client/src/lib/utils.ts
   │  │  ├─ client/src/hooks/useComposition.ts
   │  │  │  └─ client/src/hooks/usePersistFn.ts
   │  │  └─ client/src/lib/utils.ts
   │  │     ↳ shared/cycle
   │  └─ client/src/lib/trpc.ts
   │     ↳ shared/cycle
   ├─ client/src/components/ui/button.tsx
   │  └─ client/src/lib/utils.ts
   │     ↳ shared/cycle
   └─ client/src/components/ui/tabs.tsx
      └─ client/src/lib/utils.ts
         ↳ shared/cycle

```

## Tab relationship

`ClinicalReportsPage` owns patient selection, tab state, URL synchronization, auth redirect, print CSS, and the six tab children. The `medical-report` tab renders `PrintableMedicalReport`; the other five tabs render `ClinicalReport`, `PrePostOpReport`, `PostOpOffdays`, `MedicalConditionReport`, and `ReferralLetter`.

### Import/header snapshot: `client/src/pages/ClinicalReportsPage.tsx`

```tsx

   1: import { useEffect, useMemo, useState } from "react";
   2: import { useAuth } from "@/hooks/useAuth";
   3: import { useLocation, useRoute } from "wouter";
   4: import { useAppNavigation } from "@/hooks/useAppNavigation";
   5: import { PageHeader } from "@/components/shared/PageHeader";
   6: import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
   7: import { Button } from "@/components/ui/button";
   8: import PatientPicker from "@/components/PatientPicker";
   9: import { trpc } from "@/lib/trpc";
  10: import {
  11:   ArrowRight,
  12:   CalendarOff,
  13:   FileCheck2,
  14:   FileText,
  15:   FileWarning,
  16:   Send,
  17:   Printer,
  18:   CheckCircle2,
  19:   X,
  20:   User,
  21: } from "lucide-react";
  22: 
  23: // Sub-components
  24: import ClinicalReport from "./ClinicalReport";
  25: import PrePostOpReport from "./PrePostOpReport";
  26: import PostOpOffdays from "./PostOpOffdays";
  27: import MedicalConditionReport from "./MedicalConditionReport";
  28: import ReferralLetter from "./ReferralLetter";
  29: import PrintableMedicalReport from "@/components/reports/PrintableMedicalReport";
  30: import { direction } from "html2canvas/dist/types/css/property-descriptors/direction";
  31: 
  32: export type ClinicalReportsTabKey =
  33:   | "clinical"
  34:   | "pre-post-op"
  35:   | "offdays"

```

### Import/header snapshot: `client/src/pages/ClinicalReport.tsx`

```tsx

   1: import { useEffect, useState } from "react";
   2: import { useAuth } from "@/hooks/useAuth";
   3: import { useLocation, useRoute } from "wouter";
   4: import { Button } from "@/components/ui/button";
   5: import { Textarea } from "@/components/ui/textarea";
   6: import { Printer, Save } from "lucide-react";
   7: import { toast } from "sonner";
   8: import { trpc } from "@/lib/trpc";
   9: import { getTrpcErrorMessage } from "@/lib/utils";
  10: import { useAppNavigation } from "@/hooks/useAppNavigation";
  11: import { DateInput } from "@/components/ui/date-input";
  12: import PatientPicker from "@/components/PatientPicker";
  13: import {
  14:   displaySheetDate,
  15:   formatSheetDate,
  16:   getPatientSheetDateOfBirth,
  17: } from "@/lib/sheetDates";
  18: 
  19: function formatFundusFinding(value: unknown) {
  20:   if (!value) return "—";
  21:   let finding = value as Record<string, unknown>;
  22:   if (typeof value === "string") {
  23:     try {
  24:       finding = JSON.parse(value) as Record<string, unknown>;
  25:     } catch {
  26:       return value;
  27:     }
  28:   }
  29:   return [
  30:     finding.discStatus && `Disc: ${finding.discStatus}`,
  31:     finding.cupDiscRatio && `C/D: ${finding.cupDiscRatio}`,
  32:     finding.macuaStatus && `Macula: ${finding.macuaStatus}`,
  33:     finding.vesselStatus && `Vessels: ${finding.vesselStatus}`,
  34:     finding.otherFindings && `Other: ${finding.otherFindings}`,
  35:   ]

```

### Import/header snapshot: `client/src/pages/ReferralLetter.tsx`

```tsx

   1: import { useEffect, useState } from "react";
   2: import { useLocation, useRoute } from "wouter";
   3: import { Button } from "@/components/ui/button";
   4: import { Input } from "@/components/ui/input";
   5: import { Textarea } from "@/components/ui/textarea";
   6: import { ArrowRight, Download, Printer, Save } from "lucide-react";
   7: import PatientPicker from "@/components/PatientPicker";
   8: import { ClinicalReportFrame } from "@/components/reports/ClinicalReportFrame";
   9: import { trpc } from "@/lib/trpc";
  10: import { toast } from "sonner";
  11: import { getTrpcErrorMessage } from "@/lib/utils";
  12: 
  13: const TODAY = new Date().toISOString().split("T")[0];
  14: const REF_ID = `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  15: 
  16: interface FormData {
  17:   patientName: string;
  18:   patientAge: string;
  19:   patientGender: string;
  20:   patientId: string;
  21:   nationality: string;
  22:   contact: string;
  23:   examDate: string;
  24:   // refraction
  25:   refractionOD: string;
  26:   refractionOS: string;
  27:   // VA uncorrected
  28:   vaOD: string;
  29:   vaOS: string;
  30:   // VA best corrected
  31:   vaBestOD: string;
  32:   vaBestOS: string;
  33:   // IOP
  34:   iopOD: string;
  35:   iopOS: string;

```

### Import/header snapshot: `client/src/pages/MedicalConditionReport.tsx`

```tsx

   1: import { useEffect, useState } from "react";
   2: import { useRoute } from "wouter";
   3: import { Download, Printer, Save, Settings2, Trash2 } from "lucide-react";
   4: import { Button } from "@/components/ui/button";
   5: import { DateInput } from "@/components/ui/date-input";
   6: import { Input } from "@/components/ui/input";
   7: import { Textarea } from "@/components/ui/textarea";
   8: import { Checkbox } from "@/components/ui/checkbox";
   9: import {
  10:   Select,
  11:   SelectContent,
  12:   SelectItem,
  13:   SelectTrigger,
  14:   SelectValue,
  15: } from "@/components/ui/select";
  16: import {
  17:   Dialog,
  18:   DialogContent,
  19:   DialogHeader,
  20:   DialogTitle,
  21: } from "@/components/ui/dialog";
  22: import PatientPicker from "@/components/PatientPicker";
  23: import { ClinicalReportFrame } from "@/components/reports/ClinicalReportFrame";
  24: import { useAuth } from "@/hooks/useAuth";
  25: import { trpc } from "@/lib/trpc";
  26: import { toast } from "sonner";
  27: import { getTrpcErrorMessage } from "@/lib/utils";
  28: 
  29: function CertLabel({ children }: { children: string }) {
  30:   return (
  31:     <span className="text-[11px] font-bold text-[#727780]">{children}</span>
  32:   );
  33: }
  34: 
  35: export type MedicalConditionReportProps = {

```

### Import/header snapshot: `client/src/pages/PostOpOffdays.tsx`

```tsx

   1: import { useEffect, useState } from "react";
   2: import { useRoute } from "wouter";
   3: import { Download, Printer, Save } from "lucide-react";
   4: import { Button } from "@/components/ui/button";
   5: import { DateInput } from "@/components/ui/date-input";
   6: import { Input } from "@/components/ui/input";
   7: import { Textarea } from "@/components/ui/textarea";
   8: import PatientPicker from "@/components/PatientPicker";
   9: import { ClinicalReportFrame } from "@/components/reports/ClinicalReportFrame";
  10: import { useAuth } from "@/hooks/useAuth";
  11: import { trpc } from "@/lib/trpc";
  12: import { toast } from "sonner";
  13: import { getTrpcErrorMessage } from "@/lib/utils";
  14: import { displaySheetDate } from "@/lib/sheetDates";
  15: 
  16: function CertLabel({ children }: { children: string }) {
  17:   return (
  18:     <span className="text-[11px] font-bold text-[#727780]">{children}</span>
  19:   );
  20: }
  21: 
  22: function diffDaysInclusive(from: string, to: string) {
  23:   if (!from || !to) return "";
  24:   const start = new Date(from);
  25:   const end = new Date(to);
  26:   if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  27:   const ms = end.getTime() - start.getTime();
  28:   if (ms < 0) return "";
  29:   return String(Math.floor(ms / 86_400_000) + 1);
  30: }
  31: 
  32: const DEFAULT_CERTIFICATE_STATEMENT =
  33:   "يشهد المركز بأن المريض المذكور أدناه قد خضع لإجراء عملية تصحيح الإبصار، ويتطلب فترة راحة طبية لتقليل الإجهاد البصري وحماية العين أثناء مرحلة التعافي.";
  34: 
  35: export type PostOpOffdaysProps = {

```

### Import/header snapshot: `client/src/pages/PrePostOpReport.tsx`

```tsx

   1: import { useEffect, useMemo, useState } from "react";
   2: import { useRoute } from "wouter";
   3: import { Download, Printer, Save } from "lucide-react";
   4: import { Button } from "@/components/ui/button";
   5: import { DateInput } from "@/components/ui/date-input";
   6: import { Input } from "@/components/ui/input";
   7: import { Textarea } from "@/components/ui/textarea";
   8: import PatientPicker from "@/components/PatientPicker";
   9: import { ClinicalReportFrame } from "@/components/reports/ClinicalReportFrame";
  10: import { useAuth } from "@/hooks/useAuth";
  11: import { trpc } from "@/lib/trpc";
  12: import { toast } from "sonner";
  13: import { getTrpcErrorMessage } from "@/lib/utils";
  14: import { displaySheetDate } from "@/lib/sheetDates";
  15: 
  16: type EyeValues = {
  17:   s: string;
  18:   c: string;
  19:   ax: string;
  20:   pd: string;
  21:   add: string;
  22: };
  23: 
  24: const emptyEye: EyeValues = { s: "", c: "", ax: "", pd: "", add: "" };
  25: 
  26: function FieldLabel({ children }: { children: string }) {
  27:   return (
  28:     <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-[#727780]">
  29:       {children}
  30:     </span>
  31:   );
  32: }
  33: 
  34: function RefractionTable({
  35:   title,

```

### Import/header snapshot: `client/src/components/reports/PrintableMedicalReport.tsx`

```tsx

   1: import { useState, useEffect } from "react";
   2: import { useRoute } from "wouter";
   3: import { trpc } from "@/lib/trpc";
   4: import PatientPicker from "@/components/PatientPicker";
   5: import { Button } from "@/components/ui/button";
   6: import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
   7: import {
   8:   Printer,
   9:   RotateCcw,
  10:   CheckCircle2,
  11:   Sparkles,
  12:   Plus,
  13:   Trash2,
  14:   Globe,
  15:   FileText,
  16: } from "lucide-react";
  17: 
  18: export interface RefractionEntry {
  19:   eye: string;
  20:   sphere?: string;
  21:   cylinder?: string;
  22:   axis?: string;
  23: }
  24: 
  25: export interface PhysicianInfo {
  26:   name: string;
  27:   title: string;
  28: }
  29: 
  30: export interface MedicalReportData {
  31:   title: string;
  32:   patientName: string;
  33:   examinationDate: string;
  34:   procedureDate: string;
  35:   clinicalSummary: string;

```
