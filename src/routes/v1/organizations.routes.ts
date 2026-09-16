import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OrganizationRepository } from '../../services/repositories/organization.repository.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { logger } from '../../utils/logger.js';

export default async function organizationRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  const orgSettingsSchema = z.object({
    morning_notification_enabled: z.boolean().optional(),
    morning_notification_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
      .optional(),
    evening_notification_enabled: z.boolean().optional(),
    evening_notification_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
      .optional(),
    timezone: z.string().optional()
  });

  fastify.get('/:id/settings', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Auth check: User must belong to this org
    if (request.user?.orgId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      const org = await OrganizationRepository.findById(id);
      if (!org) {
        return reply.code(404).send({ error: 'Organization not found' });
      }

      return reply.send({
        id: org.id,
        morning_notification_enabled: org.morning_notification_enabled,
        morning_notification_time: org.morning_notification_time,
        evening_notification_enabled: org.evening_notification_enabled,
        evening_notification_time: org.evening_notification_time,
        timezone: org.timezone
      });
    } catch (error: unknown) {
      logger.error({ error: (error as Error).message }, 'Failed to fetch organization settings');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.patch('/:id/settings', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (request.user?.orgId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Auth check: Only Managers and Admins can update settings
    if (request.user?.role !== 'ADMIN' && request.user?.role !== 'MANAGER') {
      return reply.code(403).send({ error: 'Forbidden: Insufficient permissions' });
    }

    const parseResult = orgSettingsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
    }

    try {
      const updatedOrg = await OrganizationRepository.updateSettings(id, parseResult.data);
      return reply.send(updatedOrg);
    } catch (error: unknown) {
      logger.error({ error: (error as Error).message }, 'Failed to update organization settings');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
