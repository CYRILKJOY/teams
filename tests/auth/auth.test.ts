import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';

// Mock env.js before it's imported by repositories
vi.mock('../../src/config/env.js', () => ({
  env: {
    PORT: '3000',
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test'
  }
}));

import { authenticate } from '../../src/middleware/auth.middleware.js';
import {
  requireAdmin,
  requireManager,
  requireEmployeeSelfOrManager
} from '../../src/utils/auth.js';
import { UserRepository } from '../../src/services/repositories/user.repository.js';
import { EmployeeRepository } from '../../src/services/repositories/employee.repository.js';

// Mock repositories
vi.mock('../../src/services/repositories/user.repository.js');
vi.mock('../../src/services/repositories/employee.repository.js');

const buildApp = () => {
  const app = Fastify();
  app.register(fastifyJwt, { secret: 'test-secret' });

  // Test routes
  app.get('/protected', { preValidation: [authenticate] }, async (req) => req.userContext);
  app.get('/admin', { preValidation: [authenticate, requireAdmin] }, async () => ({ ok: true }));
  app.get('/manager', { preValidation: [authenticate, requireManager] }, async () => ({
    ok: true
  }));
  app.get(
    '/employee/:employeeId',
    { preValidation: [authenticate, requireEmployeeSelfOrManager] },
    async () => ({ ok: true })
  );

  return app;
};

describe('Authentication & Authorization', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockUser = (role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE', id = 'user-123') => {
    vi.mocked(UserRepository.findById).mockResolvedValue({
      id,
      org_id: 'org-1',
      role,
      email: 'test@acme.com',
      password_hash: 'mock-hash',
      created_at: '',
      updated_at: ''
    });
    vi.mocked(EmployeeRepository.findByUserId).mockResolvedValue({
      id: `emp-${id}`,
      user_id: id,
      org_id: 'org-1',
      display_name: 'Test',
      email: 'test@acme.com',
      microsoft_id: '',
      clickup_id: '',
      created_at: '',
      updated_at: ''
    });
    vi.mocked(EmployeeRepository.findById).mockImplementation(async (empId: string) => ({
      id: empId,
      user_id: id,
      org_id: empId === 'emp-other-org' ? 'org-2' : 'org-1',
      display_name: 'Test',
      email: 'test@acme.com',
      microsoft_id: '',
      clickup_id: '',
      created_at: '',
      updated_at: ''
    }));
  };

  it('should reject unauthenticated requests', async () => {
    const response = await app.inject({ method: 'GET', url: '/protected' });
    expect(response.statusCode).toBe(401);
  });

  it('should authenticate valid token and populate context', async () => {
    mockUser('EMPLOYEE');
    const token = app.jwt.sign({ id: 'user-123', role: 'ADMIN' }); // Malicious client tries to escalate

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    const context = response.json();
    expect(context.role).toBe('EMPLOYEE'); // Backend source of truth
    expect(context.employeeId).toBe('emp-user-123');
  });

  it('should allow EMPLOYEE to access own data', async () => {
    mockUser('EMPLOYEE');
    const token = app.jwt.sign({ id: 'user-123' });
    const res = await app.inject({
      method: 'GET',
      url: '/employee/emp-user-123',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.statusCode).toBe(200);
  });

  it('should forbid EMPLOYEE from accessing another employee data', async () => {
    mockUser('EMPLOYEE');
    const token = app.jwt.sign({ id: 'user-123' });
    const res = await app.inject({
      method: 'GET',
      url: '/employee/emp-other',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.statusCode).toBe(403);
  });

  it('should allow MANAGER to access employee data in same org', async () => {
    mockUser('MANAGER');
    const token = app.jwt.sign({ id: 'user-manager' });
    const res = await app.inject({
      method: 'GET',
      url: '/employee/emp-other',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.statusCode).toBe(200);
  });

  it('should forbid MANAGER from accessing employee data in another org', async () => {
    mockUser('MANAGER');
    const token = app.jwt.sign({ id: 'user-manager' });
    const res = await app.inject({
      method: 'GET',
      url: '/employee/emp-other-org',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.statusCode).toBe(403);
  });

  it('should forbid MANAGER from accessing ADMIN routes', async () => {
    mockUser('MANAGER');
    const token = app.jwt.sign({ id: 'user-manager' });
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.statusCode).toBe(403);
  });

  it('should allow ADMIN to access everything', async () => {
    mockUser('ADMIN');
    const token = app.jwt.sign({ id: 'user-admin' });

    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/admin',
          headers: { authorization: `Bearer ${token}` }
        })
      ).statusCode
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/manager',
          headers: { authorization: `Bearer ${token}` }
        })
      ).statusCode
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/employee/emp-other',
          headers: { authorization: `Bearer ${token}` }
        })
      ).statusCode
    ).toBe(200);
  });
});
