import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class TeamsClient {
  private static readonly MAX_RETRIES = 3;

  private static async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Dispatches an Adaptive Card to the Power Automate webhook.
   * Includes exponential backoff for transient failures (e.g. 429).
   */
  static async sendNotification(
    microsoftId: string,
    cardPayload: Record<string, unknown>,
    attempt = 1
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!env.TEAMS_WEBHOOK_URL) {
      logger.warn('TEAMS_WEBHOOK_URL is not configured. Skipping delivery.');
      return { success: false, error: 'Webhook URL not configured' };
    }

    const payload = {
      user: microsoftId,
      card: cardPayload
    };

    logger.debug({ microsoftId, attempt }, 'Sending Teams notification via Webhook');

    try {
      const response = await fetch(env.TEAMS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        if (attempt >= this.MAX_RETRIES) {
          logger.error({ microsoftId }, 'Max retries exceeded for Teams delivery (Rate Limit)');
          return { success: false, error: 'Rate limit exceeded after retries' };
        }

        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 2000;

        logger.warn({ microsoftId, waitMs, attempt }, 'Rate limited by Teams Webhook, waiting...');
        await this.sleep(waitMs);
        return this.sendNotification(microsoftId, cardPayload, attempt + 1);
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, 'Teams Webhook Error');
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      // Power Automate HTTP trigger usually returns 202 Accepted or 200 OK
      // If we configured it to return a flow run ID, we could capture it.
      // For now, we assume success if response is OK.
      const responseText = await response.text();
      let messageId = `flow-${Date.now()}`; // fallback

      try {
        if (responseText) {
          const json = JSON.parse(responseText);
          if (json.messageId) messageId = json.messageId;
        }
      } catch {
        // Response was not JSON, ignore
      }

      return { success: true, messageId };
    } catch (error: unknown) {
      if (attempt < this.MAX_RETRIES) {
        const waitMs = attempt * 2000;
        logger.warn(
          { microsoftId, error: (error as Error).message },
          'Network error sending to Teams, retrying...'
        );
        await this.sleep(waitMs);
        return this.sendNotification(microsoftId, cardPayload, attempt + 1);
      }

      logger.error({ error, microsoftId }, 'Failed to send Teams notification');
      return { success: false, error: (error as Error).message };
    }
  }
}
