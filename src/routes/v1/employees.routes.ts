import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireManager } from '../../utils/auth.js';
import { EmployeeService } from '../../services/employee.service.js';
import { EmployeeRepository } from '../../services/repositories/employee.repository.js';

export default async function employeeRoutes(fastify: FastifyInstance) {
  const updateMappingSchema = z.object({
    microsoft_id: z.string().uuid().nullable().optional(), // Must be a valid UUID (Entra Object ID)
    clickup_id: z.string().nullable().optional()
  });

  fastify.post(
    '/:employeeId/mapping',
    { preValidation: [authenticate, requireManager] },
    async (request, reply) => {
      const { employeeId } = request.params as { employeeId: string };

      const parseResult = updateMappingSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
      }

      const { microsoft_id, clickup_id } = parseResult.data;

      // Basic org scoping for managers (assuming requireManager is used, the admin/manager
      // can only update employees in their own org unless they are ADMIN)
      const employee = await EmployeeRepository.findById(employeeId);
      if (!employee) {
        return reply.code(404).send({ error: 'Not Found', message: 'Employee not found' });
      }

      const { userContext } = request;
      if (userContext.role !== 'ADMIN' && employee.org_id !== userContext.orgId) {
        return reply
          .code(403)
          .send({ error: 'Forbidden', message: 'Cannot modify employee in another organization' });
      }

      try {
        const updatedEmployee = await EmployeeService.mapIdentity(
          employeeId,
          microsoft_id !== undefined ? microsoft_id : employee.microsoft_id,
          clickup_id !== undefined ? clickup_id : employee.clickup_id,
          userContext.userId
        );

        return { employee: updatedEmployee };
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('already exists')) {
          return reply.code(409).send({ error: 'Conflict', message: error.message });
        }
        throw error;
      }
    }
  );
}
