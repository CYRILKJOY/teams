import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { EmployeeService } from '../../src/services/employee.service.js';
import { EmployeeRepository } from '../../src/services/repositories/employee.repository.js';
import { AuditLogRepository } from '../../src/services/repositories/audit-log.repository.js';
import employeeRoutes from '../../src/routes/v1/employees.routes.js';

vi.mock('../../src/config/env.js', () => ({
  env: {
    PORT: '3000',
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test'
  }
}));

vi.mock('../../src/services/repositories/employee.repository.js');
vi.mock('../../src/services/repositories/audit-log.repository.js');

// Mock auth middleware to bypass real JWT checking and inject user context
vi.mock('../../src/middleware/auth.middleware.js', () => ({
  authenticate: vi.fn(async (request) => {
    // We'll set this dynamically in tests
    if (request.headers.authorization === 'Bearer admin') {
      request.userContext = { userId: 'admin1', orgId: 'org1', role: 'ADMIN' };
    } else if (request.headers.authorization === 'Bearer manager1') {
      request.userContext = { userId: 'manager1', orgId: 'org1', role: 'MANAGER' };
    } else if (request.headers.authorization === 'Bearer manager2') {
      request.userContext = { userId: 'manager2', orgId: 'org2', role: 'MANAGER' }; // Different org
    } else if (request.headers.authorization === 'Bearer emp1') {
      request.userContext = { userId: 'emp1', orgId: 'org1', role: 'EMPLOYEE' };
    } else {
      throw new Error('Unauthorized');
    }
  })
}));

const buildApp = () => {
  const app = Fastify();
  app.register(employeeRoutes);

  // Custom error handler for consistent testing
  app.setErrorHandler((error, request, reply) => {
    if (error.message === 'Unauthorized') {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    reply.code(error.statusCode || 500).send({ error: error.message });
  });

  return app;
};

describe('Identity Mapping and Verification', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
    vi.clearAllMocks();

    const mockEmployee = {
      id: 'emp123',
      org_id: 'org1',
      user_id: 'u1',
      microsoft_id: null,
      clickup_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    vi.mocked(EmployeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(EmployeeRepository.updateMapping).mockResolvedValue({
      ...mockEmployee,
      microsoft_id: 'a324835a-ec75-430c-ab23-1d2a13cc7704',
      clickup_id: 'c1'
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(AuditLogRepository.log).mockResolvedValue({ id: 'log1' } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('EmployeeService.verifyIdentity', () => {
    it('should resolve identity successfully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(EmployeeRepository.findByMicrosoftId).mockResolvedValue({ id: 'emp123' } as any);

      const emp = await EmployeeService.verifyIdentity('a324835a-ec75-430c-ab23-1d2a13cc7704');
      expect(emp.id).toBe('emp123');
    });

    it('should throw if Microsoft ID is unmapped (unknown user)', async () => {
      vi.mocked(EmployeeRepository.findByMicrosoftId).mockResolvedValue(null);

      await expect(EmployeeService.verifyIdentity('unknown')).rejects.toThrow(
        'Unmapped Microsoft identity'
      );
    });
  });

  describe('API: POST /:employeeId/mapping', () => {
    it('should reject unauthorized requests', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/emp123/mapping',
        payload: { microsoft_id: 'a324835a-ec75-430c-ab23-1d2a13cc7704' }
      });
      expect(res.statusCode).toBe(401);
    });

    it('should reject EMPLOYEE role (RBAC)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/emp123/mapping',
        headers: { authorization: 'Bearer emp1' },
        payload: { microsoft_id: 'a324835a-ec75-430c-ab23-1d2a13cc7704' }
      });
      // requireManager throws a generic 403 or specific error, depending on utils/auth.ts implementation
      // utils/auth.ts sends 403
      expect(res.statusCode).toBe(403);
    });

    it('should reject manager trying to update employee in different organization', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/emp123/mapping',
        headers: { authorization: 'Bearer manager2' }, // org2, but employee is org1
        payload: { microsoft_id: 'a324835a-ec75-430c-ab23-1d2a13cc7704' }
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain('another organization');
    });

    it('should allow valid mapping by manager in same org', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/emp123/mapping',
        headers: { authorization: 'Bearer manager1' },
        payload: { microsoft_id: 'a324835a-ec75-430c-ab23-1d2a13cc7704', clickup_id: 'c1' }
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().employee.microsoft_id).toBe('a324835a-ec75-430c-ab23-1d2a13cc7704');

      // Verify audit log was created
      expect(AuditLogRepository.log).toHaveBeenCalledWith(
        'org1',
        'UPDATE_IDENTITY_MAPPING',
        'employee',
        'emp123',
        'manager1',
        expect.any(Object)
      );
    });

    it('should reject invalid UUIDs for microsoft_id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/emp123/mapping',
        headers: { authorization: 'Bearer manager1' },
        payload: { microsoft_id: 'invalid-uuid' }
      });

      expect(res.statusCode).toBe(400); // Zod validation fails
    });

    it('should handle duplicate mapping gracefully', async () => {
      vi.mocked(EmployeeRepository.updateMapping).mockRejectedValue(
        new Error('Identity mapping already exists for another employee')
      );

      const res = await app.inject({
        method: 'POST',
        url: '/emp123/mapping',
        headers: { authorization: 'Bearer manager1' },
        payload: { microsoft_id: 'a324835a-ec75-430c-ab23-1d2a13cc7704' }
      });

      expect(res.statusCode).toBe(409); // Conflict
      expect(res.json().message).toBe('Identity mapping already exists for another employee');
    });
  });
});
