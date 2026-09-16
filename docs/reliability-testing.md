# TaskFlow Reliability & Resilience

This document outlines the failure and recovery behaviors implemented across TaskFlow to ensure robust operation in production environments.

## Integration Resiliency

### 1. ClickUp Integration
- **Unavailable / Timeout:** The backend employs strict timeouts (10 seconds) for `fetch` requests via `AbortSignal`. If ClickUp is unresponsive, the fetch aborts, and the background processor gracefully fails, sending an HTTP 500 status to the webhook sender (so ClickUp naturally re-queues and retries the webhook delivery later).
- **Rate Limiting (HTTP 429):** The `ClickUpClient` specifically detects HTTP 429 status codes. It parses the `X-RateLimit-Reset` header and automatically delays further execution using an exponential backoff sleep mechanism (up to a configured maximum attempt limit) before retrying.
- **Out-of-Order Webhooks:** By design, the TaskFlow backend treats all ClickUp webhooks strictly as trigger signals. Upon receiving a webhook (whether `taskCreated` or `taskUpdated`), TaskFlow fetches the absolute latest task representation directly from ClickUp. This ensures that even if webhooks arrive out of sequence, the task in the database invariably converges strictly to the most current state without any data corruption.
- **Duplicate Webhooks:** ClickUp webhook deliveries enforce a unique idempotency key logic via the `integration_events` table (e.g. `clickup:webhook:event:taskId`). Repeated webhook payloads are safely acknowledged with `200 OK (ignored_duplicate)` but functionally ignored.

### 2. Microsoft Teams Integration
- **Unavailable / Workflow Failure:** Outbound Microsoft Teams Adaptive Cards execute via an HTTP Post to the Power Automate webhook. If this webhook is unreachable or fails repeatedly, the internal notification state is marked `FAILED`.
- **Automatic Retries:** The system operates a background worker (`NotificationService.retryFailedNotifications`) scheduled continually. This worker identifies `FAILED` notifications and meticulously attempts re-delivery. Notifications will be attempted up to a strict limit (e.g., 3 attempts) to prevent permanent retry loops for truly unrecoverable errors.
- **Malformed Responses / Rate Limits:** Just like ClickUp, the Teams client employs exponential backoff. It reads the `Retry-After` header when receiving HTTP 429 rate limit responses and suspends execution prior to resuming.

## System Internals

### 1. Database & Consistency
- **Unavailability:** If Supabase is utterly unavailable, standard backend requests naturally fail. The Node.js application is entirely stateless. Once the database recovers, all operations (and pending retries) seamlessly resume.
- **Race Conditions (Duplicate Schedules):** The `SchedulerService` creates daily morning/evening review notifications. To prevent duplicate scheduled executions in a clustered backend environment, a robust `UNIQUE INDEX` dictates strict idempotency at the database layer (preventing more than one specific review type per employee per day). Colliding requests safely ignore the constraint violation.

### 2. Workflows & State
- **Expired Acknowledgements:** The Teams Adaptive Cards feature an acknowledgement system. If an employee interacts with an Adaptive Card after a task has been closed or the notification is otherwise stale, the backend explicitly rejects the update. Additionally, an asynchronous sweeper job (`NotificationService.expireOldNotifications()`) transitions aging records to an `EXPIRED` terminal state, assuring safe closures.
- **Disabled/Removed Employees:** When an employee is eliminated from a system or loses their identity mappings (i.e. `microsoft_id` is nulled), the notification service gracefully detects the missing prerequisite state, aborts the notification attempt safely, and avoids polluting error logs. 

All of these behaviors are covered comprehensively by the automated test suite.
