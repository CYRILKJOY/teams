# Operations Guide

This document details the standard operating procedures for maintaining, monitoring, and managing the TaskFlow application in production.

## 1. Health & Readiness Checks

TaskFlow exposes two unauthenticated endpoints for load balancer and orchestration (e.g., Kubernetes, Docker Swarm) health checks.

- **Liveness Probe:** `GET /api/v1/health`
  - Purpose: Validates that the Node.js API process is running and responding to HTTP requests.
  - Success Response: `200 OK {"status": "ok", "timestamp": "..."}`
  
- **Readiness Probe:** `GET /api/v1/ready`
  - Purpose: Validates that the application is fully connected to the Supabase database. It executes a lightweight `SELECT 1` equivalent query.
  - Success Response: `200 OK {"status": "ready"}`
  - Failure Response: `503 Service Unavailable` if the database is unreachable or connection pools are exhausted.

Load balancers should be configured to remove the node from the active rotation if the Readiness Probe returns `503`.

## 2. Logging and Log Aggregation

TaskFlow utilizes **Pino** for extremely fast, low-overhead JSON logging. In production (`NODE_ENV=production`), logs are output synchronously as raw JSON strings to standard output (`stdout`).

### Ingestion Strategy
Do not store logs locally on the production server. Utilize a log aggregator like Datadog, ELK stack, or AWS CloudWatch:
1. Docker captures the stdout stream.
2. Configure the Docker daemon logging driver (e.g., `awslogs`, `fluentd`, or `syslog`) to stream logs to your aggregator.
3. Search for logs labeled `level: 50` (ERROR) or `level: 60` (FATAL) for proactive incident detection.

## 3. Monitoring & Error Tracking

### Application Monitoring (APM)
It is recommended to deploy an APM agent (e.g., Datadog APM or New Relic) alongside the Node.js process to monitor:
- Event loop latency.
- HTTP Request duration and throughput.
- Unhandled Promise rejections.

### Error Tracking
While `Pino` handles standard application logs, integrate **Sentry** (or a similar tool) for detailed stack-trace aggregation. A Sentry hook can be attached globally in `src/server.ts` within the `fastify.setErrorHandler` block to capture context-rich API failures.

## 4. Secret Management & Rotation

### Rotation Procedure
If credentials (e.g., `CLICKUP_API_TOKEN` or `JWT_SECRET`) must be rotated:
1. Generate the new secret.
2. Update the `.env` file on the production host.
3. Restart the Docker container: `docker-compose up -d --force-recreate`.
4. Monitor the `/api/v1/health` and `/api/v1/ready` endpoints to ensure a smooth boot.

> [!CAUTION]
> Rotating `JWT_SECRET` will immediately invalidate all existing user sessions. Users will be required to log in again. Ensure rotation occurs during maintenance windows to minimize disruption.

## 5. Applying Database Migrations

Database migrations are located in `supabase/migrations/`. 

To apply new migrations after a code update:
1. Ensure the Supabase CLI is authenticated: `supabase login`.
2. Push the schema to production: `supabase db push`.
3. Verify the logs to ensure no conflicts or locking issues occurred.
4. (Optional) Run `supabase db lint` to continuously check for index and security optimizations.
