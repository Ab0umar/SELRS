# Monitoring and Incident Response Plan

This document outlines the plan for monitoring the health of the SRV100 application in production and responding to incidents.

## 1. Proactive Monitoring

### Key Metrics to Monitor

- **API Performance:**
    - **API Timing Logs:** All tRPC procedure invocations should be logged with their duration.
    - **Slow Endpoint Threshold:** An alert should be triggered if the execution time for any tRPC procedure exceeds **2 seconds**.
    - **MSSQL Query Timing:** The duration of SQL queries against the MSSQL database should be logged, especially for reporting endpoints.

- **Application Health:**
    - **Production Health URL:** A dedicated health check endpoint (e.g., `/api/system/health`) should be available. This endpoint should be polled by an external service at regular intervals (e.g., every 1-5 minutes).
    - **Health Check Response:** The health check should confirm connectivity to the MySQL and MSSQL databases and return a `200 OK` status if healthy.
    - **Error Rates:** Monitor the rate of HTTP 5xx errors from the server. A sudden spike should trigger an alert.

- **System & Logs:**
    - **PM2 Logs:** The output logs from the PM2 process manager (`~/.pm2/logs/`) should be regularly reviewed or streamed to a central logging service.
    - **Frontend Console Errors:** As part of the post-deployment smoke check, the browser's developer console should be checked for any uncaught errors on critical pages.

### Monitoring Tools
- **Logging:** PM2's built-in logging, potentially aggregated by a service like Papertrail, Datadog, or a self-hosted ELK stack.
- **Uptime Monitoring:** An external service like UptimeRobot, Pingdom, or a similar tool to poll the health check URL.
- **Performance Monitoring:** Application Performance Monitoring (APM) tools could be used for more detailed tracing, but for now, structured logs with timing information are the baseline.

## 2. Incident Response

### Incident Definition
An "incident" is any event that causes a degradation or outage of service for users. Examples include:
- The application is down or unresponsive (health check fails).
- A critical feature (e.g., patient search, creating an examination) is broken.
- Application performance is severely degraded (e.g., most requests take >5-10 seconds).
- A security vulnerability is discovered.

### Incident Response Steps

1.  **Alert:** An automated alert is triggered (e.g., from the uptime monitor or a spike in 5xx errors) and notifies the on-call developer/team.

2.  **Acknowledge & Triage:**
    - The on-call developer acknowledges the alert.
    - **Initial Assessment (5-10 minutes):** Quickly assess the impact. Is it affecting all users or a subset? Is it a full outage or a partial degradation?
    - **Check Logs:** Immediately review PM2 logs, server application logs, and system logs for obvious errors (e.g., crash loops, database connection errors, `EADDRINUSE`).

3.  **Contain & Remediate:**
    - **Is it a bad deployment?** If the incident occurred immediately after a deployment, the first and fastest step is to **execute the rollback plan** (revert to the previous stable release).
    - **Is it a database issue?** Check database connectivity and resource utilization (CPU, memory, connections).
    - **Is it a resource issue?** Check server CPU and memory usage. If maxed out, a restart of the application process (`pm2 restart <app_name>`) may provide temporary relief while the root cause is investigated.
    - **Communicate:** A brief status update should be provided to stakeholders (e.g., "We are investigating an outage of the patient search feature. The initial response is to roll back the latest deployment.").

4.  **Investigate Root Cause:**
    - Once the service is restored (e.g., via rollback), a deeper investigation into the root cause can begin in a non-emergency context.
    - Analyze logs leading up to the incident.
    - Attempt to reproduce the issue in a staging environment.

5.  **Post-Mortem:**
    - After the incident is fully resolved, a brief post-mortem should be conducted.
    - **What happened?** (A timeline of events)
    - **What was the impact?** (To users and the business)
    - **What was the root cause?**
    - **What did we do well? What could we have done better?**
    - **Action Items:** What steps will we take to prevent this from happening again? (e.g., add a new test case, improve a monitor, update a checklist).

---
*This plan should be reviewed and updated after every major incident.*
