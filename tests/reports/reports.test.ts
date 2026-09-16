import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportRepository } from '../../src/services/repositories/report.repository.js';
import { supabase } from '../../src/services/supabase.js';

vi.mock('../../src/services/supabase.js', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    PORT: 3000
  }
}));

describe('ReportRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAcknowledgementRate', () => {
    it('calculates the acknowledgement rate correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) =>
          resolve({
            data: [
              { delivery_state: 'ACKNOWLEDGED' },
              { delivery_state: 'ACKNOWLEDGED' },
              { delivery_state: 'SENT' },
              { delivery_state: 'EXPIRED' }
            ],
            error: null
          })
      };

      vi.mocked(supabase.from).mockReturnValue(
        mockQuery as unknown as ReturnType<typeof supabase.from>
      );

      const result = await ReportRepository.getAcknowledgementRate('org1', {});

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(result.total).toBe(4);
      expect(result.acknowledged).toBe(2);
      expect(result.rate).toBe(50);
    });

    it('handles zero notifications', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) =>
          resolve({
            data: [],
            error: null
          })
      };

      vi.mocked(supabase.from).mockReturnValue(
        mockQuery as unknown as ReturnType<typeof supabase.from>
      );

      const result = await ReportRepository.getAcknowledgementRate('org1', {});
      expect(result.rate).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getReviewCompletion', () => {
    it('aggregates morning and evening reviews correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) =>
          resolve({
            data: [{ type: 'MORNING' }, { type: 'MORNING' }, { type: 'EVENING' }],
            error: null
          })
      };

      vi.mocked(supabase.from).mockReturnValue(
        mockQuery as unknown as ReturnType<typeof supabase.from>
      );

      const result = await ReportRepository.getReviewCompletion('org1', {});
      expect(result.morningCount).toBe(2);
      expect(result.eveningCount).toBe(1);
      expect(result.total).toBe(3);
    });
  });
});
