# Authentication & Authorization

TaskFlow utilizes a strict backend-authoritative approach to identity and permissions.

## JWT Strategy (Temporary Local Auth)
Currently, in Phase 3, authentication is handled via a local JWT issuer (`/api/v1/auth/login`).
1. The user provides an email.
2. The `users` table is queried.
3. If found, a JWT is issued. **Crucially, this JWT only contains `{ id: userId }`.**

No roles, organization IDs, or employee mappings are stored in the token. This prevents any form of client-side role escalation or spoofing.

## Request Context & Middleware
The `auth.middleware.ts` intercepts requests to protected routes.
1. Validates the JWT signature.
2. Extracts the `userId`.
3. Queries the database (`users` and `employees` tables).
4. Populates `request.userContext` with immutable, database-verified attributes:
   - `userId`
   - `orgId`
   - `role` (`ADMIN`, `MANAGER`, `EMPLOYEE`)
   - `employeeId`

## RBAC Guards (Role-Based Access Control)
In `src/utils/auth.ts`, we provide Fastify preValidation guards:

- `requireAdmin`: strictly requires the `ADMIN` role.
- `requireManager`: strictly requires the `MANAGER` or `ADMIN` role.
- `requireEmployeeSelfOrManager`: ABAC-style guard ensuring an employee can only access resources belonging to their own `employeeId`, while managers/admins have broader access.

**Usage Example:**
```typescript
fastify.get(
  '/api/v1/some-secure-data',
  { preValidation: [authenticate, requireManager] },
  async (request, reply) => {
    // Only accessible if verified as MANAGER or ADMIN
  }
);
```
