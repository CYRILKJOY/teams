import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Ensures the requester is an ADMIN.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (request.userContext?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden', message: 'Admin role required' });
  }
}

/**
 * Ensures the requester is a MANAGER or ADMIN.
 */
export async function requireManager(request: FastifyRequest, reply: FastifyReply) {
  if (request.userContext?.role !== 'MANAGER' && request.userContext?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden', message: 'Manager role required' });
  }
}

/**
 * Ensures the requester is either:
 * - The employee themselves
 * - A manager in the same organization
 * - An admin
 */
export async function requireEmployeeSelfOrManager(
  request: FastifyRequest<{ Params: { employeeId: string } }>,
  reply: FastifyReply
) {
  const { userContext } = request;
  const targetEmployeeId = request.params.employeeId;

  if (!userContext) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (userContext.role === 'ADMIN') {
    return; // Admins can access anything
  }

  if (userContext.role === 'MANAGER') {
    const { EmployeeRepository } = await import('../services/repositories/employee.repository.js');
    const targetEmployee = await EmployeeRepository.findById(targetEmployeeId);

    if (!targetEmployee || targetEmployee.org_id !== userContext.orgId) {
      return reply
        .code(403)
        .send({ error: 'Forbidden', message: 'Cannot access employee from another organization' });
    }
    return;
  }

  // If role is EMPLOYEE, they can only access their own data
  if (userContext.role === 'EMPLOYEE') {
    if (userContext.employeeId !== targetEmployeeId) {
      return reply
        .code(403)
        .send({ error: 'Forbidden', message: 'Cannot access another employee data' });
    }
  }
}
