import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import teamsWebhookRoutes from '../../src/routes/v1/webhooks/teams.routes.js';

vi.mock('../../src/config/env.js', () => ({
  env: {
    TEAMS_INBOUND_WEBHOOK_SECRET: 'super-secret-key',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key'
  }
}));

import { NotificationRepository } from '../../src/services/repositories/notification.repository.js';

vi.mock('../../src/services/acknowledgement.service.js');
vi.mock('../../src/services/daily-review.service.js');
vi.mock('../../src/services/repositories/notification.repository.js');

describe('Teams Webhook Routes Security', () => {
  const buildApp = () => {
    const app = Fastify();
    app.register(teamsWebhookRoutes);
    return app;
  };

  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should reject requests without authorization header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/acknowledgement',
      payload: {
        microsoft_id: '550e8400-e29b-41d4-a716-446655440000',
        notification_id: '660e8400-e29b-41d4-a716-446655440000',
        response: 'WILL_COMPLETE'
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject requests with malformed or invalid secret (timing safe check)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/acknowledgement',
      headers: { authorization: 'Bearer WRONG-SECRET' },
      payload: {
        microsoft_id: '550e8400-e29b-41d4-a716-446655440000',
        notification_id: '660e8400-e29b-41d4-a716-446655440000',
        response: 'WILL_COMPLETE'
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it('should accept requests with the correct secret', async () => {
    vi.mocked(NotificationRepository.getById).mockResolvedValue({
      id: '660e8400-e29b-41d4-a716-446655440000',
      employee_id: 'emp-1',
      task_id: 'task-1',
      type: 'TASK_ASSIGNED',
      delivery_state: 'SENT',
      provider_message_id: null,
      correlation_id: 'c-1',
      created_at: '',
      updated_at: ''
    });

    const response = await app.inject({
      method: 'POST',
      url: '/acknowledgement',
      headers: { authorization: 'Bearer super-secret-key' },
      payload: {
        microsoft_id: '550e8400-e29b-41d4-a716-446655440000',
        notification_id: '660e8400-e29b-41d4-a716-446655440000',
        response: 'WILL_COMPLETE'
      }
    });

    expect(response.statusCode).toBe(200);
  });
});
