import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRepository } from '../../services/repositories/user.repository.js';
import { authenticate } from '../../middleware/auth.middleware.js';

import bcrypt from 'bcrypt';

export default async function authRoutes(fastify: FastifyInstance) {
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', issues: parseResult.error.format() });
    }

    const { email, password } = parseResult.data;

    const user = await UserRepository.findByEmail(email);

    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    // Verify password securely
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    // Only issue the immutable user ID. Roles/orgs are NOT placed in the token payload.
    const token = fastify.jwt.sign({ id: user.id }, { expiresIn: '8h' });

    // Ensure we do not leak the password hash in the response
    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      org_id: user.org_id
    };

    return { token, user: safeUser };
  });

  // Example protected route for testing
  fastify.get('/me', { preValidation: [authenticate] }, async (request) => {
    return { userContext: request.userContext };
  });
}
