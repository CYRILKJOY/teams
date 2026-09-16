import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Environment Variables', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should parse valid environment variables', async () => {
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    const { env } = await import('../src/config/env.js');

    expect(env.PORT).toBe('4000');
    expect(env.NODE_ENV).toBe('test');
    expect(env.JWT_SECRET).toBe('test-secret');
    expect(env.SUPABASE_URL).toBe('https://test.supabase.co');
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('test-key');
  });
});
