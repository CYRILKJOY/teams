import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import crypto from 'crypto';
import fastifyRawBody from 'fastify-raw-body';

// Mock env.js
vi.mock('../../src/config/env.js', () => ({
  env: {
    PORT: '3000',
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    CLICKUP_WEBHOOK_SECRET: 'test-webhook-secret',
    CLICKUP_API_TOKEN: 'test-api-token'
  }
}));

import clickUpWebhookRoutes from '../../src/routes/v1/webhooks/clickup.routes.js';
import { IntegrationEventRepository } from '../../src/services/repositories/integration-event.repository.js';
import { WebhookProcessor } from '../../src/services/clickup/webhook-processor.js';

vi.mock('../../src/services/repositories/integration-event.repository.js');
vi.mock('../../src/services/clickup/webhook-processor.js');

const buildApp = () => {
  const app = Fastify();
  app.register(fastifyRawBody, { field: 'rawBody', encoding: 'utf8' });
  app.register(clickUpWebhookRoutes);
  return app;
};

describe('ClickUp Webhook Routes', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();

    vi.mocked(IntegrationEventRepository.registerEvent).mockResolvedValue({
      id: 'event-1',
      source: 'clickup',
      event_type: '',
      idempotency_key: '',
      payload: {},
      created_at: '',
      processed_at: null
    });
    vi.mocked(IntegrationEventRepository.markProcessed).mockResolvedValue(undefined);
    vi.mocked(WebhookProcessor.processTaskEvent).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const generateSignature = (payload: Record<string, unknown>, secret = 'test-webhook-secret') => {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  };

  it('should reject requests missing signature', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/clickup',
      payload: { event: 'taskCreated', webhook_id: 'w1', task_id: 't1' }
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject requests with invalid signature', async () => {
    const payload = { event: 'taskCreated', webhook_id: 'w1', task_id: 't1' };
    const response = await app.inject({
      method: 'POST',
      url: '/clickup',
      headers: { 'x-signature': 'invalid-hash' },
      payload
    });

    expect(response.statusCode).toBe(401);
  });

  it('should accept valid signature and process event', async () => {
    const payload = { event: 'taskCreated', webhook_id: 'w1', task_id: 't1' };
    const signature = generateSignature(payload);

    const response = await app.inject({
      method: 'POST',
      url: '/clickup',
      headers: { 'x-signature': signature },
      payload
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'success' });
    expect(IntegrationEventRepository.registerEvent).toHaveBeenCalled();
    expect(WebhookProcessor.processTaskEvent).toHaveBeenCalledWith('t1', 'taskCreated');
    expect(IntegrationEventRepository.markProcessed).toHaveBeenCalledWith('event-1');
  });

  it('should ignore duplicate events based on idempotency', async () => {
    vi.mocked(IntegrationEventRepository.registerEvent).mockResolvedValue(null); // Simulate constraint violation

    const payload = { event: 'taskCreated', webhook_id: 'w1', task_id: 't1' };
    const signature = generateSignature(payload);

    const response = await app.inject({
      method: 'POST',
      url: '/clickup',
      headers: { 'x-signature': signature },
      payload
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ignored_duplicate' });
    expect(WebhookProcessor.processTaskEvent).not.toHaveBeenCalled();
  });

  it('should naturally handle out of order webhooks by fetching latest state', async () => {
    const payload = { event: 'taskUpdated', webhook_id: 'w1', task_id: 't1' };
    const signature = generateSignature(payload);

    const response = await app.inject({
      method: 'POST',
      url: '/clickup',
      headers: { 'x-signature': signature },
      payload
    });

    expect(response.statusCode).toBe(200);
    expect(WebhookProcessor.processTaskEvent).toHaveBeenCalledWith('t1', 'taskUpdated');
    // The processor fetches the latest state and upserts it, inherently resolving out-of-order anomalies
  });

  it('should bubble up 500 when processor fails (so ClickUp retries later)', async () => {
    vi.mocked(WebhookProcessor.processTaskEvent).mockRejectedValue(
      new Error('ClickUp API Timeout')
    );

    const payload = { event: 'taskCreated', webhook_id: 'w1', task_id: 't1' };
    const signature = generateSignature(payload);

    const response = await app.inject({
      method: 'POST',
      url: '/clickup',
      headers: { 'x-signature': signature },
      payload
    });

    expect(response.statusCode).toBe(500);
    expect(IntegrationEventRepository.markProcessed).not.toHaveBeenCalled();
  });
});
