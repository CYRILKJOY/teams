import { supabase } from '../supabase.js';
import { Notification } from '../../types/database.js';
import { logger } from '../../utils/logger.js';

export class NotificationRepository {
  static async createNotification(
    data: Omit<Notification, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        ...data,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) throw error;
    return notification;
  }

  static async updateState(
    id: string,
    state: Notification['delivery_state']
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        delivery_state: state,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<Notification | null> {
    const { data, error } = await supabase.from('notifications').select('*').eq('id', id).single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  }

  static async hasNotificationForDate(
    employeeId: string,
    type: Notification['type'],
    dateStr: string,
    timezone: string
  ): Promise<boolean> {
    // Because Supabase / PostgREST doesn't directly support timezone-aware casting on the created_at column
    // in a simple .eq() query easily, we will fetch the notifications for this employee + type
    // created in the last 24-48 hours and check manually in JS (which is fast enough for this scale).
    // An alternative is using a Supabase RPC function.
    const { data, error } = await supabase
      .from('notifications')
      .select('created_at')
      .eq('employee_id', employeeId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    if (!data || data.length === 0) return false;

    // We must lazily import date-fns-tz inside the method if needed, or rely on caller,
    // but better to just use standard JS since dateStr is 'YYYY-MM-DD'
    for (const record of data) {
      // Use standard JS Intl to get the date string in the target timezone
      const recordDate = new Date(record.created_at);
      const recordDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(recordDate);

      if (recordDateStr === dateStr) {
        return true;
      }
    }

    return false;
  }

  static async getFailedForRetry(maxAttempts: number = 3): Promise<Notification[]> {
    // Select notifications that are FAILED and have < maxAttempts deliveries
    const { data, error } = await supabase
      .from('notifications')
      .select('*, notification_deliveries(count)')
      .eq('delivery_state', 'FAILED');

    if (error) {
      logger.error({ error }, 'Failed to fetch notifications for retry');
      return [];
    }

    // Filter in JS since Supabase RPC/complex joins might be harder here
    return (data as Record<string, unknown>[]).filter((n) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attempts = (n.notification_deliveries as any)?.[0]?.count || 0;
      return attempts < maxAttempts;
    }) as unknown as Notification[];
  }

  static async expireOlderThan(hours: number): Promise<number> {
    const threshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('notifications')
      .update({ delivery_state: 'EXPIRED', updated_at: new Date().toISOString() })
      .in('delivery_state', ['PENDING', 'SENT', 'FAILED'])
      .lt('created_at', threshold)
      .select('id');

    if (error) {
      logger.error({ error }, 'Failed to expire old notifications');
      return 0;
    }

    return data?.length || 0;
  }
}
