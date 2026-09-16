import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import { IntegrationEventRepository } from '../../../services/repositories/integration-event.repository.js';
import { WebhookProcessor } from '../../../services/clickup/webhook-processor.js';

export default async function clickUpWebhookRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/clickup',
    { config: { rawBody: true } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 1. Verify HMAC Signature
      if (!env.CLICKUP_WEBHOOK_SECRET) {
        logger.error('CLICKUP_WEBHOOK_SECRET is not configured. Rejecting webhook.');
        return reply.code(500).send({ error: 'Internal Server Error' });
      }

      const signature = request.headers['x-signature'] as string;
      if (!signature) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Missing signature' });
      }

      if (!request.rawBody) {
        return reply
          .code(500)
          .send({ error: 'Internal Server Error', message: 'Raw body not captured' });
      }

      const hash = crypto
        .createHmac('sha256', env.CLICKUP_WEBHOOK_SECRET)
        .update(request.rawBody)
        .digest('hex');

      try {
        const hashBuffer = Buffer.from(hash, 'hex');
        const signatureBuffer = Buffer.from(signature, 'hex');

        if (
          hashBuffer.length !== signatureBuffer.length ||
          !crypto.timingSafeEqual(hashBuffer, signatureBuffer)
        ) {
          logger.warn({ expected: hash, received: signature }, 'Invalid ClickUp webhook signature');
          return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid signature' });
        }
      } catch {
        logger.warn({ expected: hash, received: signature }, 'Malformed ClickUp webhook signature');
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid signature format' });
      }

      // 2. Extract Event Details
      const payload = request.body as {
        event: string;
        webhook_id: string;
        task_id: string;
        history_items?: Array<{ id: string }>;
        [key: string]: unknown;
      };

      const eventName = payload.event;
      const webhookId = payload.webhook_id;
      const taskId = payload.task_id;

      if (!eventName || !webhookId || !taskId) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid ClickUp payload' });
      }

      // We use history_items[0].id if available to make idempotency robust,
      // otherwise fallback to a combination of task_id and event.
      const historyItemId = payload.history_items?.[0]?.id || `${taskId}-${Date.now()}`;
      const idempotencyKey = `clickup:${webhookId}:${eventName}:${historyItemId}`;

      // 3. Register Event (Idempotency check)
      const eventRecord = await IntegrationEventRepository.registerEvent(
        'clickup',
        eventName,
        idempotencyKey,
        payload
      );

      if (!eventRecord) {
        logger.info({ idempotencyKey }, 'Duplicate ClickUp webhook event skipped');
        return reply.code(200).send({ status: 'ignored_duplicate' });
      }

      // 4. Acknowledge Receipt Immediately
      // Fastify handles this when we return, but we will process asynchronously
      // For a robust system, we should ideally use a message queue. Here, we process in-band but could detach.
      // We'll process synchronously for simplicity, but acknowledge quickly.

      try {
        await WebhookProcessor.processTaskEvent(taskId, eventName);
        await IntegrationEventRepository.markProcessed(eventRecord.id);

        return reply.code(200).send({ status: 'success' });
      } catch {
        logger.error({ taskId, eventName }, 'Failed to process ClickUp webhook');
        // We still return 200 to ClickUp so it doesn't retry infinitely if our business logic fails,
        // or we could return 500 to let it retry if it's a network issue.
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    }
  );
}
