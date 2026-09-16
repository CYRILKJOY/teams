# TaskFlow Architecture

TaskFlow is a modular monolith designed to securely sync ClickUp tasks and facilitate communication/acknowledgement via Microsoft Teams.

## Components

1. **Fastify Web Server**: Handles incoming HTTP requests, webhooks, and API routes.
2. **Supabase PostgreSQL**: Persistent storage for all entities, mapping relationships, and audit logs.
3. **ClickUp Integration Layer (Phase 3)**: Syncs ClickUp workspaces and tasks via Webhooks and API polling where necessary.
4. **Microsoft Teams Layer (Phase 4)**: Maps identities and orchestrates interactive messages (Adaptive Cards/Bot Framework).
5. **Scheduler (Phase 5)**: Manages morning and evening review cadences.
6. **Frontend Web App (Phase 6)**: Dashboard for Managers and Employees.

## Directory Structure

- `src/config/`: Environment loading and global configurations.
- `src/routes/`: Fastify HTTP route definitions (`/api/v1`).
- `src/controllers/`: HTTP request/response handlers.
- `src/services/`: Core business logic and database interactions.
- `src/middleware/`: Fastify hooks for auth, validation, etc.
- `src/utils/`: Shared utilities (logger, error handlers).

## Error Handling

Centralized error handling ensures all uncaught exceptions or specific domain errors are correctly mapped to HTTP status codes and logged appropriately using Pino.

## Security

- Structured Pino logs do not contain sensitive secrets.
- Zod is used for all runtime type validation.
- Standard security headers (Helmet), Rate Limiting, and CORS are enforced at the Fastify level.
