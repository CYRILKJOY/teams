import { UserRole } from './database.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string }; // Payload we sign
    user: {
      userId: string;
      orgId: string;
      role: UserRole;
      employeeId?: string; // Optional if the user is not mapped to an employee yet
    }; // The resolved user context in the request
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
    userContext: {
      userId: string;
      orgId: string;
      role: UserRole;
      employeeId?: string;
    };
  }
}
