import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRepository } from '../services/repositories/user.repository.js';
import { EmployeeRepository } from '../services/repositories/employee.repository.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // fastify-jwt decorator validates the Authorization header
    await request.jwtVerify();

    // The payload only contains { id: userId }
    const payload = request.user as unknown as { id: string };

    if (!payload || !payload.id) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token payload' });
    }

    // Backend dictates authorization from identity, NEVER from client claims
    const user = await UserRepository.findById(payload.id);
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'User not found' });
    }

    // Look up mapped employee (may be null for some admin users)
    let employeeId: string | undefined;

    // We don't have a direct findByUserId in EmployeeRepository yet, let's implement it or query directly.
    // Assuming EmployeeRepository will have it.
    const employee = await EmployeeRepository.findByUserId(user.id);
    if (employee) {
      employeeId = employee.id;
    }

    // Populate the secure context
    request.userContext = {
      userId: user.id,
      orgId: user.org_id,
      role: user.role,
      employeeId
    };
  } catch {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication failed' });
  }
}
