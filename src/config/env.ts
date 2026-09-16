import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  CLICKUP_API_TOKEN: z.string().optional(),
  CLICKUP_WEBHOOK_SECRET: z.string().optional(),
  TEAMS_WEBHOOK_URL: z.string().url().optional(),
  TEAMS_INBOUND_WEBHOOK_SECRET: z.string().optional()
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:', parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;
