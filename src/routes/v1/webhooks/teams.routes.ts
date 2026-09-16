import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import { AcknowledgementService } from '../../../services/acknowledgement.service.js';

import { DailyReviewService } from '../../../services/daily-review.service.js';
import { NotificationRepository } from '../../../services/repositories/notification.repository.js';

export default async function teamsWebhookRoutes(fastify: FastifyInstance) {
  // Schema for the incoming webhook payload from Power Automate
  const acknowledgementSchema = z.object({
    microsoft_id: z.string().uuid(),
    notification_id: z.string().uuid(),
    response: z.string()
  });

  fastify.post('/acknowledgement', async (request, reply) => {
    // Validate Webhook Secret
    if (!env.TEAMS_INBOUND_WEBHOOK_SECRET) {
      logger.error('TEAMS_INBOUND_WEBHOOK_SECRET is not configured');
      return reply.code(500).send({ error: 'Server configuration error' });
    }

    const authHeader = request.headers.authorization;
    const expectedHeader = `Bearer ${env.TEAMS_INBOUND_WEBHOOK_SECRET}`;

    if (!authHeader) {
      logger.warn('Unauthorized Teams Webhook attempt (missing header)');
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const { timingSafeEqual } = await import('crypto');
      const authBuffer = Buffer.from(authHeader, 'utf8');
      const expectedBuffer = Buffer.from(expectedHeader, 'utf8');

      if (
        authBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(authBuffer, expectedBuffer)
      ) {
        logger.warn('Unauthorized Teams Webhook attempt (invalid secret)');
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    } catch {
      logger.warn('Unauthorized Teams Webhook attempt (malformed secret)');
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Validate Payload
    const parseResult = acknowledgementSchema.safeParse(request.body);
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.format() }, 'Invalid acknowledgement payload');
      return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
    }

    const { microsoft_id, notification_id, response } = parseResult.data;

    try {
      const notification = await NotificationRepository.getById(notification_id);
      if (!notification) {
        return reply.code(404).send({ error: 'Notification not found' });
      }

      if (notification.type === 'MORNING_REVIEW' || notification.type === 'EVENING_REVIEW') {
        await DailyReviewService.submitReview(microsoft_id, notification_id, response);
      } else {
        await AcknowledgementService.submitAcknowledgement(microsoft_id, notification_id, response);
      }

      return reply.code(200).send({ success: true });
    } catch (error: unknown) {
      logger.error({ error: (error as Error).message }, 'Webhook processing failed');
      // We return 400 for business logic errors to let Power Automate know it failed gracefully.
      return reply.code(400).send({ error: (error as Error).message });
    }
  });
}
