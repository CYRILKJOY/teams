import { supabase } from '../supabase.js';
import { IntegrationEvent } from '../../types/database.js';

export class IntegrationEventRepository {
  /**
   * Attempts to insert a new integration event.
   * If the idempotency_key already exists, it will fail (return null or throw based on config).
   * This is used to ensure we only process a webhook exactly once.
   */
  static async registerEvent(
    source: string,
    eventType: string,
    idempotencyKey: string,
    payload: Record<string, unknown>
  ): Promise<IntegrationEvent | null> {
    const { data, error } = await supabase
      .from('integration_events')
      .insert({
        source,
        event_type: eventType,
        idempotency_key: idempotencyKey,
        payload
      })
      .select('*')
      .single();

    if (error) {
      // If it's a unique constraint violation on idempotency_key, return null instead of throwing
      if (error.code === '23505') {
        return null;
      }
      throw error;
    }
    return data;
  }

  static async markProcessed(id: string): Promise<void> {
    const { error } = await supabase
      .from('integration_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}
