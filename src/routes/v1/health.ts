import { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/ready', async (request, reply) => {
    try {
      const { supabase } = await import('../../services/supabase.js');
      // A simple lightweight query to verify the database pool/connection is alive
      const { error } = await supabase.from('users').select('id').limit(1);

      if (error) {
        request.log.error({ error }, 'Readiness check failed');
        return reply.code(503).send({
          status: 'unavailable',
          error: 'Database connection failed',
          timestamp: new Date().toISOString()
        });
      }

      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (err: unknown) {
      request.log.error({ err }, 'Readiness check encountered an exception');
      return reply.code(503).send({
        status: 'unavailable',
        error: 'Internal readiness failure',
        timestamp: new Date().toISOString()
      });
    }
  });
}
