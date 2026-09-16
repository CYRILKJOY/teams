import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireManager } from '../../utils/auth.js';
import { ReportRepository, ReportFilters } from '../../services/repositories/report.repository.js';

export default async function reportsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);
  fastify.addHook('onRequest', requireManager);

  const filterSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    employeeId: z.string().uuid().optional()
  });

  fastify.get('/acknowledgements', async (request, reply) => {
    const parseResult = filterSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
    }

    const filters = parseResult.data as ReportFilters;
    const { userContext } = request;

    try {
      const data = await ReportRepository.getAcknowledgementRate(userContext.orgId, filters);
      return data;
    } catch (error: unknown) {
      request.log.error(
        { error: (error as Error).message },
        'Failed to generate acknowledgement report'
      );
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/unacknowledged', async (request, reply) => {
    const parseResult = filterSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
    }

    const filters = parseResult.data as ReportFilters;
    const { userContext } = request;

    try {
      const data = await ReportRepository.getUnacknowledgedTasks(userContext.orgId, filters);
      return data;
    } catch (error: unknown) {
      request.log.error(
        { error: (error as Error).message },
        'Failed to generate unacknowledged tasks report'
      );
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/reviews', async (request, reply) => {
    const parseResult = filterSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
    }

    const filters = parseResult.data as ReportFilters;
    const { userContext } = request;

    try {
      const data = await ReportRepository.getReviewCompletion(userContext.orgId, filters);
      return data;
    } catch (error: unknown) {
      request.log.error(
        { error: (error as Error).message },
        'Failed to generate review completion report'
      );
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/blockers', async (request, reply) => {
    const parseResult = filterSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
    }

    const filters = parseResult.data as ReportFilters;
    const { userContext } = request;

    try {
      const data = await ReportRepository.getBlockers(userContext.orgId, filters);
      return data;
    } catch (error: unknown) {
      request.log.error({ error: (error as Error).message }, 'Failed to generate blockers report');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/trends', async (request, reply) => {
    const schema = z.object({
      days: z.string().regex(/^\d+$/).transform(Number).optional().default(7)
    });
    const parseResult = schema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
    }

    const { userContext } = request;

    try {
      const data = await ReportRepository.getTaskCompletionTrends(
        userContext.orgId,
        parseResult.data.days
      );
      return data;
    } catch (error: unknown) {
      request.log.error(
        { error: (error as Error).message },
        'Failed to generate task trends report'
      );
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
