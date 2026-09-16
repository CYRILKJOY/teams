import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class ClickUpClient {
  private static readonly BASE_URL = 'https://api.clickup.com/api/v2';
  private static readonly MAX_RETRIES = 3;

  private static async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static async fetchWithRetry(
    endpoint: string,
    options: RequestInit = {},
    attempt = 1
  ): Promise<Record<string, unknown>> {
    const url = `${this.BASE_URL}${endpoint}`;

    if (!env.CLICKUP_API_TOKEN) {
      throw new Error('CLICKUP_API_TOKEN is not configured');
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: env.CLICKUP_API_TOKEN,
      ...options.headers
    };

    logger.debug({ url, attempt }, 'Calling ClickUp API');

    try {
      // Add a 10s timeout to prevent hanging webhook processors
      const signal = AbortSignal.timeout(10000);
      const response = await fetch(url, { ...options, headers, signal });

      if (response.status === 429) {
        if (attempt > this.MAX_RETRIES) {
          logger.error({ url, attempt }, 'Max retries exceeded for ClickUp API');
          throw new Error('ClickUp API Rate Limit Exceeded');
        }

        // ClickUp uses X-RateLimit-Reset (Unix timestamp in seconds)
        const resetAt = response.headers.get('X-RateLimit-Reset');
        let waitMs = 5000; // Default 5s fallback

        if (resetAt) {
          const resetTime = parseInt(resetAt, 10) * 1000;
          waitMs = Math.max(resetTime - Date.now(), 1000); // Wait at least 1s
        }

        logger.warn({ url, waitMs, attempt }, 'Rate limited by ClickUp, waiting...');
        await this.sleep(waitMs);
        return this.fetchWithRetry(endpoint, options, attempt + 1);
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ url, status: response.status, errorText }, 'ClickUp API Error');
        throw new Error(`ClickUp API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (
        attempt <= this.MAX_RETRIES &&
        (error instanceof TypeError || (error as Error).message.includes('fetch'))
      ) {
        // Network errors
        const waitMs = Math.pow(2, attempt) * 1000;
        logger.warn(
          { url, waitMs, attempt, error: (error as Error).message },
          'Network error, retrying...'
        );
        await this.sleep(waitMs);
        return this.fetchWithRetry(endpoint, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Fetches the complete task data.
   */
  static async getTask(taskId: string): Promise<Record<string, unknown>> {
    // ClickUp API sometimes includes a hash in the task ID, but the actual ID is just the alphanumeric part
    const cleanId = taskId.replace(/^#/, '');
    return this.fetchWithRetry(`/task/${cleanId}`);
  }
}
